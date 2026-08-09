'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AuthUser = {
  id: number;
  name: string;
  email: string | null;
  role: 'admin' | 'inspector' | 'viewer' | 'vendor_contact';
};

type AuthState = {
  user: AuthUser | null;
  access_token: string | null;
  refresh_token: string | null;
  setSession: (payload: { user: AuthUser; access_token: string; refresh_token: string }) => void;
  clear: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      access_token: null,
      refresh_token: null,
      setSession: ({ user, access_token, refresh_token }) => set({ user, access_token, refresh_token }),
      clear: () => set({ user: null, access_token: null, refresh_token: null }),
    }),
    { name: 'manako-auth' },
  ),
);
