// src/components/ContinueCard.tsx
import React from 'react';
import { BookOpen } from 'lucide-react';
import { DashboardData } from '../types/dashboard';

interface ContinueCardProps {
  data: DashboardData['continue'];
}

const ContinueCard: React.FC<ContinueCardProps> = ({ data }) => {
  return (
    <div className="glass flex items-center space-x-4 p-4">
      <BookOpen className="w-8 h-8 text-pastel-500" />
      <div>
        <p className="text-sm text-gray-600">{data.title}</p>
        {/* Placeholder thumbnail */}
        <div className="mt-2 w-20 h-12 bg-white/20 rounded" />
      </div>
    </div>
  );
};

export default ContinueCard;
