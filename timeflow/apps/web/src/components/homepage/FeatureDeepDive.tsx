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
    <section id={id} className={`py-24 ${bgClass}`}>
      <div className="max-w-7xl mx-auto px-6">
        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center ${reverse ? 'lg:flex-row-reverse' : ''}`}>
          {/* Text content */}
          <motion.div
            initial={{ opacity: 0, x: reverse ? 20 : -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className={reverse ? 'lg:order-2' : ''}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {title}
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              {subtitle}
            </p>
            <ul className="space-y-4 mb-8">
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
                    className="w-6 h-6 text-teal-600 flex-shrink-0 mt-1"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-lg text-gray-700">{benefit}</span>
                </motion.li>
              ))}
            </ul>
            <a
              href={ctaLink}
              onClick={onCtaClick}
              className="inline-block px-8 py-4 bg-teal-600 text-white rounded-lg font-semibold text-lg hover:bg-teal-700 transition-colors hover:shadow-lg"
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
