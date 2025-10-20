'use client';

import React from 'react';
import { theme } from '@theme';

interface InputProps {
  label: string;
  name: string;
  type: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  placeholder?: string;
}

const Input: React.FC<InputProps> = ({
  label,
  name,
  type,
  value,
  onChange,
  required,
  placeholder,
}) => {
  return (
    <div className="flex flex-col">
      <label
        htmlFor={name}
        className="text-sm font-medium text-platinum-600"
      >
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        className="mt-1 p-2 border border-platinum-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
        style={{ fontFamily: theme.fonts.primary }}
      />
    </div>
  );
};

export default Input;
