import { Play, Pause, RotateCcw, RotateCw } from 'lucide-react';

const AudioControls = ({ isPlaying, onPlayPause, onSeekBackward, onSeekForward }) => (
  <div className="flex items-center gap-4">
    <button onClick={onSeekBackward} className="p-2 bg-zinc-800 rounded-full hover:bg-zinc-700">
      <RotateCcw size={20} />
    </button>

    <button onClick={onPlayPause} className="p-3 bg-zinc-800 rounded-full hover:bg-zinc-700">
      {isPlaying ? <Pause size={24} /> : <Play size={24} />}
    </button>

    <button onClick={onSeekForward} className="p-2 bg-zinc-800 rounded-full hover:bg-zinc-700">
      <RotateCw size={20} />
    </button>
  </div>
);

export default AudioControls;
