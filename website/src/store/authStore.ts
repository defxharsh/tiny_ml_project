import { create } from 'zustand';
import { User, UserRole, LoginCredentials, SignUpCredentials } from '../types/auth';
import { authService } from '../lib/authService';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (credentials: LoginCredentials) => Promise<boolean>;
  signup: (credentials: SignUpCredentials) => Promise<boolean>;
  demoLogin: (role?: UserRole) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}

const initialSession = authService.getSession();

export const useAuthStore = create<AuthState>((set) => ({
  user: initialSession?.user || null,
  isAuthenticated: !!initialSession?.user,
  isLoading: false,
  error: null,

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const result = await authService.login(credentials);
      if (result.success && result.user) {
        set({
          user: result.user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        return true;
      } else {
        set({
          error: result.error || 'Authentication failed',
          isLoading: false,
        });
        return false;
      }
    } catch {
      set({
        error: 'An unexpected authentication error occurred.',
        isLoading: false,
      });
      return false;
    }
  },

  signup: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const result = await authService.signup(credentials);
      if (result.success && result.user) {
        set({
          user: result.user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        return true;
      } else {
        set({
          error: result.error || 'Failed to create account.',
          isLoading: false,
        });
        return false;
      }
    } catch {
      set({
        error: 'An unexpected registration error occurred.',
        isLoading: false,
      });
      return false;
    }
  },

  demoLogin: async (role: UserRole = 'citizen') => {
    set({ isLoading: true, error: null });
    try {
      const result = await authService.quickDemoLogin(role);
      if (result.success && result.user) {
        set({
          user: result.user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        return true;
      } else {
        set({
          error: result.error || 'Failed to authenticate demo account.',
          isLoading: false,
        });
        return false;
      }
    } catch {
      set({
        error: 'An unexpected error occurred while logging in with demo account.',
        isLoading: false,
      });
      return false;
    }
  },

  logout: () => {
    authService.logout();
    set({
      user: null,
      isAuthenticated: false,
      error: null,
    });
  },

  clearError: () => set({ error: null }),
}));
