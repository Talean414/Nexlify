import axios from 'axios';
import { endpoints } from '../../constants/endpoints';

interface SignupResponse {
  success: boolean;
  data?: { id: string; email: string; role: string; email_verified: boolean };
  error?: string;
  errorCode?: string;
}

interface LoginResponse {
  success: boolean;
  data?: { user: { id: string; email: string; role: string }; tempToken: string; message: string };
  error?: string;
  errorCode?: string;
}

interface Verify2FAResponse {
  success: boolean;
  data?: { user: { id: string }; accessToken: string; refreshToken: string };
  error?: string;
  errorCode?: string;
}

interface PasswordResetResponse {
  success: boolean;
  message?: string;
  error?: string;
  errorCode?: string;
}

export const signup = async (id: string, email: string, password: string, role: string): Promise<SignupResponse> => {
  try {
    const response = await axios.post(endpoints.auth.register, { id, email, password, role }, {
      headers: { 'Content-Type': 'application/json' },
      baseURL: process.env.NEXT_PUBLIC_API_URL,
    });
    return response.data;
  } catch (error: any) {
    const errResponse = error.response?.data || {};
    throw new Error(errResponse.errorCode || 'Signup failed');
  }
};

export const login = async (email: string, password: string, deviceInfo: string): Promise<LoginResponse> => {
  try {
    const response = await axios.post(endpoints.auth.login, { email, password, deviceInfo }, {
      headers: { 'Content-Type': 'application/json' },
      baseURL: process.env.NEXT_PUBLIC_API_URL,
    });
    return response.data;
  } catch (error: any) {
    const errResponse = error.response?.data || {};
    throw new Error(errResponse.errorCode || 'Login failed');
  }
};

export const verify2FA = async (userId: string, code: string, tempToken: string, deviceInfo: string): Promise<Verify2FAResponse> => {
  try {
    const response = await axios.post(endpoints.auth.verify2FA, { userId, code, tempToken, deviceInfo }, {
      headers: { 'Content-Type': 'application/json' },
      baseURL: process.env.NEXT_PUBLIC_API_URL,
    });
    if (response.data.success) {
      localStorage.setItem('accessToken', response.data.data.accessToken);
      localStorage.setItem('refreshToken', response.data.data.refreshToken);
    }
    return response.data;
  } catch (error: any) {
    const errResponse = error.response?.data || {};
    throw new Error(errResponse.errorCode || '2FA verification failed');
  }
};

export const requestPasswordReset = async (email: string): Promise<PasswordResetResponse> => {
  try {
    const response = await axios.post(endpoints.auth.requestPasswordReset, { email }, {
      headers: { 'Content-Type': 'application/json' },
      baseURL: process.env.NEXT_PUBLIC_API_URL,
    });
    return response.data;
  } catch (error: any) {
    const errResponse = error.response?.data || {};
    throw new Error(errResponse.errorCode || 'Password reset request failed');
  }
};
