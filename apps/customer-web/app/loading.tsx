'use client'

import { motion } from 'framer-motion'

export default function Loading() {
  return (
    <div className="flex items-center justify-center h-screen bg-platinum-100">
      <motion.div
        className="flex flex-col items-center gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin"
          aria-label="Loading spinner"
        />
        <p className="text-black-600 font-roboto text-lg animate-pulse">
          Loading your experience...
        </p>
      </motion.div>
    </div>
  )
}
