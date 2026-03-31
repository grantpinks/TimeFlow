'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface FeatureDeepDiveProps {
  id: string;
  title: string;
  subtitle: string;
  benefits: string[];
  ctaText: string;
  ctaLink: string;
  visual: ReactNode;
  reverse?: boolean;
  gradient?: boolean;
  onCtaClick?: () => void;
}

export function FeatureDeepDive({
  id,
  title,
  subtitle,
  benefits,
  ctaText,
  ctaLink,
  visual,
  reverse = false,
  gradient = false,
  onCtaClick,
}: FeatureDeepDiveProps) {
  const bgClass = gradient ? 'feature-gradient' : 'bg-white';

  return (
    <section id={id} className={`py-16 sm:py-24 ${bgClass} px-4 sm:px-6`}>
      <div className="max-w-7xl mx-auto">
        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 items-center ${reverse ? 'lg:flex-row-reverse' : ''}`}>
          {/* Text content */}
          <motion.div
            initial={{ opacity: 0, x: reverse ? 20 : -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className={reverse ? 'lg:order-2' : ''}
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-3 sm:mb-4">
              {title}
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 mb-6 sm:mb-8">
              {subtitle}
            </p>
            <ul className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
              {benefits.map((benefit, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="flex items-start gap-3"
                >
                  <svg
                    className="w-6 h-6 sm:w-7 sm:h-7 text-teal-600 flex-shrink-0 mt-1"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-base sm:text-lg text-gray-700">{benefit}</span>
                </motion.li>
              ))}
            </ul>
            <a
              href={ctaLink}
              onClick={onCtaClick}
              className="inline-flex items-center justify-center px-6 sm:px-8 py-3.5 sm:py-4 min-h-[52px] bg-teal-600 text-white rounded-lg font-semibold text-base sm:text-lg hover:bg-teal-700 active:bg-teal-800 transition-all hover:shadow-lg active:scale-[0.98]"
            >
              {ctaText}
            </a>
          </motion.div>

          {/* Visual */}
          <motion.div
            initial={{ opacity: 0, x: reverse ? -20 : 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={reverse ? 'lg:order-1' : ''}
          >
            {visual}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
