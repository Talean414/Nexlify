import React from 'react';
import { theme } from '../../../../../shared/frontend/theme';

interface ButtonProps {
  children: React.ReactNode;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'outline';
  disabled?: boolean;
  onClick?: () => void;
}

const Button: React.FC<ButtonProps> = ({
  children,
  type = 'button',
  variant = 'primary',
  disabled,
  onClick,
}) => {
  const baseStyles = 'px-4 py-2 rounded-md font-medium transition-all duration-200';
  const variantStyles =
    variant === 'primary'
      ? 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300'
      : 'border border-platinum-300 text-red-600 hover:bg-platinum-100 disabled:text-platinum-300';
      
  return (
    <button
      type={type}
      className={`${baseStyles} ${variantStyles}`}
      disabled={disabled}
      onClick={onClick}
      style={{ fontFamily: theme.fonts.primary }}
    >
      {children}
    </button>
  );
};

export default Button;