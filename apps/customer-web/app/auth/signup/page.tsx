"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import FormWrapper from "@molecules/FormWrapper";
import Input from "@atoms/Input";
import Button from "@atoms/Button";
import { useAuth } from "../../../hooks/useAuth";
import { v4 as uuidv4 } from "uuid";

const SignupPage: React.FC = () => {
  const t = useTranslations('auth');
  const router = useRouter();
  const { signup, loading, error } = useAuth();
  const [formData, setFormData] = useState({
    id: uuidv4(), // Ensure id is always generated
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
      const response = await signup(formData.id, formData.email, formData.password, formData.role);
      console.log('Signup successful, response:', response);
      router.push(formData.role === 'vendor' ? '/auth/verify-email' : '/dashboard');
    } catch (err: any) {
      console.error('Signup error:', err.message);
    }
  };

  const handleGoogleSignup = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/api/auth/google`;
  };

  return (
    <FormWrapper title={t('signup')}>
      <form onSubmit={handleSubmit} className="space-y-6 bg-black bg-opacity-90 p-8 rounded-xl shadow-2xl">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-platinum-600 mb-4 animate-pulse">Join the Delivery Revolution</h1>
          <p className="text-platinum-300 text-sm">Become a Customer, Vendor, or Courier with us!</p>
        </div>
        <Input
          label={t('email')}
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          required
          placeholder={t('emailPlaceholder')}
          className="bg-platinum-100 border-green-600 focus:ring-green-500"
        />
        <Input
          label={t('password')}
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          required
          placeholder={t('passwordPlaceholder')}
          className="bg-platinum-100 border-green-600 focus:ring-green-500"
        />
        <div className="h-2 bg-platinum-300 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              passwordStrength <= 25 ? 'bg-red-600' :
              passwordStrength <= 50 ? 'bg-yellow-500' :
              passwordStrength <= 75 ? 'bg-green-400' : 'bg-green-600'
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
          className="bg-platinum-100 border-green-600 focus:ring-green-500"
        />
        <div className="flex flex-col">
          <label htmlFor="role" className="text-sm font-semibold text-platinum-600">
            {t('role')}
          </label>
          <select
            id="role"
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="mt-2 p-3 border border-platinum-300 rounded-lg bg-platinum-100 focus:ring-2 focus:ring-red-600"
          >
            <option value="customer" className="text-black">{t('customer')}</option>
            <option value="vendor" className="text-black">{t('vendor')}</option>
            <option value="courier" className="text-black">{t('courier')}</option>
          </select>
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            name="agreeTerms"
            checked={formData.agreeTerms}
            onChange={handleChange}
            className="h-5 w-5 text-red-600 border-platinum-300 rounded focus:ring-red-500"
          />
          <label className="text-sm text-platinum-300">
            {t('agreeTerms')}
          </label>
        </div>
        {error && (
          <p className="text-red-600 text-sm text-center animate-bounce">
            {error === 'EMAIL_EXISTS' ? t('emailExists') : t('signupError')}
          </p>
        )}
        <Button type="submit" disabled={loading} className="w-full bg-green-600 text-white hover:bg-green-700">
          {loading ? t('signingUp') : t('signup')}
        </Button>
        <div className="flex justify-center space-x-4">
          <Button variant="outline" onClick={handleGoogleSignup} className="w-full border-green-600 text-green-600 hover:bg-green-50">
            {t('googleSignup')}
          </Button>
        </div>
        <p className="text-center text-sm text-platinum-300">
          {t('haveAccount')}{' '}
          <a href="/auth/login" className="text-red-600 hover:text-red-700 font-medium">
            {t('login')}
          </a>
        </p>
      </form>
    </FormWrapper>
  );
};

export default SignupPage;
