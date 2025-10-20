import { getRequestConfig } from 'next-intl/server';

const locales = ['en', 'ar', 'fr'];
const defaultLocale = 'en';

export default getRequestConfig(async ({ locale }) => {
  // If the locale is not supported, fall back to the default locale
  const validLocale = locales.includes(locale) ? locale : defaultLocale;
  return {
    locale: validLocale,
    messages: (await import(`../app/messages/${validLocale}.json`)).default,
  };
});
