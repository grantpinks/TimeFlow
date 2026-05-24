'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';

type AuthPageLayoutProps = {
  heading: string;
  subheading: string;
  children: React.ReactNode;
};

export function AuthPageLayout({ heading, subheading, children }: AuthPageLayoutProps) {
  return (
    <div className="min-h-screen hero-gradient flex flex-col">
      {/* Header with logo */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <Link href="/" className="flex items-center">
            <Image
              src="/branding/main_logo.png"
              alt="TimeFlow"
              width={120}
              height={32}
              priority
              className="h-8 sm:h-10 w-auto"
            />
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 pt-24 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          {/* Flow Mascot */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex justify-center mb-8"
          >
            <motion.div
              animate={{
                y: [0, -10, 0],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="relative w-24 h-24 sm:w-32 sm:h-32"
            >
              <Image
                src="/branding/flow-default.png"
                alt="Flow, your AI scheduling assistant"
                fill
                className="rounded-full shadow-2xl ring-4 ring-white/30 object-contain"
                priority
              />
            </motion.div>
          </motion.div>

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-8 sm:p-10"
          >
            <div className="text-center mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
                {heading}
              </h1>
              <p className="text-base sm:text-lg text-gray-600">
                {subheading}
              </p>
            </div>

            {children}
          </motion.div>

          {/* Footer links */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-6 text-center text-sm text-white/80"
          >
            <Link href="/privacy" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <span className="mx-2">•</span>
            <Link href="/terms" className="hover:text-white transition-colors">
              Terms of Service
            </Link>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
