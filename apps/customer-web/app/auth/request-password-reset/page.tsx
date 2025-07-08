import React, { useState } from 'react';
import { useTranslation } from 'next-i18n';
import FormWrapper from '../../../../shared/frontend/components/molecules/FormWrapper';
import Input from '../../../../shared/frontend/components/atoms/Input';
import Button from '../../../../shared/frontend/components/atoms/Button';
import { useAuth } from '../../hooks/useAuth';

const RequestPasswordResetPage: React.FC = () => {
  const { t } = useTranslation('auth');
  const { requestPasswordReset, loading, error } = useAuth();
  const [email, setEmail] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await requestPasswordReset(email);
      alert(t('resetLinkSent'));
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <FormWrapper title={t('requestPasswordReset')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={t('email')}
          name="email"
          type="email"
          value={email}
          onChange={handleChange}
          required
          placeholder={t('emailPlaceholder')}
        />
        {error && <p className="text-red-500 text-sm">{t('resetError')}</p>}
        <Button type="submit" disabled={loading}>
          {loading ? t('sending') : t('sendResetLink')}
        </Button>
        <p className="text-center text-sm text-platinum-600">
          <a href="/auth/login" className="text-red-600 hover:underline">
            {t('backToLogin')}
          </a>
        </p>
      </form>
    </FormWrapper>
  );
};

export default RequestPasswordResetPage;