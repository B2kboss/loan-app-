import React from 'react';
import { motion } from 'motion/react';
import { IndiaLoanLogo } from './IndiaLoanLogo';

export const SplashScreen: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.25 } }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-[#071A4B] via-[#0D2B7A] to-[#155EEF] text-white px-6"
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center text-center"
      >
        <div className="p-4 rounded-3xl bg-white/10 backdrop-blur-md border border-white/15 shadow-2xl mb-5">
          <IndiaLoanLogo variant="light" size="lg" />
        </div>
        <p className="text-sm font-medium text-blue-100 tracking-wide">
          Your Dreams, Our Support
        </p>
        <div className="mt-6 w-36 h-1 rounded-full bg-white/15 overflow-hidden">
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ repeat: Infinity, duration: 0.9, ease: 'easeInOut' }}
            className="w-1/2 h-full rounded-full bg-[#10B981]"
          />
        </div>
      </motion.div>
    </motion.div>
  );
};
