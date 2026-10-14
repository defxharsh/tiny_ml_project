import { useRef, useEffect } from 'react';
import Navbar from './components/Navbar';
import ConnectModal from './components/ConnectModal';
import SettingsPanel from './components/SettingsPanel';
import DeviceHero from './components/DeviceHero';
import FanRelayCard from './components/FanRelayCard';
import VitalsPanel from './components/VitalsPanel';
import SensorCharts from './components/SensorCharts';
import VoicePanel from './components/VoicePanel';
import GesturePanel from './components/GesturePanel';
import EventTimeline from './components/EventTimeline';
import SerialConsole from './components/SerialConsole';
import StatsPanel from './components/StatsPanel';
import { SerialManager } from './lib/serialManager';
import { stopDemo } from './lib/demoMode';
import { useDashboardStore } from './store/dashboardStore';

export default function App() {
  const serialManagerRef = useRef<SerialManager | null>(null);
  const demoMode = useDashboardStore((s) => s.demoMode);
  const mode = useDashboardStore((s) => s.mode);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      serialManagerRef.current?.disconnect();
      if (demoMode) stopDemo();
    };
  }, []);

  return (
    <div className="min-h-screen bg-surface-900 bg-grid">
      {/* Ambient gradient blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full opacity-[0.03]"
          style={{ background: 'radial-gradient(circle, #00d4ff, transparent 70%)' }} />
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full opacity-[0.02]"
          style={{ background: 'radial-gradient(circle, #8b5cf6, transparent 70%)' }} />
      </div>

      {/* Nav */}
      <Navbar />

      {/* Modals */}
      <ConnectModal serialManager={serialManagerRef} />
      <SettingsPanel />

      {/* Main content */}
      <main className="relative max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-5 fade-stagger">
        {/* Hero */}
        <DeviceHero />

        {/* Hardware Modules: Relay Fan Controller & MAX30100 Biometric Vitals */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <FanRelayCard />
          <VitalsPanel />
        </div>

        {/* Voice / Gesture ML + Event Timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {mode === 'gesture' ? <GesturePanel /> : <VoicePanel />}
          <EventTimeline />
        </div>

        {/* Sensor Charts + Session Statistics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <SensorCharts />
          </div>
          <div>
            <StatsPanel />
          </div>
        </div>

        {/* Raw Serial Console */}
        <SerialConsole />

        {/* Footer */}
        <footer className="text-center py-4 text-[10px] text-zinc-700">
          TinyGest Dashboard • Custom ESP32 Firmware Monitor & Edge Impulse Inferencing
        </footer>
      </main>
    </div>
  );
}
