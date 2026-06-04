// src/components/ReceiptCard.tsx
import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { DashboardData } from '../types/dashboard';

interface ReceiptCardProps {
  data: DashboardData['receipt'];
}

const ReceiptCard: React.FC<ReceiptCardProps> = ({ data }) => {
  const Icon = ShoppingBag; // using generic icon, could map based on data.icon
  return (
    <div className="glass flex items-center space-x-4 p-4">
      <Icon className="w-8 h-8 text-pastel-500" />
      <div>
        <p className="text-sm text-gray-600">{data.site} receipt</p>
        <p className="text-lg font-medium text-gray-800">{data.amount}</p>
        <p className="text-xs text-gray-500">{data.date}</p>
      </div>
    </div>
  );
};

export default ReceiptCard;
