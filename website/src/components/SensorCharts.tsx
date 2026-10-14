import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useDashboardStore } from '../store/dashboardStore';
import type { ChartConfig } from '../types';

const ACCENT_COLORS = [
  '#00d4ff', '#8b5cf6', '#3b82f6', '#ec4899', '#22c55e', '#f59e0b',
  '#06b6d4', '#a78bfa', '#60a5fa',
];

/** Automatically group sensors into chart configs */
function buildChartConfigs(sensorKeys: string[]): ChartConfig[] {
  const configs: ChartConfig[] = [];
  const used = new Set<string>();

  // 1. Heart Rate (MAX30100)
  if (sensorKeys.includes('Heart_Rate')) {
    configs.push({
      title: 'Heart Rate (MAX30100)',
      sensorKeys: ['Heart_Rate'],
      colors: ['#f43f5e'],
      unit: 'BPM',
      yDomain: [50, 120],
    });
    used.add('Heart_Rate');
  }

  // 2. Blood Oxygen Saturation (MAX30100)
  if (sensorKeys.includes('SpO2')) {
    configs.push({
      title: 'Blood Oxygen SpO₂ (MAX30100)',
      sensorKeys: ['SpO2'],
      colors: ['#06b6d4'],
      unit: '%',
      yDomain: [88, 100],
    });
    used.add('SpO2');
  }

  // 3. Edge Impulse Class Predictions
  const predKeys = sensorKeys.filter((k) => k.startsWith('Pred_'));
  if (predKeys.length > 0) {
    configs.push({
      title: 'ML Prediction Probabilities (%)',
      sensorKeys: predKeys,
      colors: predKeys.map((k) => {
        const lower = k.toLowerCase();
        if (lower.includes('fan_on')) return '#10b981';
        if (lower.includes('fan_off') || lower.includes('stop')) return '#ef4444';
        if (lower.includes('noise')) return '#06b6d4';
        return '#8b5cf6';
      }),
      unit: '%',
      yDomain: [0, 100],
    });
    predKeys.forEach((k) => used.add(k));
  }

  // 4. Audio & Microphone Levels (INMP441)
  const audioKeys = sensorKeys.filter((k) => k.startsWith('AUDIO_') || k.startsWith('MIC_') || k.startsWith('SOUND_'));
  if (audioKeys.length > 0) {
    configs.push({
      title: 'INMP441 Microphone Audio Signal',
      sensorKeys: audioKeys,
      colors: ['#00d4ff', '#8b5cf6', '#10b981'],
      unit: '%',
    });
    audioKeys.forEach((k) => used.add(k));
  }

  // 5. MPU-6500 Accelerometer Group
  const accelKeys = sensorKeys.filter((k) => k.startsWith('ACCEL_'));
  if (accelKeys.length > 0) {
    configs.push({
      title: 'MPU-6500 Accelerometer (m/s²)',
      sensorKeys: accelKeys,
      colors: ['#00d4ff', '#8b5cf6', '#10b981'],
    });
    accelKeys.forEach((k) => used.add(k));
  }

  // 6. Gyroscope Group
  const gyroKeys = sensorKeys.filter((k) => k.startsWith('GYRO_'));
  if (gyroKeys.length > 0) {
    configs.push({
      title: 'Gyroscope (°/s)',
      sensorKeys: gyroKeys,
      colors: ['#f59e0b', '#ec4899', '#3b82f6'],
    });
    gyroKeys.forEach((k) => used.add(k));
  }

  // 6. Remaining ungrouped sensors
  for (const key of sensorKeys) {
    if (!used.has(key)) {
      configs.push({
        title: key.replace(/_/g, ' '),
        sensorKeys: [key],
        colors: [ACCENT_COLORS[configs.length % ACCENT_COLORS.length]],
      });
    }
  }

  return configs;
}

export default function SensorCharts() {
  const sensorHistory = useDashboardStore((s) => s.sensorHistory);
  const connectionStatus = useDashboardStore((s) => s.connectionStatus);

  const sensorKeys = Object.keys(sensorHistory);
  const chartConfigs = useMemo(() => buildChartConfigs(sensorKeys), [sensorKeys.join(',')]);

  if (chartConfigs.length === 0) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold text-zinc-300 mb-3">📊 Sensor Analytics</h3>
        <div className="flex items-center justify-center h-40 text-zinc-600 text-sm">
          {connectionStatus === 'connected'
            ? 'Waiting for sensor data…'
            : 'Connect your wristband to see live charts'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
        📊 Live Sensor Analytics
        <span className="text-[10px] font-normal text-zinc-600">
          ({sensorKeys.length} sensor{sensorKeys.length !== 1 ? 's' : ''})
        </span>
      </h3>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {chartConfigs.map((config) => (
          <SensorChart key={config.title} config={config} sensorHistory={sensorHistory} />
        ))}
      </div>
    </div>
  );
}

function SensorChart({
  config,
  sensorHistory,
}: {
  config: ChartConfig;
  sensorHistory: Record<string, { timestamp: number; value: number }[]>;
}) {
  // Merge all sensor keys into a single time-series dataset
  const data = useMemo(() => {
    const timeMap = new Map<number, Record<string, number>>();
    for (const key of config.sensorKeys) {
      for (const reading of sensorHistory[key] || []) {
        if (!timeMap.has(reading.timestamp)) {
          timeMap.set(reading.timestamp, {});
        }
        timeMap.get(reading.timestamp)![key] = reading.value;
      }
    }
    return Array.from(timeMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([ts, vals]) => ({
        time: ts,
        timeLabel: new Date(ts).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        ...vals,
      }));
  }, [config.sensorKeys, sensorHistory]);

  return (
    <div className="glass-card p-4">
      <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
        {config.title}
      </h4>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="timeLabel"
              tick={{ fontSize: 10, fill: '#52525b' }}
              interval="preserveStartEnd"
              minTickGap={40}
            />
            <YAxis tick={{ fontSize: 10, fill: '#52525b' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(15, 15, 26, 0.95)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '10px',
                fontSize: '11px',
                color: '#e4e4e7',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}
              labelStyle={{ color: '#71717a', marginBottom: 4 }}
            />
            {config.sensorKeys.length > 1 && (
              <Legend
                iconType="circle"
                iconSize={6}
                wrapperStyle={{ fontSize: '10px', color: '#71717a', paddingTop: 8 }}
                formatter={(value: string) => value.replace(/_/g, ' ')}
              />
            )}
            {config.sensorKeys.map((key, i) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={config.colors[i]}
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 3, strokeWidth: 0, fill: config.colors[i] }}
                isAnimationActive={false}
                name={key.split('_').pop() || key}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
