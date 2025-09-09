import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

const AnimationStyleDropdown = ({ style, onChange, label = 'Style' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const styles = [
    { id: 'simple', name: 'Bars' },
    { id: 'minimal', name: 'Line' },
    { id: 'wave', name: 'Wave' }
  ];

  useEffect(() => {
    // Check if we're on mobile
    const checkMobile = () => {
      setIsMobile(window.matchMedia('(max-width: 640px)').matches);
    };
    
    // Initial check
    checkMobile();
    
    // Listen for resize events
    window.addEventListener('resize', checkMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const selectedStyle = styles.find(s => s.id === style) || styles[0];

  const handleSelect = (styleId) => {
    onChange(styleId);
    setIsOpen(false);
  };

  return (
    <div className="relative z-20">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-3 py-2 text-sm bg-zinc-800 rounded-md"
      >
        <span className="text-zinc-400">{label}:</span>
        <div className="flex items-center">
          <span className="mr-2 text-white">{selectedStyle.name}</span>
          <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && (
        <div className={
          isMobile
            ? 'fixed inset-x-0 bottom-0 bg-zinc-900 rounded-t-lg p-4 z-40'
            : 'absolute top-full left-0 mt-1 w-full bg-zinc-800 rounded-md shadow-lg py-1 z-30 border border-zinc-700'
        }>
          {isMobile && (
            <div className="flex justify-end mb-2">
              <button onClick={() => setIsOpen(false)} className="text-white text-sm">Close</button>
            </div>
          )}
          {styles.map((styleOption) => (
            <button
              key={styleOption.id}
              className={
                `block w-full text-left px-4 py-3 ${isMobile ? 'text-base' : 'text-sm'} hover:bg-zinc-700 rounded ${
                  styleOption.id === style
                    ? 'bg-zinc-700 text-cyan-400'
                    : 'text-white'
                }`
              }
              onClick={() => handleSelect(styleOption.id)}
            >
              {styleOption.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AnimationStyleDropdown;