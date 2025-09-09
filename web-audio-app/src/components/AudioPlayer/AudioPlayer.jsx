import React, { useRef, useState, useEffect } from 'react';
import { parseBlob } from 'music-metadata';
import { Upload } from 'lucide-react';
import AudioControls from './AudioControls';
import TrackInfo from './TrackInfo';
import Waveform from './Waveform';
import VolumeSlider from './VolumeSlider';
import VisualizerBars from './VisualizerBars';
import AnimationStyleDropdown from './AnimationStyleDropdown';
import { trackEvent } from '../../utils/analytics'; // Import trackEvent function

const AudioPlayer = () => {
  const wavesurferRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isWaveReady, setIsWaveReady] = useState(false);
  const [volume, setVolume] = useState(1);
  const [animationStyle, setAnimationStyle] = useState('wave');
  const [dragging, setDragging] = useState(false);
  const [audioSrc, setAudioSrc] = useState(import.meta.env.BASE_URL + 'example.mp3');
  const [duration, setDuration] = useState(0);

  const [metadata, setMetadata] = useState({
    title: 'Neuro Pulse',
    artist: 'You',
    album: '',
    picture: null,
  });

  const handleAudioLoad = (file) => {
    if (!file) return;

    // Track audio load event
    trackEvent('audio_load', {
      file_type: file.type,
      file_size: Math.round(file.size / 1024), // Size in KB
      file_name: file.name // This could be personally identifiable, use with caution
    });

    // Create object URL for the file
    const objectUrl = URL.createObjectURL(file);
    setAudioSrc(objectUrl);
    setIsWaveReady(false);

    // Clean up previous wavesurfer instance if needed
    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
      wavesurferRef.current = null;
    }

    // Extract metadata
    const fetchMetadata = async () => {
      try {
        const meta = await parseBlob(file);

        const pictureData = meta.common.picture?.[0];
        const pictureUrl = pictureData
          ? URL.createObjectURL(new Blob([pictureData.data]))
          : null;

        setMetadata({
          title: meta.common.title || file.name || 'Unknown Title',
          artist: meta.common.artist || 'Unknown Artist',
          album: meta.common.album || '',
          picture: pictureUrl,
        });
      } catch (err) {
        console.error('Failed to extract metadata:', err);
        setMetadata({
          title: file.name || 'Unknown Title',
          artist: 'Unknown Artist',
          album: '',
          picture: null,
        });
      }
    };

    fetchMetadata();
  };

  // Drag and drop handling
  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type.includes('audio/')) {
      handleAudioLoad(file);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.includes('audio/')) {
      handleAudioLoad(file);
    }
  };

  useEffect(() => {
    if (!audioSrc.startsWith('blob:')) {
      const fetchMetadata = async () => {
        try {
          const response = await fetch(audioSrc);
          const blob = await response.blob();
          const meta = await parseBlob(blob);

          const pictureData = meta.common.picture?.[0];
          const pictureUrl = pictureData
            ? URL.createObjectURL(new Blob([pictureData.data]))
            : null;

          setMetadata({
            title: meta.common.title || 'Unknown Title',
            artist: meta.common.artist || 'Unknown Artist',
            album: meta.common.album || '',
            picture: pictureUrl,
          });
        } catch (err) {
          console.error('Failed to extract metadata:', err);
        }
      };

      fetchMetadata();
    }

    // Clean up object URLs when component unmounts
    return () => {
      if (audioSrc.startsWith('blob:')) {
        URL.revokeObjectURL(audioSrc);
      }
      if (metadata.picture?.startsWith('blob:')) {
        URL.revokeObjectURL(metadata.picture);
      }
    };
  }, [audioSrc]);

  useEffect(() => {
    const handleReady = () => {
      if (wavesurferRef.current) {
        setDuration(wavesurferRef.current.getDuration());
      }
    };

    if (wavesurferRef.current) {
      wavesurferRef.current.on('ready', handleReady);
      
      // If wavesurfer is already ready, get the duration immediately
      if (wavesurferRef.current.isReady) {
        handleReady();
      }
    }

    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.un('ready', handleReady);
      }
    };
  }, [wavesurferRef.current]);

  // Toggle play state
  const togglePlay = async () => {
    const ws = wavesurferRef.current;

    if (ws && isWaveReady) {
      try {
        const audioContext = ws.getAudioContext?.() || ws.backend?.ac;
        if (audioContext?.state === 'suspended') {
          await audioContext.resume();
        }
      } catch (err) {
        console.error('AudioContext resume error:', err);
      }

      ws.playPause();
      const isNowPlaying = ws.isPlaying();
      setIsPlaying(isNowPlaying);

      // Track play/pause events
      trackEvent(isNowPlaying ? 'audio_play' : 'audio_pause', {
        title: metadata.title,
        current_time: Math.round(ws.getCurrentTime()),
        duration: Math.round(ws.getDuration())
      });
    }
  };

  const handleVolumeChange = (val) => {
    setVolume(val);
    if (wavesurferRef.current) {
      wavesurferRef.current.setVolume(val);

      // Only track significant volume changes to avoid too many events
      if (Math.abs(val - volume) > 0.1) {
        trackEvent('volume_change', {
          value: Math.round(val * 10) / 10 // Round to 1 decimal place
        });
      }
    }
  };

  const handleSeekForward = () => {
    const ws = wavesurferRef.current;
    if (ws && isWaveReady) {
      const newTime = ws.getCurrentTime() + 10;
      // Clamp to waveform duration (between 0 and 1)
      ws.seekTo(Math.min(newTime / ws.getDuration(), 1));
    }
  };

  const handleSeekBackward = () => {
    const ws = wavesurferRef.current;
    if (ws && isWaveReady) {
      const newTime = ws.getCurrentTime() - 10;
      // Clamp to waveform duration (between 0 and 1)
      ws.seekTo(Math.max(newTime / ws.getDuration(), 0));
    }
  };

  // Handle visualization style change
  const handleStyleChange = (newStyle) => {
    setAnimationStyle(newStyle);

    // Track visualization style change
    trackEvent('visualization_change', {
      from: animationStyle,
      to: newStyle
    });
  };

  return (
    <div
      className={`w-full max-w-4xl mx-auto mt-10 p-3 sm:p-6 rounded-xl bg-zinc-900 text-white space-y-6 sm:space-y-8 shadow-lg transition-colors ${dragging ? 'bg-zinc-800 border-2 border-dashed border-cyan-400' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex justify-between items-center">
        <TrackInfo metadata={metadata} duration={duration} />

        <label className="cursor-pointer p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 transition-colors text-white flex items-center justify-center" title="Load Audio">
          <Upload size={20} />
          <input type="file" accept="audio/*" className="hidden" onChange={handleFileChange} />
        </label>
      </div>

      <Waveform
        src={audioSrc}
        wavesurferRef={wavesurferRef}
        onReady={() => setIsWaveReady(true)}
      />

      {/* Only render the visualizer and controls when audio is ready */}
      {isWaveReady && (
        <>
          <VisualizerBars
            wavesurferRef={wavesurferRef}
            animationStyle={animationStyle}
          />

          <div className="flex flex-col gap-3 sm:gap-4 pt-1 px-1 sm:pt-2 md:px-6">
            {/* Container that changes based on screen size */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-3 sm:gap-4">
              {/* Animation style dropdown - visible on desktop (left side) */}
              <div className="hidden sm:block sm:w-40">
                <AnimationStyleDropdown
                  style={animationStyle}
                  onChange={handleStyleChange}
                  label="Style"
                />
              </div>
              
              {/* For mobile: Horizontal container with centered play controls */}
              <div className="flex flex-row items-center justify-center w-full sm:hidden">
                <AudioControls 
                  isPlaying={isPlaying}
                  onPlayPause={togglePlay}
                  onSeekForward={handleSeekForward}
                  onSeekBackward={handleSeekBackward}
                />
              </div>
              
              {/* For desktop: Play controls (center) */}
              <div className="hidden sm:flex justify-center w-full pr-[50px]">
                <AudioControls 
                  isPlaying={isPlaying}
                  onPlayPause={togglePlay}
                  onSeekForward={handleSeekForward}
                  onSeekBackward={handleSeekBackward}
                />
              </div>
              
              {/* For desktop: Volume control (right) */}
              <div className="hidden sm:flex items-center justify-end sm:w-auto">
                <VolumeSlider volume={volume} onChange={handleVolumeChange} />
              </div>
              
              {/* For mobile: Volume control below play controls */}
              <div className="flex sm:hidden items-center justify-end w-full">
                <VolumeSlider volume={volume} onChange={handleVolumeChange} />
              </div>
              
              {/* Animation style dropdown – full-width on mobile */}
              <div className="sm:hidden w-full px-4 mt-2">
                <AnimationStyleDropdown
                  style={animationStyle}
                  onChange={handleStyleChange}
                  label="Style"
                />
              </div>
            </div>
          </div>
        </>
      )}

      {!isWaveReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 bg-opacity-80 backdrop-blur-sm rounded-xl z-10 transition-all duration-300 animate-fadein">
          <div className="flex flex-col items-center space-y-4 p-6 bg-zinc-800 rounded-lg shadow-xl border border-zinc-700">
            <div className="flex items-end h-12 space-x-1">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="w-2 bg-cyan-500 rounded-full animate-pulse"
                  style={{
                    height: `${Math.random() * 100}%`,
                    animationDelay: `${i * 0.1}s`,
                    animationDuration: '0.8s',
                  }}
                ></div>
              ))}
            </div>
            <div className="text-white text-lg font-medium">Loading audio...</div>
            <div className="text-zinc-400 text-sm">{metadata.title || 'Preparing your track'}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AudioPlayer;