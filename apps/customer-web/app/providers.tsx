// apps/customer-web/app/providers.tsx
'use client';

import React, { ReactNode } from 'react';
import { ThemeProvider } from 'next-themes';

export const Providers = ({ children }: { children: ReactNode }) => {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      {/* Wrap any other global providers here */}
      {children}
    </ThemeProvider>
  );
};
