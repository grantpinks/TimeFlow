'use client';

import { motion } from 'framer-motion';

const testimonials = [
  {
    quote:
      'I linked my habits to a “Writer” identity—seeing progress on Today next to my inbox keeps me honest.',
    author: 'Sarah M.',
    role: 'Product Manager',
    initials: 'SM',
  },
  {
    quote:
      'Flow is the first “AI” in a productivity app that feels like one product—email → tasks → calendar without tab hell.',
    author: 'James K.',
    role: 'Entrepreneur',
    initials: 'JK',
  },
  {
    quote:
      'Email categories + actionable queue means I actually clear the inbox instead of just staring at it.',
    author: 'Maya R.',
    role: 'Designer',
    initials: 'MR',
  },
  {
    quote:
      'Scheduling my runs like real calendar blocks—and tying them to identity—finally made habits stick.',
    author: 'Alex T.',
    role: 'Developer',
    initials: 'AT',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function Testimonials() {
  return (
    <section className="py-16 sm:py-24 bg-white px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12 sm:mb-16"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
            Identity, inbox, and calendar—finally in one flow
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Teams use TimeFlow to connect who they&apos;re becoming with what they do each day.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mb-10 sm:mb-12"
        >
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              whileHover={{ y: -4, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)" }}
              className="bg-gray-50 p-6 sm:p-8 rounded-xl sm:rounded-2xl"
            >
              <div
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-teal-100 text-teal-800 font-bold text-base sm:text-lg flex items-center justify-center mb-3 sm:mb-4 border border-teal-200/80"
                aria-hidden
              >
                {testimonial.initials}
              </div>
              <p className="text-lg sm:text-xl text-gray-800 mb-5 sm:mb-6 font-medium">
                &quot;{testimonial.quote}&quot;
              </p>
              <div>
                <div className="font-semibold text-base sm:text-lg text-gray-900">
                  {testimonial.author}
                </div>
                <div className="text-sm sm:text-base text-gray-600">{testimonial.role}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 text-xl sm:text-2xl font-bold text-teal-600">
            <span className="flex text-lg sm:text-2xl">
              {'⭐⭐⭐⭐⭐'}
            </span>
            <span>4.8/5</span>
          </div>
          <p className="text-sm sm:text-base text-gray-600 mt-2">from 500+ reviews</p>
        </motion.div>
      </div>
    </section>
  );
}
