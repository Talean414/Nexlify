'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [secondsLeft, setSecondsLeft] = useState(10)

  useEffect(() => {
    const countdown = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(countdown)
          location.reload()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(countdown)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-black via-zinc-900 to-gray-950 px-6 text-white text-center relative">
      <h1 className="text-6xl font-extrabold text-red-500 animate-pulse">Something Broke</h1>
      <p className="mt-4 text-lg text-gray-300 max-w-md">
        We ran into an unexpected error. Our system is looking into it. You’ll be redirected
        automatically in <span className="font-bold text-white">{secondsLeft}</span> seconds.
      </p>

      <div className="flex gap-4 mt-6">
        <button
          onClick={() => location.reload()}
          className="bg-red-600 hover:bg-red-700 px-5 py-2 rounded-xl shadow text-white font-semibold transition"
        >
          Reload Now
        </button>
        <button
          onClick={reset}
          className="bg-gray-700 hover:bg-gray-600 px-5 py-2 rounded-xl shadow text-white font-semibold transition"
        >
          Try Again
        </button>
      </div>

      <div className="mt-10 text-sm text-gray-400">
        If the issue keeps happening, contact our support:
        <br />
        <a
          href="mailto:support@nexlify.app"
          className="underline hover:text-white ml-1"
        >
          support@nexlify.app
        </a>
      </div>

      <footer className="absolute bottom-4 right-4 text-xs text-gray-600">
        Nexlify &copy; {new Date().getFullYear()} — Seamless Deliveries. Serious Tech.
      </footer>
    </div>
  )
}
