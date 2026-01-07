'use client';

import { useEffect, useState } from 'react';

export function SakuraBackground() {
  // Usamos 'mounted' para evitar errores de hidratación entre servidor/cliente
  const [mounted, setMounted] = useState(false);
  const [petals, setPetals] = useState<Array<{ id: number; left: string; animationDuration: string; delay: string }>>([]);

  useEffect(() => {
    setMounted(true);
    // Generamos 15 pétalos con propiedades aleatorias
    const newPetals = Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      animationDuration: `${Math.random() * 10 + 15}s`, // Caída lenta (15-25s)
      delay: `${Math.random() * 10}s`,
    }));
    setPetals(newPetals);
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {petals.map((petal) => (
        <div
          key={petal.id}
          // Forma de pétalo: esquinas redondeadas opuestas
          className="absolute -top-10 w-3 h-4 bg-gradient-to-br from-kiriko-teal/30 to-purple-500/20 rounded-tl-none rounded-br-none rounded-tr-xl rounded-bl-xl blur-[1px] animate-fall"
          style={{
            left: petal.left,
            animationDuration: petal.animationDuration,
            animationDelay: petal.delay,
          }}
        />
      ))}
      
      <style jsx global>{`
        @keyframes fall {
          0% {
            transform: translateY(-10vh) rotate(0deg) translateX(0);
            opacity: 0;
          }
          20% {
            opacity: 0.6; /* Aparecen suavemente */
            transform: translateY(20vh) rotate(45deg) translateX(20px);
          }
          100% {
            transform: translateY(110vh) rotate(360deg) translateX(-20px);
            opacity: 0;
          }
        }
        .animate-fall {
          animation-name: fall;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
      `}</style>
    </div>
  );
}