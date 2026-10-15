import { User, UserRole, LoginCredentials, SignUpCredentials, AuthSession, AuthResult } from '../types/auth';

const STORAGE_USERS_KEY = 'tinygest_auth_users_v2';
const STORAGE_SESSION_KEY = 'tinygest_auth_session_v1';

interface StoredUserAccount extends User {
  passwordHash: string;
}

// Native Web Crypto SHA-256 password hashing
async function hashPassword(plainText: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plainText.trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Pre-seeded accounts for hardware testing and evaluation
export const DEMO_ACCOUNTS = [
  {
    name: 'Citizen User',
    email: 'citizen@tinygest.io',
    password: 'citizen123',
    role: 'citizen' as UserRole,
  },
  {
    name: 'Hardware Lead',
    email: 'admin@tinygest.io',
    password: 'admin123',
    role: 'admin' as UserRole,
  },
  {
    name: 'Edge AI Researcher',
    email: 'researcher@tinygest.io',
    password: 'tinyml2026',
    role: 'researcher' as UserRole,
  },
  {
    name: 'Device Operator',
    email: 'operator@tinygest.io',
    password: 'operator123',
    role: 'operator' as UserRole,
  },
];

class AuthService {
  private initialized = false;

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    try {
      const existing = localStorage.getItem(STORAGE_USERS_KEY);
      if (!existing) {
        const seedUsers: StoredUserAccount[] = [];
        for (const demo of DEMO_ACCOUNTS) {
          const passwordHash = await hashPassword(demo.password);
          seedUsers.push({
            id: `usr-${demo.role}-${Date.now().toString(36)}`,
            name: demo.name,
            email: demo.email.toLowerCase(),
            role: demo.role,
            createdAt: Date.now(),
            lastLogin: Date.now(),
            passwordHash,
          });
        }
        localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(seedUsers));
      }
      this.initialized = true;
    } catch {
      // LocalStorage access fallback (in case cookies/storage restricted)
      this.initialized = true;
    }
  }

  private getStoredUsers(): StoredUserAccount[] {
    try {
      const raw = localStorage.getItem(STORAGE_USERS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private saveStoredUsers(users: StoredUserAccount[]): void {
    try {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
    } catch {
      // Ignore
    }
  }

  public getSession(): AuthSession | null {
    try {
      const raw = localStorage.getItem(STORAGE_SESSION_KEY) || sessionStorage.getItem(STORAGE_SESSION_KEY);
      if (!raw) return null;
      const session: AuthSession = JSON.parse(raw);
      if (session.expiresAt && Date.now() > session.expiresAt) {
        this.logout();
        return null;
      }
      return session;
    } catch {
      return null;
    }
  }

  private saveSession(session: AuthSession, remember: boolean): void {
    try {
      const serialized = JSON.stringify(session);
      if (remember) {
        localStorage.setItem(STORAGE_SESSION_KEY, serialized);
        sessionStorage.removeItem(STORAGE_SESSION_KEY);
      } else {
        sessionStorage.setItem(STORAGE_SESSION_KEY, serialized);
        localStorage.removeItem(STORAGE_SESSION_KEY);
      }
    } catch {
      // Ignore
    }
  }

  public async login(credentials: LoginCredentials): Promise<AuthResult> {
    await this.ensureInitialized();
    const email = credentials.email.trim().toLowerCase();
    const password = credentials.password.trim();

    if (!email || !password) {
      return { success: false, error: 'Please enter both email and password.' };
    }

    const users = this.getStoredUsers();
    const user = users.find((u) => u.email === email);

    if (!user) {
      return { success: false, error: 'No account found with this email address.' };
    }

    const inputHash = await hashPassword(password);
    if (user.passwordHash !== inputHash) {
      return { success: false, error: 'Incorrect password. Please try again.' };
    }

    // Update lastLogin
    user.lastLogin = Date.now();
    this.saveStoredUsers(users);

    const safeUser: User = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
    };

    const session: AuthSession = {
      user: safeUser,
      token: `tgt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    };

    this.saveSession(session, credentials.rememberMe ?? true);
    return { success: true, user: safeUser };
  }

  public async signup(credentials: SignUpCredentials): Promise<AuthResult> {
    await this.ensureInitialized();
    const name = credentials.name.trim();
    const email = credentials.email.trim().toLowerCase();
    const password = credentials.password.trim();
    const role: UserRole = credentials.role || 'citizen';

    if (!name || name.length < 2) {
      return { success: false, error: 'Full name must be at least 2 characters.' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return { success: false, error: 'Please provide a valid email address.' };
    }

    if (!password || password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    const users = this.getStoredUsers();
    if (users.some((u) => u.email === email)) {
      return { success: false, error: 'An account with this email already exists.' };
    }

    const passwordHash = await hashPassword(password);
    const newUser: StoredUserAccount = {
      id: `usr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      email,
      role,
      createdAt: Date.now(),
      lastLogin: Date.now(),
      passwordHash,
    };

    users.push(newUser);
    this.saveStoredUsers(users);

    const safeUser: User = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      createdAt: newUser.createdAt,
      lastLogin: newUser.lastLogin,
    };

    const session: AuthSession = {
      user: safeUser,
      token: `tgt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    };

    this.saveSession(session, true);
    return { success: true, user: safeUser };
  }

  public logout(): void {
    try {
      localStorage.removeItem(STORAGE_SESSION_KEY);
      sessionStorage.removeItem(STORAGE_SESSION_KEY);
    } catch {
      // Ignore
    }
  }

  public async quickDemoLogin(role: UserRole = 'citizen'): Promise<AuthResult> {
    const demo = DEMO_ACCOUNTS.find((d) => d.role === role) || DEMO_ACCOUNTS[0];
    return this.login({
      email: demo.email,
      password: demo.password,
      rememberMe: true,
    });
  }
}

export const authService = new AuthService();
