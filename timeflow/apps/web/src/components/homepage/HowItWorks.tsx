'use client';

import { motion } from 'framer-motion';

const steps = [
  {
    number: 1,
    title: 'Tell Us What You Need To Do',
    description: 'Create tasks with priorities, deadlines, and durations. Or just tell our AI assistant what you need to accomplish.',
    icon: '📝',
  },
  {
    number: 2,
    title: 'AI Finds Perfect Time Slots',
    description: 'Our AI analyzes your calendar, priorities, and habits to find the optimal time for each task.',
    icon: '🤖',
  },
  {
    number: 3,
    title: 'Your Schedule Syncs Everywhere',
    description: 'Tasks automatically appear in Google Calendar, synced across all your devices in real-time.',
    icon: '📅',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function HowItWorks() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            How TimeFlow Works
          </h2>
          <p className="text-xl text-gray-600">
            Three simple steps to transform your productivity
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
          className="space-y-12"
        >
          {steps.map((step, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="relative"
            >
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="flex-shrink-0 w-24 h-24 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center text-white font-bold text-3xl shadow-lg">
                  {step.number}
                </div>
                <div className="flex-1">
                  <div className="text-4xl mb-3">{step.icon}</div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    {step.title}
                  </h3>
                  <p className="text-lg text-gray-600">
                    {step.description}
                  </p>
                </div>
              </div>

              {index < steps.length - 1 && (
                <motion.div
                  animate={{ y: [0, 10, 0] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="flex justify-center my-8"
                >
                  <svg
                    className="w-8 h-8 text-teal-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 14l-7 7m0 0l-7-7m7 7V3"
                    />
                  </svg>
                </motion.div>
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
