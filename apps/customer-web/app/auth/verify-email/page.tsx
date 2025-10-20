"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";

const VerifyEmailPage: React.FC = () => {
  const t = useTranslations('auth');
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || 'user@example.com'; // Simulate email from query or signup

  return (
    <div className="min-h-screen bg-black text-platinum-600 flex items-center justify-center">
      <div className="bg-black bg-opacity-90 p-8 rounded-xl shadow-2xl text-center">
        <h1 className="text-3xl font-bold mb-4 animate-pulse">{t('verifyEmailTitle')}</h1>
        <p className="text-platinum-300 mb-4">{t('verifyEmailMessage', { email })}</p>
        <p className="text-green-600">{t('checkInbox')}</p>
        <p className="mt-4 text-platinum-300">{t('verificationPlaceholder')}</p>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
