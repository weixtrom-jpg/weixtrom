import { type ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddings = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export function Card({ children, className = '', padding = 'md' }: CardProps) {
  return (
    <div
      className={`
        bg-white rounded-card
        border border-surface-border
        shadow-[0_0_12px_rgba(0,0,0,0.04)]
        hover:shadow-[0_-2px_12px_rgba(0,0,0,0.08)]
        transition-shadow duration-200
        ${paddings[padding]}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
