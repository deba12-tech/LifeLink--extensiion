// src/components/IntelligenceCard.tsx
import React from 'react';
import { Brain } from 'lucide-react';
import { DashboardData } from '../types/dashboard';

interface IntelligenceCardProps {
  data: DashboardData['intelligence'];
}

const IntelligenceCard: React.FC<IntelligenceCardProps> = ({ data }) => {
  return (
    <div className="glass flex items-center space-x-4 p-4">
      <Brain className="w-8 h-8 text-pastel-500" />
      <div>
        <p className="text-sm text-gray-600">Tab Intelligence</p>
        <p className="text-md font-medium text-gray-800">{data.summary}</p>
      </div>
    </div>
  );
};

export default IntelligenceCard;
