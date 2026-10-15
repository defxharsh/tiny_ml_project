export type UserRole = 'citizen' | 'admin' | 'researcher' | 'operator';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: number;
  lastLogin: number;
}

export interface AuthSession {
  user: User;
  token: string;
  expiresAt: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface SignUpCredentials {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
}
