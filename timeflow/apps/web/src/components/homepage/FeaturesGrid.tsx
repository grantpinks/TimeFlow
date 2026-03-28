'use client';

import { motion } from 'framer-motion';

const features = [
  {
    icon: '🤖',
    title: 'AI That Reads Your Emails',
    description: 'Automatically extracts tasks from your inbox and suggests perfect time slots. No manual entry required.',
    linkText: 'Learn More',
    linkTo: '#ai-assistant-section',
  },
  {
    icon: '📧',
    title: 'Email → Calendar in Seconds',
    description: 'From "Can we meet next week?" to a scheduled event instantly. TimeFlow handles the back-and-forth.',
    linkText: 'Learn More',
    linkTo: '#email-section',
  },
  {
    icon: '🔁',
    title: 'Identity-Based Habit Tracking',
    description: 'Link daily habits to who you\'re becoming. Research-backed approach for lasting change.',
    linkText: 'Learn More',
    linkTo: '#habits-section',
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

export function FeaturesGrid() {
  const handleLinkClick = (linkTo: string) => {
    const section = document.querySelector(linkTo);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="py-16 sm:py-24 bg-gradient-to-b from-white to-gray-50 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 sm:mb-16"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            What Makes TimeFlow Different
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
            While other schedulers just track your time, TimeFlow actively manages it by connecting your inbox, calendar, and habits.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              whileHover={{ y: -8, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)" }}
              transition={{ duration: 0.2 }}
              className="bg-white p-6 sm:p-8 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100"
            >
              <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">{feature.icon}</div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-600 mb-4 text-base sm:text-lg">
                {feature.description}
              </p>
              <button
                onClick={() => handleLinkClick(feature.linkTo)}
                className="text-teal-600 hover:text-teal-700 active:text-teal-800 font-semibold inline-flex items-center gap-2 min-h-[44px] py-2 transition-colors"
              >
                {feature.linkText}
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
