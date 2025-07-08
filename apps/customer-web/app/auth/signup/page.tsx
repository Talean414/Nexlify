import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'next-i18n';
import FormWrapper from '../../../../shared/frontend/components/molecules/FormWrapper';
import Input from '../../../../shared/frontend/components/atoms/Input';
import Button from '../../../../shared/frontend/components/atoms/Button';
import { useAuth } from '../../hooks/useAuth';
import { v4 as uuidv4 } from 'uuid';

const SignupPage: React.FC = () => {
  const { t } = useTranslation('auth');
  const router = useRouter();
  const { signup, loading, error } = useAuth();
  const [formData, setFormData] = useState({
    id: uuidv4(),
    email: '',
    password: '',
    confirmPassword: '',
    role: 'customer',
    agreeTerms: false,
  });
  const [passwordStrength, setPasswordStrength] = useState(0);

  const calculatePasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    if (/[^A-Za-z0-9]/.test(password)) strength += 25;
    setPasswordStrength(strength);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (name === 'password') calculatePasswordStrength(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert(t('passwordsMismatch'));
      return;
    }
    if (!formData.agreeTerms) {
      alert(t('agreeTermsRequired'));
      return;
    }
    try {
      await signup(formData.id, formData.email, formData.password, formData.role);
      router.push(formData.role === 'vendor' ? '/auth/verify-email' : '/dashboard');
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleGoogleSignup = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/api/auth/google`;
  };

  return (
    <FormWrapper title={t('signup')}>
      <form onSubmit={handleSubmit} className="space-y-4">
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
        <div className="h-2 bg-gray-200 rounded">
          <div
            className={`h-full rounded transition-all duration-300 ${
              passwordStrength <= 25 ? 'bg-red-500' :
              passwordStrength <= 50 ? 'bg-orange-500' :
              passwordStrength <= 75 ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${passwordStrength}%` }}
          />
        </div>
        <Input
          label={t('confirmPassword')}
          name="confirmPassword"
          type="password"
          value={formData.confirmPassword}
          onChange={handleChange}
          required
          placeholder={t('confirmPasswordPlaceholder')}
        />
        <div className="flex flex-col">
          <label htmlFor="role" className="text-sm font-medium text-platinum-600">
            {t('role')}
          </label>
          <select
            id="role"
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="mt-1 p-2 border border-platinum-300 rounded-md focus:ring-2 focus:ring-red-500"
          >
            <option value="customer">{t('customer')}</option>
            <option value="vendor">{t('vendor')}</option>
            <option value="courier">{t('courier')}</option>
          </select>
        </div>
        <div className="flex items-center">
          <input
            type="checkbox"
            name="agreeTerms"
            checked={formData.agreeTerms}
            onChange={handleChange}
            className="h-4 w-4 text-red-600 border-gray-300 rounded"
          />
          <label className="ml-2 text-sm text-platinum-600">
            {t('agreeTerms')}
          </label>
        </div>
        {error && (
          <p className="text-red-500 text-sm">
            {error === 'EMAIL_EXISTS' ? t('emailExists') : t('signupError')}
          </p>
        )}
        <Button type="submit" disabled={loading}>
          {loading ? t('signingUp') : t('signup')}
        </Button>
        <div className="flex justify-center space-x-4">
          <Button variant="outline" onClick={handleGoogleSignup}>
            {t('googleSignup')}
          </Button>
        </div>
        <p className="text-center text-sm text-platinum-600">
          {t('haveAccount')}{' '}
          <a href="/auth/login" className="text-red-600 hover:underline">
            {t('login')}
          </a>
        </p>
      </form>
    </FormWrapper>
  );
};

export default SignupPage;