// customer-web/app/providers.tsx
'use client'; // Required for client-side rendering of i18n context

import { NextIntlProvider } from 'next-intl';

export function Providers({ children, locale }: { children: React.ReactNode; locale: string }) {
  let messages;
    try {
        messages = require(`../../i18n/${locale}.json`);
          } catch (error) {
              console.error(`Failed to load messages for locale ${locale}:`, error);
                  messages = require(`../../i18n/en.json`); // Fallback to English
                    }

                      return <NextIntlProvider locale={locale} messages={messages}>{children}</NextIntlProvider>;
                      }