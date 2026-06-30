import React from 'react';
import { Helmet } from 'react-helmet';
import RegisterForm from '@/components/auth/RegisterForm';
import { motion } from 'framer-motion';

const RegisterPage = () => {
  return (
    <div className="container relative flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0 min-h-[calc(100vh-4rem)]">
      <Helmet>
        <title>Register | EduPlatform</title>
        <meta name="description" content="Create a new account" />
      </Helmet>

      <div className="relative hidden h-full flex-col bg-muted p-10 text-white dark:border-r lg:flex">
        <div className="absolute inset-0 bg-zinc-900" />
        <div className="relative z-20 flex items-center text-lg font-medium">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-2 h-6 w-6"
          >
            <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
          </svg>
          EduPlatform
        </div>
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-lg">
              &ldquo;Joining this platform was the best decision for my career. The structured courses and certificates helped me land my dream job.&rdquo;
            </p>
            <footer className="text-sm">Alex Chen</footer>
          </blockquote>
        </div>
      </div>
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <RegisterForm />
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;