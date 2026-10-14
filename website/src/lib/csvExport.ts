/**
 * CSV Export — Exports session data to downloadable CSV files.
 */

import type { DeviceEvent, SensorReading, SerialMessage } from '../types';

export function exportMessagesToCsv(messages: SerialMessage[]): void {
  const header = 'Timestamp,RawLine,Parsed\n';
  const rows = messages.map(m =>
    `${new Date(m.timestamp).toISOString()},"${m.raw.replace(/"/g, '""')}",${m.parsed}`
  ).join('\n');
  downloadCSV(header + rows, `tinygest-serial-${Date.now()}.csv`);
}

export function exportEventsCSV(events: DeviceEvent[]): void {
  const header = 'Timestamp,Type,Label,Raw\n';
  const rows = events.map(e =>
    `${new Date(e.timestamp).toISOString()},${e.type},"${e.label.replace(/"/g, '""')}","${e.raw.replace(/"/g, '""')}"`
  ).join('\n');
  downloadCSV(header + rows, `tinygest-events-${Date.now()}.csv`);
}

export function exportSensorCSV(history: Record<string, SensorReading[]>): void {
  const sensorNames = Object.keys(history);
  if (sensorNames.length === 0) return;

  const header = `Timestamp,${sensorNames.join(',')}\n`;

  // Gather all unique timestamps
  const timeMap = new Map<number, Record<string, number>>();
  for (const name of sensorNames) {
    for (const reading of history[name]) {
      if (!timeMap.has(reading.timestamp)) {
        timeMap.set(reading.timestamp, {});
      }
      timeMap.get(reading.timestamp)![name] = reading.value;
    }
  }

  const sortedTimes = Array.from(timeMap.keys()).sort((a, b) => a - b);
  const rows = sortedTimes.map(t => {
    const vals = timeMap.get(t)!;
    const cells = sensorNames.map(n => vals[n]?.toString() ?? '');
    return `${new Date(t).toISOString()},${cells.join(',')}`;
  }).join('\n');

  downloadCSV(header + rows, `tinygest-sensors-${Date.now()}.csv`);
}

function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
