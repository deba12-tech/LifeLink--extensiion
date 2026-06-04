// src/components/CategoryChart.tsx
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { DashboardData } from '../types/dashboard';

interface CategoryChartProps {
  data: DashboardData['categories'];
}

const COLORS = ['#A6C1EE', '#F7C5A0', '#B7E4C7', '#F1A1A8'];

const CategoryChart: React.FC<CategoryChartProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={80}
          paddingAngle={2}
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default CategoryChart;
