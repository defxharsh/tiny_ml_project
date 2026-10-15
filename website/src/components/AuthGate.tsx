import React, { useState } from 'react';
import {
  Watch,
  Lock,
  Mail,
  User as UserIcon,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  Cpu,
  KeyRound,
  UserCheck,
  Sparkles,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { UserRole } from '../types/auth';

export default function AuthGate() {
  // Start on Register (signup) as requested
  const [tab, setTab] = useState<'login' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('citizen');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const { login, signup, isLoading, error, clearError } = useAuthStore();

  const handleTabChange = (newTab: 'login' | 'signup') => {
    clearError();
    setTab(newTab);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tab === 'login') {
      await login({ email, password, rememberMe });
    } else {
      await signup({ name, email, password, role });
    }
  };

  // Fills the inputs without auto-submitting, so user can see and click themselves
  const handleAutofillDemo = (demoEmail: string, demoPass: string) => {
    clearError();
    setTab('login');
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="min-h-screen bg-surface-900 bg-grid flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient gradient backdrops */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full opacity-[0.08]"
          style={{ background: 'radial-gradient(circle, #00d4ff, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-32 -right-32 w-[700px] h-[700px] rounded-full opacity-[0.06]"
          style={{ background: 'radial-gradient(circle, #8b5cf6, transparent 70%)' }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full opacity-[0.02]"
          style={{ background: 'radial-gradient(circle, #3b82f6, transparent 70%)' }}
        />
      </div>

      {/* Main Auth Container */}
      <div className="w-full max-w-md relative z-10 fade-in">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-2xl mb-4 relative">
            <div className="relative">
              <Watch className="w-9 h-9 text-accent-cyan" strokeWidth={1.5} />
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-accent-violet animate-pulse" />
            </div>
            <div className="absolute inset-0 rounded-2xl glow-ring-cyan pointer-events-none" />
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            Tiny<span className="text-accent-cyan">Gest</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-accent-cyan/10 border border-accent-cyan/30 text-accent-cyan font-mono font-normal">
              v1.0 ESP32
            </span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1.5 max-w-xs mx-auto">
            Smart Wristband Health Telemetry & Assistive Control Access
          </p>
        </div>

        {/* Card */}
        <div className="glass-card-elevated border border-white/[0.08] p-6 sm:p-8 relative">
          {/* Hardware Security Pill */}
          <div className="flex items-center justify-between pb-5 mb-5 border-b border-white/[0.06] text-xs">
            <div className="flex items-center gap-2 text-zinc-400">
              <Cpu className="w-4 h-4 text-accent-cyan" />
              <span className="font-mono text-[11px]">Wristband Access Gate</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Protected</span>
            </div>
          </div>

          {/* Tab Selector — Starts on Register */}
          <div className="flex rounded-lg bg-surface-800/80 p-1 border border-white/[0.06] mb-6">
            <button
              type="button"
              onClick={() => handleTabChange('signup')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                tab === 'signup'
                  ? 'bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30 shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              1. Register Account
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('login')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                tab === 'login'
                  ? 'bg-accent-violet/15 text-accent-violet border border-accent-violet/30 shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              2. Sign In
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-500/10 border border-red-500/25 flex items-start gap-2.5 text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <span className="flex-1 leading-relaxed">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === 'signup' && (
              <div>
                <label htmlFor="reg-name" className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="reg-name"
                    name="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Harsh Rai"
                    className="w-full bg-surface-800 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-accent-cyan/60 transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="auth-email" className="block text-xs font-medium text-zinc-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="auth-email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={tab === 'signup' ? 'your.name@example.com' : 'citizen@tinygest.io'}
                  className="w-full bg-surface-800 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-accent-cyan/60 transition-colors font-mono text-xs"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="auth-password" className="block text-xs font-medium text-zinc-300">
                  Password
                </label>
                {tab === 'login' && (
                  <span className="text-[11px] text-zinc-500 font-mono">
                    Demo: <span className="text-accent-cyan">citizen123</span>
                  </span>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="auth-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-surface-800 border border-white/10 rounded-lg pl-9 pr-10 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-accent-cyan/60 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {tab === 'signup' && (
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Account Role
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {[
                    { id: 'citizen' as UserRole, label: 'Citizen', desc: 'Patient / User' },
                    { id: 'operator' as UserRole, label: 'Operator', desc: 'Hardware' },
                    { id: 'admin' as UserRole, label: 'Admin', desc: 'Full Access' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setRole(item.id)}
                      className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                        role === item.id
                          ? 'border-accent-cyan/60 bg-accent-cyan/10 text-accent-cyan font-semibold shadow-sm'
                          : 'border-white/10 bg-surface-800/50 text-zinc-400 hover:border-white/20'
                      }`}
                    >
                      <div className="font-semibold">{item.label}</div>
                      <div className="text-[10px] text-zinc-500 opacity-80">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {tab === 'login' && (
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-zinc-400 hover:text-zinc-200">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-zinc-700 bg-surface-800 text-accent-cyan focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                  <span>Remember session for 7 days</span>
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary flex items-center justify-center gap-2 py-2.5 mt-2 cursor-pointer disabled:opacity-50 text-xs font-semibold tracking-wide uppercase shadow-[0_0_20px_rgba(0,212,255,0.25)]"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>
                    {tab === 'signup'
                      ? `Register as ${role.toUpperCase()} & Enter`
                      : 'Login to Dashboard'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Demo Credentials Card (Displays info clearly, fills form without auto-submitting) */}
          <div className="mt-6 pt-5 border-t border-white/[0.06]">
            <div className="flex items-center justify-between mb-2 text-xs">
              <span className="text-zinc-400 font-medium flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-accent-cyan" />
                Demo Credentials (Click to fill form)
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">Pre-seeded</span>
            </div>

            <div className="space-y-2 text-xs">
              {/* Citizen Demo Card */}
              <div className="flex items-center justify-between p-2.5 rounded-lg border border-white/[0.08] bg-surface-800/60 hover:border-accent-cyan/40 transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-accent-cyan/15 border border-accent-cyan/30 flex items-center justify-center text-accent-cyan font-bold text-xs">
                    C
                  </div>
                  <div className="text-left min-w-0">
                    <div className="font-semibold text-zinc-200 flex items-center gap-1.5">
                      Citizen User
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-accent-cyan/10 text-accent-cyan font-mono">
                        citizen
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-zinc-400 truncate">
                      citizen@tinygest.io • pass: citizen123
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleAutofillDemo('citizen@tinygest.io', 'citizen123')}
                  className="px-2.5 py-1 text-[11px] rounded bg-white/[0.05] hover:bg-accent-cyan/20 border border-white/10 hover:border-accent-cyan/30 text-zinc-300 hover:text-accent-cyan font-mono transition-all cursor-pointer shrink-0"
                  title="Fills email and password into the Sign In tab"
                >
                  Use This
                </button>
              </div>

              {/* Admin Demo Card */}
              <div className="flex items-center justify-between p-2.5 rounded-lg border border-white/[0.08] bg-surface-800/60 hover:border-accent-violet/40 transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-accent-violet/15 border border-accent-violet/30 flex items-center justify-center text-accent-violet font-bold text-xs">
                    A
                  </div>
                  <div className="text-left min-w-0">
                    <div className="font-semibold text-zinc-200 flex items-center gap-1.5">
                      Hardware Lead
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-accent-violet/10 text-accent-violet font-mono">
                        admin
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-zinc-400 truncate">
                      admin@tinygest.io • pass: admin123
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleAutofillDemo('admin@tinygest.io', 'admin123')}
                  className="px-2.5 py-1 text-[11px] rounded bg-white/[0.05] hover:bg-accent-violet/20 border border-white/10 hover:border-accent-violet/30 text-zinc-300 hover:text-accent-violet font-mono transition-all cursor-pointer shrink-0"
                  title="Fills email and password into the Sign In tab"
                >
                  Use This
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center mt-6 text-[11px] text-zinc-600 font-mono">
          TinyGest ESP32 Hardware Console • Web Serial API Ready
        </div>
      </div>
    </div>
  );
}
