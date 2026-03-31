'use client';

import { motion } from 'framer-motion';

const testimonials = [
  {
    quote: 'TimeFlow saved me 8 hours per week on scheduling!',
    author: 'Sarah M.',
    role: 'Product Manager',
    avatar: '👩‍💼',
  },
  {
    quote: 'Finally, an AI assistant that actually works.',
    author: 'James K.',
    role: 'Entrepreneur',
    avatar: '👨‍💻',
  },
  {
    quote: 'The email categorization is brilliant!',
    author: 'Maya R.',
    role: 'Designer',
    avatar: '👩‍🎨',
  },
  {
    quote: 'Habit scheduling changed my life.',
    author: 'Alex T.',
    role: 'Developer',
    avatar: '👨‍🔬',
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
            Join 10,000+ Professionals Who&apos;ve
            <br className="hidden sm:block" />
            <span className="sm:hidden"> </span>
            Reclaimed Their Time
          </h2>
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
              <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">{testimonial.avatar}</div>
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
