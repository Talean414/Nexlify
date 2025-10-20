"use client";

import React from "react";
import { useTranslations } from "next-intl";

const DashboardPage: React.FC = () => {
  const t = useTranslations('dashboard');

  return (
    <div className="min-h-screen bg-black text-platinum-600 flex items-center justify-center">
      <div className="bg-black bg-opacity-90 p-8 rounded-xl shadow-2xl text-center">
        <h1 className="text-3xl font-bold mb-4 animate-pulse">{t('welcome')}</h1>
        <p className="text-platinum-300">{t('dashboardMessage')}</p>
        <p className="mt-4 text-green-600">{t('loggedIn')}</p>
      </div>
    </div>
  );
};

export default DashboardPage;
