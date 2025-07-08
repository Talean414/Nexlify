import React from 'react';
import { theme } from '../../../../shared/frontend/theme';

interface FormWrapperProps {
  title: string;
  children: React.ReactNode;
}

const FormWrapper: React.FC<FormWrapperProps> = ({ title, children }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg">
        <h2
          className="text-2xl font-bold text-center text-secondary mb-6"
          style={{ fontFamily: theme.fonts.primary }}
        >
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
};

export default FormWrapper;