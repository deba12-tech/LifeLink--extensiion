// src/components/Timeline.tsx
import React from 'react';
import { Clock } from 'lucide-react';
import { DashboardData } from '../types/dashboard';

interface TimelineProps {
  data: DashboardData['attentionFlow'];
}

const Timeline: React.FC<TimelineProps> = ({ data }) => {
  return (
    <div className="glass p-4">
      <h3 className="text-lg font-semibold mb-2 text-gray-800">Attention Flow</h3>
      <ul className="space-y-2">
        {data.map((item, idx) => (
          <li key={idx} className="flex items-center">
            <Clock className="w-5 h-5 text-pastel-500 mr-2 flex-shrink-0" />
            <span className="text-sm text-gray-600 mr-1">{item.time}</span>
            <span className="text-sm text-gray-800">{item.event}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Timeline;
