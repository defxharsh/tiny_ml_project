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

/** Automatically configure biometric vitals charts */
function buildChartConfigs(sensorKeys: string[]): ChartConfig[] {
  const configs: ChartConfig[] = [];

  // 1. Heart Rate (MAX30100)
  if (sensorKeys.includes('Heart_Rate')) {
    configs.push({
      title: 'Heart Rate (MAX30100)',
      sensorKeys: ['Heart_Rate'],
      colors: ['#f43f5e'],
      unit: 'BPM',
      yDomain: [50, 120],
    });
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
        <h3 className="text-sm font-semibold text-zinc-300 mb-3">📊 Biometric Vitals Analytics</h3>
        <div className="flex items-center justify-center h-40 text-zinc-600 text-sm">
          {connectionStatus === 'connected'
            ? 'Waiting for MAX30100 vitals data…'
            : 'Connect your wristband or start demo mode to see live vitals charts'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
        📊 Biometric Vitals Analytics
        <span className="text-[10px] font-normal text-zinc-500">
          (MAX30100 Pulse Oximeter)
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
            <YAxis
              tick={{ fontSize: 10, fill: '#52525b' }}
              domain={config.yDomain || ['auto', 'auto']}
              unit={config.unit ? ` ${config.unit}` : undefined}
            />
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
              formatter={(value: any) => [`${value}${config.unit ? ` ${config.unit}` : ''}`, config.unit || 'Value']}
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
