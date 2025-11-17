import React from 'react';
import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

export const Header: React.FC<HeaderProps> = ({ theme, setTheme }) => {
  return (
    <header className="bg-white/80 dark:bg-gray-900/50 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 p-4 shadow-lg flex items-center justify-between z-20">
      <div className="flex items-center gap-3">
        <div className="text-2xl">🔬</div>
        <h1 className="text-xl font-bold text-cyan-600 dark:text-cyan-300 tracking-wider">
          مستكشف الكيمياء الشامل
        </h1>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-sm text-slate-500 dark:text-slate-400 hidden sm:block">
          بناء بواسطة لانا البلادي
        </div>
        <ThemeToggle theme={theme} setTheme={setTheme} />
      </div>
    </header>
  );
};
