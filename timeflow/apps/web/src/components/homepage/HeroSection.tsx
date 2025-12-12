'use client';

import { motion, useAnimation } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { getGoogleAuthUrl } from '@/lib/api';
import { useState, useCallback, useEffect } from 'react';
import { track } from '@/lib/analytics';

// Flow's different emotions/states
const flowEmotions = [
  { src: '/branding/flow-default.png', label: 'Happy' },
  { src: '/branding/flow-celebrating.png', label: 'Celebrating' },
  { src: '/branding/flow-thinking.png', label: 'Thinking' },
];

export function HeroSection() {
  const [emotionIndex, setEmotionIndex] = useState(0);
  const controls = useAnimation();
  const [cycleTick, setCycleTick] = useState(0);

  const handleScrollToDemo = () => {
    track('homepage_demo_clicked', { section: 'hero' });
    const demoSection = document.getElementById('ai-assistant-section');
    if (demoSection) {
      demoSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Trigger spin and emotion change every 2 bounces for visibility
  const handleBounceRepeat = useCallback(() => {
    setCycleTick((prev) => prev + 1);
  }, []);

  // Spin and swap pose on every second bounce (or timer tick backup)
  useEffect(() => {
    if (cycleTick === 0) return;
    setEmotionIndex((prev) => (prev + 1) % flowEmotions.length);
    controls.start({
      rotate: [0, 360],
      scale: [1, 1.08, 1],
      transition: {
        duration: 0.65,
        ease: 'easeInOut',
      },
    });
  }, [cycleTick, controls]);

  // Failsafe timer so pose still cycles even if bounce repeat is throttled
  useEffect(() => {
    const id = setInterval(() => {
      setCycleTick((prev) => prev + 1);
    }, 5200);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden hero-gradient pt-36 pb-16">
      {/* Animated gradient background - defined in globals.css */}

      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
        {/* Mascot with floating animation - BIGGER & CENTERED */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex justify-center mb-12"
        >
          <div className="relative">
            {/* Flow Mascot */}
            <motion.div
              animate={{
                y: [0, -15, 0],
              }}
              transition={{
                duration: 2.6,
                repeat: Infinity,
                ease: "easeInOut",
                onRepeat: handleBounceRepeat,
              }}
            >
              <motion.div animate={controls} className="relative">
                <motion.div
                  key={flowEmotions[emotionIndex].src}
                  initial={{ opacity: 0, rotate: -10 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                >
                  <Image
                    src={flowEmotions[emotionIndex].src}
                    alt={`Flow, your AI scheduling assistant — ${flowEmotions[emotionIndex].label}`}
                    width={260}
                    height={260}
                    className="rounded-full shadow-2xl ring-4 ring-white/20"
                    priority
                  />
                </motion.div>
              </motion.div>
            </motion.div>

            {/* Sparkle particles around Flow */}
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute inset-0 -z-10 rounded-full bg-white/10 blur-2xl"
            />
          </div>
        </motion.div>

        {/* New compelling headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight"
        >
          Stop Fighting Your Calendar.
          <br />
          <span className="text-white/90">Find Your Flow.</span>
        </motion.h1>

        {/* Sub-headline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-xl md:text-2xl text-white/90 mb-10 max-w-3xl mx-auto font-medium"
        >
          AI-powered scheduling that actually understands you&apos;re busy.
          <br className="hidden md:block" />
          No more juggling calendars, tasks, and emails manually.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-10"
        >
          <motion.a
            href={getGoogleAuthUrl()}
            onClick={() => track('homepage_cta_clicked', { cta_text: 'Get Started Free', location: 'hero' })}
            className="group relative px-10 py-5 bg-white text-teal-600 rounded-xl font-bold text-lg hover:shadow-2xl transition-all duration-300"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="relative z-10">Get Started Free →</span>
            <motion.span
              className="absolute inset-0 rounded-xl bg-white/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"
              animate={{
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
            />
          </motion.a>
          <motion.button
            onClick={handleScrollToDemo}
            className="px-10 py-5 bg-white/10 backdrop-blur-sm text-white border-2 border-white/40 rounded-xl font-semibold text-lg hover:bg-white/20 transition-all duration-300"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            Watch Demo
          </motion.button>
        </motion.div>

        {/* Enhanced trust signals */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          className="flex flex-col sm:flex-row gap-6 justify-center items-center text-white/90 text-sm"
        >
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">Free 14-day trial</span>
          </div>
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">No credit card needed</span>
          </div>
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
            </svg>
            <span className="font-medium">Join 10,000+ users</span>
          </div>
        </motion.div>

        {/* Social proof mini-stat */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.1 }}
          className="mt-8 text-white/70 text-sm"
        >
          ⭐⭐⭐⭐⭐ <span className="font-semibold text-white/90">4.8/5</span> from 500+ productivity enthusiasts
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 1.3 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <div className="flex flex-col items-center gap-2">
            <span className="text-white/60 text-xs font-medium">Scroll to explore</span>
            <svg className="w-6 h-6 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
