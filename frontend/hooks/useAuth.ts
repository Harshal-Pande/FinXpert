'use client';

import { useState, useCallback } from 'react';
import { login as apiLogin, LoginPayload } from '@/lib/api/auth';

export function useAuth() {
  const [token, setToken] = useState<string | null>(
    typeof window !== 'undefined' ? localStorage.getItem('token') : null
  );

  const login = useCallback(async (payload: LoginPayload) => {
    const res = await apiLogin(payload);
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', res.access_token);
    }
    setToken(res.access_token);
    return res;
  }, []);

  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
    setToken(null);
  }, []);

  return { token, isAuthenticated: !!token, login, logout };
}
