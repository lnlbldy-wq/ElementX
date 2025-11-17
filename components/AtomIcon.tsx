
import React from 'react';
import type { Atom } from '../types';

interface AtomIconProps {
  atom: Atom;
  isAnimating?: boolean;
}

export const AtomIcon: React.FC<AtomIconProps> = ({ atom, isAnimating = false }) => {
  const size = atom.radius * 2;
  const animationClass = isAnimating ? 'animate-pulse' : '';
  
  return (
    <div
      className={`rounded-full flex items-center justify-center shadow-lg relative ${atom.color} ${animationClass}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
      }}
    >
      {/* Inner shadow for 3D effect */}
      <div className="absolute inset-0 rounded-full" style={{ boxShadow: 'inset 0px 3px 8px rgba(0,0,0,0.3)' }}></div>

      {/* Glossy highlight */}
      <div 
        className="absolute top-0 left-0 w-full h-full rounded-full"
        style={{
          background: 'radial-gradient(circle at 50% 30%, rgba(255,255,255,0.5), transparent 70%)'
        }}
      ></div>

      <span
        className={`relative font-bold text-center select-none leading-none ${atom.textColor}`}
        style={{
          fontSize: `${atom.radius * 0.6}px`,
          textShadow: '0px 1px 3px rgba(0,0,0,0.4)'
        }}
      >
        {atom.symbol}
      </span>
    </div>
  );
};
