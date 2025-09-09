import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const Waveform = ({ src, wavesurferRef, onReady }) => {
  const containerRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#64748b',
      progressColor: '#0ea5e9',
      height: 100,
      responsive: true,
      url: src,
    });

    wavesurferRef.current = ws;

    ws.on('ready', () => {
      console.log('[WaveSurfer] Ready');
      onReady?.();
    });

    ws.on('audioprocess', () => {
      setCurrentTime(ws.getCurrentTime());
    });

    ws.on('seek', () => {
      setCurrentTime(ws.getCurrentTime());
    });

    ws.on('error', (e) => {
      console.error('[WaveSurfer] Error details:', e);
      // Try to provide more information about the error
      if (e.name === 'Error' && e.message.includes('load')) {
        console.error('[WaveSurfer] Failed to load audio. Source URL:', src);
      }
    });

    return () => ws.destroy();
  }, [src]);

  return (
    <div className="relative w-full">
      <div ref={containerRef} className="w-full rounded overflow-hidden" />
      <div className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-zinc-800 bg-opacity-70 px-2 py-1 rounded text-sm text-white z-10">
        {formatTime(currentTime)}
      </div>
    </div>
  );
};

export default Waveform;
