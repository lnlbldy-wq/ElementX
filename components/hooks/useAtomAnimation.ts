
import React, { useState, useEffect, useRef } from 'react';
import type { Atom } from '../../types';

// Constants for physics simulation
const VELOCITY_DECAY = 0.98;
const PUSH_FORCE = 0.5;
const BOUNDARY_DAMPING = -0.7;

interface AnimatedAtom extends Atom {
  vx: number;
  vy: number;
}

export const useAtomAnimation = (
  initialAtoms: Atom[],
  canvasRef: React.RefObject<HTMLDivElement>,
  isPaused: boolean, // This is effectively 'isConverging' now
) => {
  const [animatedAtoms, setAnimatedAtoms] = useState<AnimatedAtom[]>([]);
  const animationFrameId = useRef<number | null>(null);

  useEffect(() => {
    setAnimatedAtoms(prevAtoms => {
      const newAtoms = initialAtoms.map(initialAtom => {
        const existing = prevAtoms.find(p => p.instanceId === initialAtom.instanceId);
        if (existing) {
          return existing;
        }
        return {
          ...initialAtom,
          x: initialAtom.x ?? 0,
          y: initialAtom.y ?? 0,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.5) * 4,
        };
      });
      return newAtoms.filter(a => initialAtoms.some(i => i.instanceId === a.instanceId));
    });
  }, [initialAtoms]);


  useEffect(() => {
    const animate = () => {
      if (!canvasRef.current) {
        animationFrameId.current = requestAnimationFrame(animate);
        return;
      }
      const { width: canvasWidth, height: canvasHeight } = canvasRef.current.getBoundingClientRect();

      setAnimatedAtoms(prevAtoms => {
        if (isPaused) {
            // When "paused" (or loading/analyzing), smoothly move atoms to form a cluster at the center
             return prevAtoms.map((atom, index) => {
                // Create a small offset based on index so they don't all stack on one pixel
                const angle = (index / prevAtoms.length) * 2 * Math.PI;
                const radius = 40; // Cluster radius
                const targetX = (canvasWidth / 2) + Math.cos(angle) * radius;
                const targetY = (canvasHeight / 2) + Math.sin(angle) * radius;
                
                // Stronger pull for convergence effect
                const newX = (atom.x ?? 0) + (targetX - (atom.x ?? 0)) * 0.08;
                const newY = (atom.y ?? 0) + (targetY - (atom.y ?? 0)) * 0.08;
                
                return {...atom, x: newX, y: newY, vx: 0, vy: 0};
            });
        }
        
        const newAtoms: AnimatedAtom[] = JSON.parse(JSON.stringify(prevAtoms));

        for (let i = 0; i < newAtoms.length; i++) {
          let atomA = newAtoms[i];

          // Boundary collision
          if ((atomA.x ?? 0) + atomA.radius > canvasWidth) {
            atomA.x = canvasWidth - atomA.radius;
            atomA.vx *= BOUNDARY_DAMPING;
          }
          if ((atomA.x ?? 0) - atomA.radius < 0) {
            atomA.x = atomA.radius;
            atomA.vx *= BOUNDARY_DAMPING;
          }
          if ((atomA.y ?? 0) + atomA.radius > canvasHeight) {
            atomA.y = canvasHeight - atomA.radius;
            atomA.vy *= BOUNDARY_DAMPING;
          }
          if ((atomA.y ?? 0) - atomA.radius < 0) {
            atomA.y = atomA.radius;
            atomA.vy *= BOUNDARY_DAMPING;
          }

          // Inter-atom collision
          for (let j = i + 1; j < newAtoms.length; j++) {
            let atomB = newAtoms[j];
            const dx = (atomB.x ?? 0) - (atomA.x ?? 0);
            const dy = (atomB.y ?? 0) - (atomA.y ?? 0);
            const distance = Math.sqrt(dx * dx + dy * dy);
            const minDistance = atomA.radius + atomB.radius;

            if (distance < minDistance) {
              const angle = Math.atan2(dy, dx);
              const overlap = minDistance - distance;
              const overlapX = (overlap / 2) * Math.cos(angle);
              const overlapY = (overlap / 2) * Math.sin(angle);

              atomA.x = (atomA.x ?? 0) - overlapX;
              atomA.y = (atomA.y ?? 0) - overlapY;
              atomB.x = (atomB.x ?? 0) + overlapX;
              atomB.y = (atomB.y ?? 0) + overlapY;
              
              const force = PUSH_FORCE;
              const forceX = force * Math.cos(angle);
              const forceY = force * Math.sin(angle);
              atomA.vx -= forceX;
              atomA.vy -= forceY;
              atomB.vx += forceX;
              atomB.vy += forceY;
            }
          }
          
          atomA.x = (atomA.x ?? 0) + atomA.vx;
          atomA.y = (atomA.y ?? 0) + atomA.vy;
          atomA.vx *= VELOCITY_DECAY;
          atomA.vy *= VELOCITY_DECAY;
        }

        return newAtoms;
      });

      animationFrameId.current = requestAnimationFrame(animate);
    };

    animationFrameId.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [isPaused, canvasRef]);

  return animatedAtoms.map(a => ({
      ...a,
      x: (a.x ?? 0) - a.radius,
      y: (a.y ?? 0) - a.radius,
  }));
};
