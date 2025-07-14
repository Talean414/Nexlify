import { useState } from 'react';
import { signup, login, verify2FA, requestPasswordReset } from '../../services/auth';

export const useAuth = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signup = async (id: string, email: string, password: string, role: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await signup(id, email, password, role);
      if (!response.success) {
        throw new Error(response.errorCode || 'Signup failed');
      }
      setLoading(false);
      return response.data;
    } catch (err: any) {
      setLoading(false);
      setError(err.message);
      throw err;
    }
  };

  const login = async (email: string, password: string, deviceInfo: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await login(email, password, deviceInfo);
      if (!response.success) {
        throw new Error(response.errorCode || 'Login failed');
      }
      setLoading(false);
      return response.data;
    } catch (err: any) {
      setLoading(false);
      setError(err.message);
      throw err;
    }
  };

  const verify2FA = async (userId: string, code: string, tempToken: string, deviceInfo: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await verify2FA(userId, code, tempToken, deviceInfo);
      if (!response.success) {
        throw new Error(response.errorCode || '2FA verification failed');
      }
      setLoading(false);
      return response.data;
    } catch (err: any) {
      setLoading(false);
      setError(err.message);
      throw err;
    }
  };

  const requestPasswordReset = async (email: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await requestPasswordReset(email);
      if (!response.success) {
        throw new Error(response.errorCode || 'Password reset request failed');
      }
      setLoading(false);
      return response;
    } catch (err: any) {
      setLoading(false);
      setError(err.message);
      throw err;
    }
  };

  return { signup, login, verify2FA, requestPasswordReset, loading, error };
};