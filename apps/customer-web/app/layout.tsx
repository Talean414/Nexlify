import './global.css'
import { Inter } from 'next/font/google'
import { NextIntlClientProvider, useMessages } from 'next-intl'
import { notFound } from 'next/navigation'

const inter = Inter({ subsets: ['latin'], display: 'swap' })

export const metadata = {
  title: 'Nexlify',
  description: 'Customer App',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const messages = useMessages()

  if (!messages) {
    notFound()
  }

  return (
    <html lang="en">
      <body className={`${inter.className} bg-platinum-100 text-black-600`}>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
