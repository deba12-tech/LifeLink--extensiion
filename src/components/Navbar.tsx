// src/components/Navbar.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { LifeBuoy } from 'lucide-react'; // placeholder icon

const Navbar: React.FC = () => {
  return (
    <nav className="flex items-center justify-between py-4 px-6">
      <div className="flex items-center space-x-2">
        <LifeBuoy className="w-6 h-6 text-pastel-500" />
        <span className="text-xl font-semibold text-gray-800">LifeLink</span>
      </div>
      <div className="space-x-4">
        <Link to="/dashboard" className="text-gray-600 hover:text-gray-800">Dashboard</Link>
        <Link to="/settings" className="text-gray-600 hover:text-gray-800">Settings</Link>
      </div>
    </nav>
  );
};

export default Navbar;
