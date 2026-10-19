import React, { useEffect, useRef, useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, ArrowRight, AlertCircle, CheckCircle2, MailCheck } from 'lucide-react';
import { authService } from '../lib/authService';
import { OTP_LENGTH, OTP_RESEND_COOLDOWN_MS, getResendWaitSeconds } from '../lib/otpService';

type Step = 'email' | 'otp' | 'password' | 'done';

interface Props {
  initialEmail?: string;
  /** Back to the sign-in form. Receives the email so it can be prefilled. */
  onBack: (email?: string) => void;
}

const inputCls =
  'w-full bg-surface-800 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-accent-cyan/60 transition-colors';

export default function ForgotPassword({ initialEmail = '', onBack }: Props) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState(initialEmail);
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [wait, setWait] = useState(0);
  const boxes = useRef<Array<HTMLInputElement | null>>([]);

  // Resend countdown
  useEffect(() => {
    if (step !== 'otp') return;
    setWait(getResendWaitSeconds(email) || Math.ceil(OTP_RESEND_COOLDOWN_MS / 1000));
    const t = setInterval(() => setWait(getResendWaitSeconds(email)), 1000);
    return () => clearInterval(t);
  }, [step, email]);

  const sendOtp = async (): Promise<boolean> => {
    setBusy(true);
    setError(null);
    const res = await authService.requestPasswordReset(email);
    setBusy(false);
    if (!res.success) {
      setError(res.error || 'Could not send code.');
      return false;
    }
    setDevOtp(res.devOtp ?? null);
    setDigits(Array(OTP_LENGTH).fill(''));
    return true;
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await sendOtp()) {
      setStep('otp');
      setTimeout(() => boxes.current[0]?.focus(), 50);
    }
  };

  const handleResend = async () => {
    if (wait > 0 || busy) return;
    if (await sendOtp()) {
      setWait(getResendWaitSeconds(email));
      boxes.current[0]?.focus();
    }
  };

  const setDigit = (i: number, v: string) => {
    const clean = v.replace(/\D/g, '');
    if (!clean) {
      setDigits((d) => d.map((x, idx) => (idx === i ? '' : x)));
      return;
    }
    // Typing or pasting several digits fills the following boxes
    setDigits((d) => {
      const next = [...d];
      clean
        .slice(0, OTP_LENGTH - i)
        .split('')
        .forEach((ch, k) => (next[i + k] = ch));
      return next;
    });
    const focusIdx = Math.min(i + clean.length, OTP_LENGTH - 1);
    boxes.current[focusIdx]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) boxes.current[i - 1]?.focus();
    if (e.key === 'ArrowLeft' && i > 0) boxes.current[i - 1]?.focus();
    if (e.key === 'ArrowRight' && i < OTP_LENGTH - 1) boxes.current[i + 1]?.focus();
  };

  const handleOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = digits.join('');
    if (code.length !== OTP_LENGTH) {
      setError(`Enter the ${OTP_LENGTH}-digit code.`);
      return;
    }
    setBusy(true);
    setError(null);
    const res = await authService.verifyResetOtp(email, code);
    setBusy(false);
    if (!res.success) {
      setError(res.error || 'Invalid code.');
      setDigits(Array(OTP_LENGTH).fill(''));
      boxes.current[0]?.focus();
      return;
    }
    setStep('password');
  };

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    setError(null);
    const res = await authService.resetPassword(email, password);
    setBusy(false);
    if (!res.success) {
      setError(res.error || 'Could not reset password.');
      return;
    }
    setStep('done');
  };

  const title: Record<Step, string> = {
    email: 'Forgot password?',
    otp: 'Enter verification code',
    password: 'Set a new password',
    done: 'Password updated',
  };
  const subtitle: Record<Step, string> = {
    email: "Enter your account email and we'll send you a 6-digit code.",
    otp: `If an account exists for ${email}, a code was sent. It expires in 5 minutes.`,
    password: 'Choose a new password for your account.',
    done: 'You can now sign in with your new password.',
  };

  const submitBtn = (label: string) => (
    <button
      type="submit"
      disabled={busy}
      className="w-full btn-primary flex items-center justify-center gap-2 py-2.5 mt-2 cursor-pointer disabled:opacity-50 text-xs font-semibold tracking-wide uppercase shadow-[0_0_20px_rgba(0,212,255,0.25)]"
    >
      {busy ? (
        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : (
        <>
          <span>{label}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </>
      )}
    </button>
  );

  return (
    <div>
      {step !== 'done' && (
        <button
          type="button"
          onClick={() => onBack(email)}
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white mb-4 cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
        </button>
      )}

      <h2 className="text-lg font-semibold text-white">{title[step]}</h2>
      <p className="text-xs text-zinc-400 mt-1 mb-5 leading-relaxed">{subtitle[step]}</p>

      {error && (
        <div className="mb-5 p-3 rounded-lg bg-red-500/10 border border-red-500/25 flex items-start gap-2.5 text-red-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
          <span className="flex-1 leading-relaxed">{error}</span>
        </div>
      )}

      {step === 'email' && (
        <form onSubmit={handleEmail} className="space-y-4">
          <div>
            <label htmlFor="fp-email" className="block text-xs font-medium text-zinc-300 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="fp-email"
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.name@example.com"
                className={`${inputCls} font-mono text-xs`}
              />
            </div>
          </div>
          {submitBtn('Send verification code')}
        </form>
      )}

      {step === 'otp' && (
        <form onSubmit={handleOtp} className="space-y-4">
          {devOtp && (
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[11px] font-mono">
              DEV MODE (EmailJS not configured): code is <b>{devOtp}</b>
            </div>
          )}
          <div className="flex justify-between gap-2">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => (boxes.current[i] = el)}
                type="text"
                inputMode="numeric"
                autoComplete={i === 0 ? 'one-time-code' : 'off'}
                maxLength={OTP_LENGTH}
                value={d}
                onChange={(e) => setDigit(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onFocus={(e) => e.target.select()}
                aria-label={`Digit ${i + 1}`}
                className="w-full min-w-0 aspect-square max-w-[48px] text-center text-lg font-mono font-semibold bg-surface-800 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent-cyan/60 transition-colors"
              />
            ))}
          </div>
          {submitBtn('Verify code')}
          <div className="text-center text-xs text-zinc-400">
            Didn't get it?{' '}
            <button
              type="button"
              onClick={handleResend}
              disabled={wait > 0 || busy}
              className="text-accent-cyan disabled:text-zinc-600 disabled:cursor-not-allowed cursor-pointer"
            >
              {wait > 0 ? `Resend in ${wait}s` : 'Resend code'}
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setStep('email');
            }}
            className="flex items-center gap-1.5 mx-auto text-[11px] text-zinc-500 hover:text-zinc-300 cursor-pointer"
          >
            <MailCheck className="w-3 h-3" /> Use a different email
          </button>
        </form>
      )}

      {step === 'password' && (
        <form onSubmit={handlePassword} className="space-y-4">
          <div>
            <label htmlFor="fp-pass" className="block text-xs font-medium text-zinc-300 mb-1.5">
              New Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="fp-pass"
                type={showPassword ? 'text' : 'password'}
                required
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className={`${inputCls} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="fp-confirm" className="block text-xs font-medium text-zinc-300 mb-1.5">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="fp-confirm"
                type={showPassword ? 'text' : 'password'}
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat password"
                className={inputCls}
              />
            </div>
          </div>
          {submitBtn('Update password')}
        </form>
      )}

      {step === 'done' && (
        <div className="text-center space-y-4">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" strokeWidth={1.5} />
          <button
            type="button"
            onClick={() => onBack(email)}
            className="w-full btn-primary flex items-center justify-center gap-2 py-2.5 cursor-pointer text-xs font-semibold tracking-wide uppercase"
          >
            <span>Go to sign in</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
