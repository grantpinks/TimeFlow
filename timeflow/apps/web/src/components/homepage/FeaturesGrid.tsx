'use client';

import { motion } from 'framer-motion';

const features = [
  {
    icon: '🤖',
    title: 'Conversational AI Scheduling',
    description: 'Just tell us what you need to do. We\'ll figure out when.',
    linkText: 'Learn More',
    linkTo: '#ai-assistant-section',
  },
  {
    icon: '📧',
    title: 'Smart Email Categorization',
    description: 'Auto-categorize and block time for important emails.',
    linkText: 'Learn More',
    linkTo: '#email-section',
  },
  {
    icon: '🔁',
    title: 'Habit-Aware Scheduling',
    description: 'Recurring activities get priority placement.',
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
    <section className="py-24 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              whileHover={{ y: -8, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)" }}
              transition={{ duration: 0.2 }}
              className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100"
            >
              <div className="text-5xl mb-4">{feature.icon}</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-600 mb-4 text-lg">
                {feature.description}
              </p>
              <button
                onClick={() => handleLinkClick(feature.linkTo)}
                className="text-teal-600 hover:text-teal-700 font-semibold inline-flex items-center gap-2"
              >
                {feature.linkText}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
