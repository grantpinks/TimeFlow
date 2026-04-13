'use client';

import { motion } from 'framer-motion';
import { Mail, Calendar, Sparkles, Link2, Tag } from 'lucide-react';

const differentiators = [
  {
    title: 'Gmail-native, not bolt-on',
    description:
      'Read, triage, draft, and label sync in one loop. Your inbox drives tasks and calendar—not the other way around.',
    icon: Mail,
  },
  {
    title: 'Multi-calendar scheduling',
    description:
      'Place tasks and habits on real calendar time across the accounts you connect, with conflict-aware suggestions.',
    icon: Calendar,
  },
  {
    title: 'Flow AI (mascot-led) assistant',
    description:
      'Chat with Flow for scheduling, email actions, and habits—same brand character as in-app, not a generic robot icon.',
    icon: Sparkles,
  },
  {
    title: 'Identity-linked habits & tasks',
    description:
      'Tie work to who you are becoming—progress on Today, habits, and celebrations stay coherent.',
    icon: Link2,
  },
  {
    title: 'Smart categories + optional Gmail labels',
    description:
      'Auto-triage with transparency and correction loops so automation stays trustworthy.',
    icon: Tag,
  },
];

export function CompetitiveDifferentiation() {
  return (
    <section id="why-timeflow" className="py-16 sm:py-24 bg-gradient-to-b from-slate-50 to-white px-4 sm:px-6 scroll-mt-24">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="text-center mb-12 sm:mb-16"
        >
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-600 mb-2">
            Why TimeFlow
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Built for email-heavy work—not a generic habit app
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Unlike single-purpose trackers, TimeFlow connects inbox, calendar, tasks, and habits with a
            consistent AI experience (Flow) and identity-based motivation.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {differentiators.map((item, index) => (
            <motion.article
              key={item.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center mb-4">
                <item.icon className="w-5 h-5" strokeWidth={2} aria-hidden />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
