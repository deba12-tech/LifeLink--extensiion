// src/components/StatsCard.tsx
import React from 'react';

interface StatsCardProps {
  title: string;
  value: string | number;
  Icon: React.ComponentType<{ className?: string }>;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, Icon }) => {
  return (
    <div className="glass flex flex-col items-center p-4">
      <Icon className="w-6 h-6 text-pastel-500 mb-2" />
      <p className="text-sm text-gray-600">{title}</p>
      <p className="text-xl font-medium text-gray-800">{value}</p>
    </div>
  );
};

export default StatsCard;
