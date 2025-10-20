// apps/customer-web/app/page.tsx

'use client';

import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to Nexlify</h1>
        <p className="text-lg text-gray-600 mb-8">Revolutionizing deliveries, one tap at a time.</p>
        <Link
          href="/auth/signup"
          className="inline-block bg-black text-white px-6 py-3 rounded-xl text-md font-semibold shadow hover:bg-gray-800 transition-all duration-200"
        >
          Create an Account
        </Link>
      </div>
    </main>
  );
}
