import React from 'react';

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const TrackInfo = ({ metadata, duration = 0 }) => {
  const { title, artist, album, picture } = metadata;

  return (
    <div className="flex items-center space-x-4">
      {picture ? (
        <img
          src={picture}
          alt="Album Cover"
          className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg shadow-md object-cover"
        />
      ) : (
        <div className="w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center rounded-lg shadow-md bg-zinc-800 text-sm text-zinc-400">
          No Cover Art
        </div>
      )}

      <div>
        <h2 className="text-xl font-semibold">{title || 'Unknown Title'}</h2>
        <p className="text-sm text-gray-400">{artist || 'Unknown Artist'}</p>
        <div className="flex items-center gap-2">
          <p className="text-sm text-gray-600">{album || 'Unknown Album'}</p>
          {duration > 0 && (
            <>
              <span className="text-xs text-gray-500">•</span>
              <p className="text-sm text-gray-500">{formatTime(duration)}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrackInfo;
