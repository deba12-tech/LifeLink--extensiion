// src/components/ScoreCard.tsx
import React from 'react';
import { Trophy } from 'lucide-react';

interface ScoreCardProps {
  score: number;
}

const ScoreCard: React.FC<ScoreCardProps> = ({ score }) => {
  return (
    <div className="glass flex items-center space-x-4 p-6">
      <Trophy className="w-12 h-12 text-pastel-500" />
      <div>
        <p className="text-sm text-gray-600">Focus Score</p>
        <p className="text-3xl font-bold text-gray-800">{score}</p>
      </div>
    </div>
  );
};

export default ScoreCard;
