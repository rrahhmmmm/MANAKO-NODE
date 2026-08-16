'use client';

import { create } from 'zustand';

export type AuthUser = {
  id: number;
  name: string;
  email: string | null;
  role: 'admin' | 'inspector' | 'viewer' | 'vendor_contact';
};

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

type AuthState = {
  user: AuthUser | null;
  access_token: string | null;
  status: AuthStatus;
  setSession: (payload: { user: AuthUser; access_token: string }) => void;
  setStatus: (status: AuthStatus) => void;
  clear: () => void;
};

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  access_token: null,
  status: 'idle',
  setSession: ({ user, access_token }) => set({ user, access_token, status: 'authenticated' }),
  setStatus: (status) => set({ status }),
  clear: () => set({ user: null, access_token: null, status: 'unauthenticated' }),
}));
