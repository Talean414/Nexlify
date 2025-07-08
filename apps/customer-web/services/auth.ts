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
    const response = await axios.post(endpoints.auth.register, { id, email, password, role });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.errorCode || 'Signup failed');
  }
};

export const login = async (email: string, password: string, deviceInfo: string): Promise<LoginResponse> => {
  try {
    const response = await axios.post(endpoints.auth.login, { email, password, deviceInfo });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.errorCode || 'Login failed');
  }
};

export const verify2FA = async (userId: string, code: string, tempToken: string, deviceInfo: string): Promise<Verify2FAResponse> => {
  try {
    const response = await axios.post(endpoints.auth.verify2FA, { code, tempToken, deviceInfo });
    if (response.data.success) {
      localStorage.setItem('accessToken', response.data.data.accessToken);
      localStorage.setItem('refreshToken', response.data.data.refreshToken);
    }
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.errorCode || '2FA verification failed');
  }
};

export const requestPasswordReset = async (email: string): Promise<PasswordResetResponse> => {
  try {
    const response = await axios.post(endpoints.auth.requestPasswordReset, { email });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.errorCode || 'Password reset request failed');
  }
};