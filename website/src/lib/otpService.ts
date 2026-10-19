/**
 * OTP service for password reset.
 *
 * Sends a 6-digit code through the EmailJS REST API (no backend needed).
 * Only a SHA-256 hash of the OTP is stored locally, never the plain code.
 *
 * NOTE: this app has no server, so OTP generation and verification both
 * happen in the browser. That is fine for a demo / college project, but it is
 * not real security. For production move requestOtp / verifyOtp to a backend.
 */

const OTP_KEY = 'tinygest_reset_otp_v1';

export const OTP_LENGTH = 6;
export const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
export const OTP_RESEND_COOLDOWN_MS = 30 * 1000; // 30 seconds
export const OTP_MAX_ATTEMPTS = 5;

interface OtpRecord {
  email: string;
  hash: string;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
  verified: boolean;
}

export interface OtpSendResult {
  success: boolean;
  error?: string;
  /** Only set in dev builds when EmailJS is not configured. */
  devOtp?: string;
}

export interface OtpVerifyResult {
  success: boolean;
  error?: string;
}

const env = import.meta.env;
const EMAILJS_SERVICE_ID = env.VITE_EMAILJS_SERVICE_ID as string | undefined;
const EMAILJS_TEMPLATE_ID = env.VITE_EMAILJS_TEMPLATE_ID as string | undefined;
const EMAILJS_PUBLIC_KEY = env.VITE_EMAILJS_PUBLIC_KEY as string | undefined;

export function isEmailConfigured(): boolean {
  return !!(EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_PUBLIC_KEY);
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hashOtp(email: string, otp: string): Promise<string> {
  // Email acts as a salt so identical codes for different users hash differently
  return sha256(`${email}:${otp}`);
}

function generateOtp(): string {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return String(arr[0] % 10 ** OTP_LENGTH).padStart(OTP_LENGTH, '0');
}

function readRecord(): OtpRecord | null {
  try {
    const raw = sessionStorage.getItem(OTP_KEY);
    return raw ? (JSON.parse(raw) as OtpRecord) : null;
  } catch {
    return null;
  }
}

function writeRecord(rec: OtpRecord | null): void {
  try {
    if (rec) sessionStorage.setItem(OTP_KEY, JSON.stringify(rec));
    else sessionStorage.removeItem(OTP_KEY);
  } catch {
    /* storage blocked */
  }
}

/** Seconds left before another OTP may be requested for this email. */
export function getResendWaitSeconds(email: string): number {
  const rec = readRecord();
  if (!rec || rec.email !== email.trim().toLowerCase()) return 0;
  const left = rec.lastSentAt + OTP_RESEND_COOLDOWN_MS - Date.now();
  return left > 0 ? Math.ceil(left / 1000) : 0;
}

async function sendEmail(toEmail: string, toName: string, otp: string): Promise<void> {
  const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: EMAILJS_SERVICE_ID,
      template_id: EMAILJS_TEMPLATE_ID,
      user_id: EMAILJS_PUBLIC_KEY,
      template_params: {
        to_email: toEmail,
        to_name: toName,
        otp,
        expiry_minutes: String(OTP_TTL_MS / 60000),
        app_name: 'TinyGest',
      },
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `EmailJS error ${res.status}`);
  }
}

/**
 * Generates and emails an OTP.
 * `accountName` is null when no account exists for the email. In that case
 * nothing is sent, but we still return success so the UI cannot be used to
 * discover which emails are registered.
 */
export async function requestOtp(email: string, accountName: string | null): Promise<OtpSendResult> {
  const normalized = email.trim().toLowerCase();

  const wait = getResendWaitSeconds(normalized);
  if (wait > 0) {
    return { success: false, error: `Please wait ${wait}s before requesting another code.` };
  }

  if (accountName === null) {
    // Unknown email: behave the same as success, store a dummy record so timing/cooldown match
    writeRecord({
      email: normalized,
      hash: '',
      expiresAt: Date.now() + OTP_TTL_MS,
      attempts: 0,
      lastSentAt: Date.now(),
      verified: false,
    });
    return { success: true };
  }

  const otp = generateOtp();
  const record: OtpRecord = {
    email: normalized,
    hash: await hashOtp(normalized, otp),
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
    lastSentAt: Date.now(),
    verified: false,
  };

  if (!isEmailConfigured()) {
    if (import.meta.env.DEV) {
      writeRecord(record);
      console.info(`[otpService] EmailJS not configured. Dev OTP for ${normalized}: ${otp}`);
      return { success: true, devOtp: otp };
    }
    return { success: false, error: 'Email service is not configured. Contact the administrator.' };
  }

  try {
    await sendEmail(normalized, accountName, otp);
    writeRecord(record);
    return { success: true };
  } catch (err) {
    console.warn('[otpService] send failed:', err);
    return { success: false, error: 'Could not send the email. Please try again in a moment.' };
  }
}

export async function verifyOtp(email: string, code: string): Promise<OtpVerifyResult> {
  const normalized = email.trim().toLowerCase();
  const rec = readRecord();
  const generic = 'Invalid or expired code.';

  if (!rec || rec.email !== normalized) return { success: false, error: generic };

  if (Date.now() > rec.expiresAt) {
    writeRecord(null);
    return { success: false, error: 'This code has expired. Please request a new one.' };
  }

  if (rec.attempts >= OTP_MAX_ATTEMPTS) {
    writeRecord(null);
    return { success: false, error: 'Too many wrong attempts. Please request a new code.' };
  }

  const ok = rec.hash !== '' && (await hashOtp(normalized, code.trim())) === rec.hash;
  if (!ok) {
    rec.attempts += 1;
    writeRecord(rec);
    const left = OTP_MAX_ATTEMPTS - rec.attempts;
    return {
      success: false,
      error: left > 0 ? `${generic} ${left} attempt${left === 1 ? '' : 's'} left.` : 'Too many wrong attempts. Please request a new code.',
    };
  }

  rec.verified = true;
  writeRecord(rec);
  return { success: true };
}

/** True if this email has a verified OTP that has not expired yet. */
export function isOtpVerified(email: string): boolean {
  const rec = readRecord();
  return !!rec && rec.verified && rec.email === email.trim().toLowerCase() && Date.now() <= rec.expiresAt;
}

export function clearOtp(): void {
  writeRecord(null);
}
