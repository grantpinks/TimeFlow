'use client';

import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';

interface ThinkingStateProps {
  statusText?: string;
}

export default function ThinkingState({
  statusText = 'Analyzing your schedule...',
}: ThinkingStateProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 sm:px-6" role="status" aria-live="polite" aria-label="Flow is thinking">
      <div className="text-center mb-6 sm:mb-8">
        {/* Centered Medium Mascot with Bounce Animation and Liquid Glow */}
        <motion.div
          className="relative w-28 h-28 sm:w-32 sm:h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 mx-auto mb-4 sm:mb-6"
          initial={reduceMotion ? false : { scale: 0.95, opacity: 0 }}
          animate={
            reduceMotion
              ? { opacity: 1, y: 0 }
              : {
                  y: [0, -8, 0],
                  opacity: 1,
                }
          }
          transition={
            reduceMotion
              ? { duration: 0 }
              : {
                  y: {
                    duration: 1.8,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  },
                  opacity: {
                    duration: 0.3,
                  },
                }
          }
        >
          {/* Liquid Blob Glow Effect - Radial Gradient Rings */}
          <motion.div
            className="absolute inset-0"
            style={{
              width: '180%',
              height: '180%',
              left: '-40%',
              top: '-40%',
              background: 'radial-gradient(ellipse 50% 60% at 50% 50%, rgba(11, 175, 154, 0.25) 0%, rgba(11, 175, 154, 0.15) 30%, rgba(59, 130, 246, 0.1) 50%, rgba(59, 130, 246, 0.05) 70%, transparent 100%)',
              filter: 'blur(40px)',
              borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
            }}
            animate={
              reduceMotion
                ? { opacity: 0.6, scale: 1 }
                : {
                    scale: [1, 1.08, 1],
                    opacity: [0.8, 1, 0.8],
                  }
            }
            transition={
              reduceMotion
                ? { duration: 0 }
                : {
                    duration: 3,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }
            }
          />
          <motion.div
            className="absolute inset-0"
            style={{
              width: '150%',
              height: '150%',
              left: '-25%',
              top: '-25%',
              background: 'radial-gradient(ellipse 50% 60% at 50% 50%, rgba(11, 175, 154, 0.4) 0%, rgba(11, 175, 154, 0.25) 30%, rgba(59, 130, 246, 0.15) 60%, transparent 100%)',
              filter: 'blur(30px)',
              borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
            }}
            animate={
              reduceMotion
                ? { opacity: 0.7, scale: 1 }
                : {
                    scale: [1, 1.12, 1],
                    opacity: [0.9, 1, 0.9],
                  }
            }
            transition={
              reduceMotion
                ? { duration: 0 }
                : {
                    duration: 2.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: 0.2,
                  }
            }
          />
          <motion.div
            className="absolute inset-0"
            style={{
              width: '120%',
              height: '120%',
              left: '-10%',
              top: '-10%',
              background: 'radial-gradient(ellipse 50% 60% at 50% 50%, rgba(11, 175, 154, 0.5) 0%, rgba(11, 175, 154, 0.3) 40%, rgba(59, 130, 246, 0.2) 70%, transparent 100%)',
              filter: 'blur(20px)',
              borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
            }}
            animate={
              reduceMotion
                ? { opacity: 0.8, scale: 1 }
                : {
                    scale: [1, 1.15, 1],
                    opacity: [1, 0.95, 1],
                  }
            }
            transition={
              reduceMotion
                ? { duration: 0 }
                : {
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: 0.4,
                  }
            }
          />

          {/* Flow Mascot Thinking */}
          <Image
            src="/branding/flow-thinking.png"
            alt="Flow assistant in thinking state, processing your request"
            fill
            className="object-contain drop-shadow-2xl relative z-10"
            priority
            role="img"
            aria-label="Flow is analyzing your request and preparing a response"
          />
        </motion.div>

        {/* Status Text - Matching Hero Style */}
        <motion.h2
          className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-3 sm:mb-4"
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduceMotion ? { duration: 0 } : { delay: 0.1, duration: 0.3 }}
        >
          {statusText}
        </motion.h2>
        <span className="sr-only" role="status" aria-live="polite">
          {statusText}
        </span>

        {/* Subtitle */}
        <motion.p
          className="text-sm sm:text-base md:text-lg text-slate-600 mb-4 sm:mb-6"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={reduceMotion ? { duration: 0 } : { delay: 0.2, duration: 0.3 }}
        >
          This will just take a moment...
        </motion.p>

        {/* Elegant loading dots */}
        <motion.div
          className="flex items-center justify-center space-x-2"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={reduceMotion ? { duration: 0 } : { delay: 0.3, duration: 0.3 }}
        >
          <div
            className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-primary-500 rounded-full animate-bounce motion-reduce:animate-none"
            style={{ animationDelay: '0ms' }}
          />
          <div
            className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-primary-500 rounded-full animate-bounce motion-reduce:animate-none"
            style={{ animationDelay: '150ms' }}
          />
          <div
            className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-primary-500 rounded-full animate-bounce motion-reduce:animate-none"
            style={{ animationDelay: '300ms' }}
          />
        </motion.div>
      </div>
    </div>
  );
}
