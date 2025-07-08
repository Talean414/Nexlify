import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'next-i18n';
import FormWrapper from '../../../../shared/frontend/components/molecules/FormWrapper';
import Input from '../../../../shared/frontend/components/atoms/Input';
import Button from '../../../../shared/frontend/components/atoms/Button';
import { useAuth } from '../../hooks/useAuth';

const LoginPage: React.FC = () => {
  const { t } = useTranslation('auth');
  const router = useRouter();
  const { login, verify2FA, loading, error } = useAuth();
  const [step, setStep] = useState<'login' | '2fa'>('login');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    code: '',
    tempToken: '',
    userId: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { tempToken, user } = await login(formData.email, formData.password, navigator.userAgent);
      setFormData((prev) => ({ ...prev, tempToken, userId: user.id }));
      setStep('2fa');
    } catch (err: any) {
      console.error(err);
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await verify2FA(formData.userId, formData.code, formData.tempToken, navigator.userAgent);
      router.push('/dashboard');
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/api/auth/google`;
  };

  return (
    <FormWrapper title={step === 'login' ? t('login') : t('verify2FA')}>
      {step === 'login' ? (
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <Input
            label={t('email')}
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
            placeholder={t('emailPlaceholder')}
          />
          <Input
            label={t('password')}
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            required
            placeholder={t('passwordPlaceholder')}
          />
          {error && (
            <p className="text-red-500 text-sm">
              {error === 'INVALID_CREDENTIALS' ? t('invalidCredentials') : t('loginError')}
            </p>
          )}
          <div className="flex items-center">
            <input
              type="checkbox"
              name="rememberMe"
              className="h-4 w-4 text-red-600 border-gray-300 rounded"
            />
            <label className="ml-2 text-sm text-platinum-600">{t('rememberMe')}</label>
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? t('loggingIn') : t('login')}
          </Button>
          <div className="flex justify-center space-x-4">
            <Button variant="outline" onClick={handleGoogleLogin}>
              {t('googleLogin')}
            </Button>
          </div>
          <p className="text-center text-sm text-platinum-600">
            <a href="/auth/request-password-reset" className="text-red-600 hover:underline">
              {t('forgotPassword')}
            </a>
          </p>
          <p className="text-center text-sm text-platinum-600">
            {t('noAccount')}{' '}
            <a href="/auth/signup" className="text-red-600 hover:underline">
              {t('signup')}
            </a>
          </p>
        </form>
      ) : (
        <form onSubmit={handle2FASubmit} className="space-y-4">
          <Input
            label={t('2faCode')}
            name="code"
            type="text"
            value={formData.code}
            onChange={handleChange}
            required
            placeholder={t('2faCodePlaceholder')}
            maxLength={6}
          />
          {error && (
            <p className="text-red-500 text-sm">
              {error === 'INVALID_2FA_CODE' ? t('invalid2FACode') : t('2faError')}
            </p>
          )}
          <Button type="submit" disabled={loading}>
            {loading ? t('verifying') : t('verify')}
          </Button>
          <p className="text-center text-sm text-platinum-600">
            <button
              type="button"
              onClick={() => setStep('login')}
              className="text-red-600 hover:underline"
            >
              {t('backToLogin')}
            </button>
          </p>
        </form>
      )}
    </FormWrapper>
  );
};

export default LoginPage;