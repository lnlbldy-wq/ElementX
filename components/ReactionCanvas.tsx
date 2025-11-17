import React from 'react';
import type { Atom } from '../types';
import { AtomIcon } from './AtomIcon';
import { useAtomAnimation } from './hooks/useAtomAnimation';

interface ReactionCanvasProps {
  atoms: Atom[];
  isPaused: boolean;
  pauseText: string | null;
  canvasRef: React.RefObject<HTMLDivElement>;
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
}

export const ReactionCanvas: React.FC<ReactionCanvasProps> = ({
  atoms,
  isPaused,
  pauseText,
  canvasRef,
  onDrop,
  onDragOver,
}) => {
  const animatedAtoms = useAtomAnimation(atoms, canvasRef, isPaused);

  return (
    <div
      ref={canvasRef}
      onDrop={onDrop}
      onDragOver={onDragOver}
      className="flex-grow bg-slate-100 dark:bg-slate-800/50 relative overflow-hidden bg-grid dark:dark:bg-grid"
    >
      {animatedAtoms.map((atom) => (
        <div
          key={atom.instanceId}
          className="absolute"
          style={{
            left: `${atom.x}px`,
            top: `${atom.y}px`,
            transition: 'left 0.5s ease-out, top 0.5s ease-out',
          }}
        >
          <AtomIcon atom={atom} isAnimating={isPaused} />
        </div>
      ))}
       {isPaused && pauseText && atoms.length > 0 && (
         <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center bg-black/60 backdrop-blur-sm p-6 rounded-xl shadow-lg">
                <p className="text-2xl font-bold animate-pulse text-white">{pauseText}</p>
            </div>
         </div>
       )}
    </div>
  );
};