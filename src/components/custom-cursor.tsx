'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

type CursorState = 'default' | 'pointer' | 'text' | 'not-allowed' | 'grab' | 'grabbing';

export function CustomCursor() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [cursorState, setCursorState] = useState<CursorState>('default');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Hide default cursor globally
    document.body.style.cursor = 'none';
    
    // Show custom cursor when mouse enters viewport
    const handleMouseEnter = () => setIsVisible(true);
    const handleMouseLeave = () => setIsVisible(false);

    // Track mouse movement
    const moveCursor = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    // Detect cursor state based on element under cursor
    const handleMouseMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const computedStyle = window.getComputedStyle(target);
      const cursor = computedStyle.cursor;

      // Check for disabled elements
      if (target.hasAttribute('disabled') || target.closest('[disabled]')) {
        setCursorState('not-allowed');
      }
      // Check for text inputs
      else if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        cursor === 'text'
      ) {
        setCursorState('text');
      }
      // Check for clickable elements
      else if (
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.closest('button') ||
        target.closest('a') ||
        cursor === 'pointer'
      ) {
        setCursorState('pointer');
      }
      // Check for draggable elements
      else if (target.draggable || cursor === 'grab') {
        setCursorState('grab');
      }
      // Check if currently dragging
      else if (cursor === 'grabbing') {
        setCursorState('grabbing');
      }
      // Default state
      else {
        setCursorState('default');
      }
    };

    window.addEventListener('mousemove', moveCursor);
    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseenter', handleMouseEnter);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', moveCursor);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseenter', handleMouseEnter);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  if (!isVisible) return null;

  const renderCursor = () => {
    switch (cursorState) {
      case 'pointer':
        return (
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M12 2L15 10L12 18L9 10L12 2Z"
              fill="#2dd4bf"
              className="drop-shadow-[0_0_8px_rgba(45,212,191,0.8)]"
            />
            <circle cx="12" cy="19.5" r="2.5" stroke="#2dd4bf" strokeWidth="1.5" />
            <path d="M12 5V14" stroke="#0f172a" strokeWidth="1" strokeLinecap="round" />
            {/* Pointer indicator - small circle at tip */}
            <circle cx="12" cy="2" r="2" fill="#2dd4bf" />
          </svg>
        );

      case 'text':
        return (
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* I-beam cursor */}
            <rect x="11" y="4" width="2" height="16" fill="#2dd4bf" className="drop-shadow-[0_0_8px_rgba(45,212,191,0.8)]" />
            <rect x="8" y="6" width="8" height="1.5" fill="#2dd4bf" />
            <rect x="8" y="16.5" width="8" height="1.5" fill="#2dd4bf" />
          </svg>
        );

      case 'not-allowed':
        return (
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Kunai with X overlay */}
            <path
              d="M12 2L15 10L12 18L9 10L12 2Z"
              fill="#f43f5e"
              className="drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]"
            />
            <circle cx="12" cy="19.5" r="2.5" stroke="#f43f5e" strokeWidth="1.5" />
            {/* X mark */}
            <path
              d="M8 8L16 16M16 8L8 16"
              stroke="#0f172a"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        );

      case 'grab':
        return (
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Open hand */}
            <circle cx="12" cy="12" r="8" stroke="#2dd4bf" strokeWidth="2" fill="none" className="drop-shadow-[0_0_8px_rgba(45,212,191,0.8)]" />
            <circle cx="9" cy="9" r="1.5" fill="#2dd4bf" />
            <circle cx="12" cy="8" r="1.5" fill="#2dd4bf" />
            <circle cx="15" cy="9" r="1.5" fill="#2dd4bf" />
            <circle cx="9" cy="12" r="1.5" fill="#2dd4bf" />
            <circle cx="15" cy="12" r="1.5" fill="#2dd4bf" />
          </svg>
        );

      case 'grabbing':
        return (
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Closed hand */}
            <circle cx="12" cy="12" r="8" stroke="#2dd4bf" strokeWidth="2" fill="#2dd4bf" fillOpacity="0.2" className="drop-shadow-[0_0_8px_rgba(45,212,191,0.8)]" />
            <circle cx="9" cy="9" r="1.5" fill="#2dd4bf" />
            <circle cx="12" cy="8" r="1.5" fill="#2dd4bf" />
            <circle cx="15" cy="9" r="1.5" fill="#2dd4bf" />
            <circle cx="9" cy="12" r="1.5" fill="#2dd4bf" />
            <circle cx="15" cy="12" r="1.5" fill="#2dd4bf" />
          </svg>
        );

      default:
        return (
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M12 2L15 10L12 18L9 10L12 2Z"
              fill="#2dd4bf"
              className="drop-shadow-[0_0_8px_rgba(45,212,191,0.8)]"
            />
            <circle cx="12" cy="19.5" r="2.5" stroke="#2dd4bf" strokeWidth="1.5" />
            <path d="M12 5V14" stroke="#0f172a" strokeWidth="1" strokeLinecap="round" />
          </svg>
        );
    }
  };

  return (
    <motion.div
      className="fixed top-0 left-0 z-[9999] pointer-events-none mix-blend-difference"
      style={{
        x: position.x - 16, // Center the 32px cursor
        y: position.y - 16,
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.1 }}
    >
      {renderCursor()}
    </motion.div>
  );
}