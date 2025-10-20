// apps/customer-web/app/[locale]/layout.tsx

import { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { notFound } from 'next/navigation';
import { Providers } from '../providers';

export default async function LocaleLayout({
  children,
  params: { locale }
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  let messages;
  try {
    messages = (await import(`../../i18n/${locale}.json`)).default;
  } catch (error) {
    notFound(); // Ensures proper 404 behavior if locale JSON is missing
  }

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers locale={locale}>
            {children}
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

// Static params for SSG
export const generateStaticParams = async () => {
  return ['en', 'ar', 'fr'].map((locale) => ({ locale }));
};
