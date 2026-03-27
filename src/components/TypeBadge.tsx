import React from 'react';
import { TYPE_COLORS } from '../constants';
import { cn } from '../lib/utils';

interface TypeBadgeProps {
  type: string;
  className?: string;
}

export const TypeBadge: React.FC<TypeBadgeProps> = ({ type, className }) => {
  return (
    <span
      className={cn(
        'px-2 py-0.5 rounded text-[10px] uppercase font-bold text-white tracking-wider',
        TYPE_COLORS[type] || 'bg-slate-500',
        className
      )}
    >
      {type}
    </span>
  );
};
