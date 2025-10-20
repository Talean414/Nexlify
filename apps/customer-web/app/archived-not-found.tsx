'use client';
import { useEffect, useState } from "react";

export default function NotFound() {
  const [secondsLeft, setSecondsLeft] = useState(10);

  useEffect(() => {
    // Ensure this runs only in the browser
    if (typeof window !== "undefined") {
      const interval = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            window.location.reload();
            return 0;
          }
          return s - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white text-center px-6">
      <h1 className="text-6xl font-extrabold mb-4 text-red-500">404</h1>
      <p className="text-2xl font-semibold mb-2">Page Not Found</p>
      <p className="mb-6 text-gray-400">
        This page doesn’t exist or may have been moved.
      </p>
      <p className="text-sm text-gray-500 mb-6">
        Automatically retrying in <span className="font-mono">{secondsLeft}</span> seconds...
      </p>
      <button
        onClick={() => {
          if (typeof window !== "undefined") {
            window.location.reload();
          }
        }}
        className="bg-white text-black px-4 py-2 rounded hover:bg-gray-300 transition"
      >
        Retry Now
      </button>
    </div>
  );
}
