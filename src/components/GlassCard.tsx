// src/components/GlassCard.tsx
import React, { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
}

const GlassCard: React.FC<GlassCardProps> = ({ children, className = '' }) => {
  return (
    <div className={`glass p-4 ${className}`}>
      {children}
    </div>
  );
};

export default GlassCard;
