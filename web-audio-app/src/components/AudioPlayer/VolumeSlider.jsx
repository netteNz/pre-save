// src/components/AudioPlayer/VolumeSlider.jsx

import React, { useState, useEffect, useRef } from 'react';
import { Volume, Volume1, Volume2, VolumeX } from 'lucide-react';

const VolumeSlider = ({ volume, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const sliderRef = useRef(null);
  const timeoutRef = useRef(null);
  const isMobileRef = useRef(false);
  const previousVolumeRef = useRef(1); // Store previous volume level
  
  // Choose appropriate volume icon based on level
  const getVolumeIcon = () => {
    if (volume === 0) return <VolumeX size={20} />;
    if (volume < 0.3) return <Volume size={20} />;
    if (volume < 0.7) return <Volume1 size={20} />;
    return <Volume2 size={20} />;
  };

  // Update previousVolume whenever volume changes (but not to zero)
  useEffect(() => {
    if (volume > 0) {
      previousVolumeRef.current = volume;
    }
  }, [volume]);

  // Start auto-hide timer
  const startAutoHideTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 3000);
  };

  // Handle button click based on device and current state
  const handleVolumeButtonClick = (e) => {
    // Prevent default to ensure we control behavior fully
    e.preventDefault();
    
    // If the slider is already open, toggle mute
    if (isOpen) {
      // If currently muted, restore to previous volume instead of max
      if (volume === 0) {
        onChange(previousVolumeRef.current);
      } else {
        onChange(0); // Mute
      }
      startAutoHideTimer();
    } else {
      // Just open the slider on first click
      setIsOpen(true);
      startAutoHideTimer();
    }
  };

  // Reset timer when user interacts with slider
  const handleSliderInteraction = () => {
    if (isOpen) {
      startAutoHideTimer();
    }
  };

  // Detect touch device on mount
  useEffect(() => {
    isMobileRef.current = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }, []);

  // Handle click outside to close the slider
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sliderRef.current && !sliderRef.current.contains(event.target)) {
        setIsOpen(false);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="relative flex items-center" ref={sliderRef}>
      {/* Volume icon button */}
      <button 
        onClick={handleVolumeButtonClick}
        onMouseEnter={() => {
          if (!isMobileRef.current) {
            setIsOpen(true);
            startAutoHideTimer();
          }
        }}
        className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-full z-10"
      >
        {getVolumeIcon()}
      </button>

      {/* Vertical slider */}
      <div 
        onMouseMove={handleSliderInteraction}
        onTouchMove={handleSliderInteraction}
        className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-zinc-800 p-3 rounded-lg transition-all duration-200 ${
          isOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
        }`}
      >
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={(e) => {
            onChange(parseFloat(e.target.value));
            handleSliderInteraction();
          }}
          className="h-24 appearance-none bg-gray-700 rounded-lg cursor-pointer accent-cyan-500"
          style={{
            writingMode: 'bt-lr',
            WebkitAppearance: 'slider-vertical',
            width: '8px',
            padding: '0 5px'
          }}
          orient="vertical"
        />
      </div>
    </div>
  );
};

export default VolumeSlider;
