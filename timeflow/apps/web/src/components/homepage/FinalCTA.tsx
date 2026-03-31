'use client';

import { motion } from 'framer-motion';
import { getGoogleAuthUrl } from '@/lib/api';

export function FinalCTA() {
  return (
    <section className="relative min-h-[50vh] sm:min-h-[60vh] flex items-center justify-center overflow-hidden hero-gradient px-4 sm:px-6">
      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-8 sm:mb-10 leading-tight"
        >
          Ready to Take Control of Your Calendar?
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch sm:items-center mb-6 sm:mb-8"
        >
          <a
            href={getGoogleAuthUrl()}
            className="group relative px-6 sm:px-8 py-4 min-h-[56px] bg-white text-teal-600 rounded-lg font-semibold text-base sm:text-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 active:scale-[0.98] inline-flex items-center justify-center"
          >
            Start Scheduling Smarter - Free 14 Days
            <span className="absolute inset-0 rounded-lg bg-white/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></span>
          </a>
          <a
            href="/contact"
            className="px-6 sm:px-8 py-4 min-h-[56px] bg-white/10 backdrop-blur-sm text-white border-2 border-white/30 rounded-lg font-semibold text-base sm:text-lg hover:bg-white/20 active:bg-white/30 transition-all duration-300 hover:-translate-y-1 active:scale-[0.98] inline-flex items-center justify-center"
          >
            Book a Demo
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center text-white/80 text-xs sm:text-sm"
        >
          <div className="flex items-center gap-2 min-h-[32px]">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>No credit card required</span>
          </div>
          <div className="flex items-center gap-2 min-h-[32px]">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Free plan available after trial</span>
          </div>
          <div className="flex items-center gap-2 min-h-[32px]">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Cancel anytime</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
