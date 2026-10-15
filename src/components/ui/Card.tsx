import React from 'react';
import { twMerge } from 'tailwind-merge';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
  heavy?: boolean;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className, 
  glass = true, 
  heavy = false, 
  ...props 
}) => {
  return (
    <div
      className={twMerge(
        "rounded-2xl transition-all duration-300 bg-white shadow-xs border border-slate-200/90 hover:border-slate-300",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
