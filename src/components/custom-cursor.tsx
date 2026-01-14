'use client';

import { useEffect, useState } from 'react';
// Asegúrate de tener framer-motion instalado
import { motion, useMotionValue, useSpring } from 'framer-motion';

export function CustomCursor() {
  // Posición del mouse
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Física "Líquida" (Spring physics)
  // damping: controla el rebote (más alto = menos rebote)
  // stiffness: controla la rigidez (más alto = sigue más rápido al mouse)
  const springConfig = { damping: 25, stiffness: 400 };
  const cursorX = useSpring(mouseX, springConfig);
  const cursorY = useSpring(mouseY, springConfig);

  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    // 1. Rastrear movimiento del mouse
    const moveCursor = (e: MouseEvent) => {
      mouseX.set(e.clientX - 16); // -16 para centrar el icono
      mouseY.set(e.clientY - 16);
    };

    // 2. Detectar si estamos sobre un elemento clicable
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Detectamos botones, enlaces o elementos con cursor-pointer
      if (
        target.tagName === 'BUTTON' || 
        target.tagName === 'A' || 
        target.closest('button') || 
        target.closest('a') ||
        window.getComputedStyle(target).cursor === 'pointer'
      ) {
        setIsHovering(true);
      } else {
        setIsHovering(false);
      }
    };

    window.addEventListener('mousemove', moveCursor);
    window.addEventListener('mouseover', handleMouseOver);

    return () => {
      window.removeEventListener('mousemove', moveCursor);
      window.removeEventListener('mouseover', handleMouseOver);
    };
  }, [mouseX, mouseY]);

  return (
    <motion.div
      className="fixed top-0 left-0 z-[9999] pointer-events-none mix-blend-difference"
      style={{
        x: cursorX,
        y: cursorY,
      }}
    >
      {/* EL KUNAI (SVG) */}
      <motion.div
        animate={{
          scale: isHovering ? 1.5 : 1, // Se agranda al hacer hover
          rotate: isHovering ? 45 : 0, // Gira un poco al hacer hover
        }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        {/* SVG Dibujado a mano del Kunai */}
        <svg 
          width="32" 
          height="32" 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-[0_0_8px_rgba(45,212,191,0.8)]" // Sombra Cian Neon
        >
           {/* Hoja del Kunai */}
           <path 
             d="M12 2L15 10L12 18L9 10L12 2Z" 
             fill="#2dd4bf" // Color Kiriko Teal
           />
           {/* Mango/Anillo */}
           <circle cx="12" cy="19.5" r="2.5" stroke="#2dd4bf" strokeWidth="1.5" />
           {/* Detalle central */}
           <path d="M12 5V14" stroke="#0f172a" strokeWidth="1" strokeLinecap="round" />
        </svg>
      </motion.div>
    </motion.div>
  );
}