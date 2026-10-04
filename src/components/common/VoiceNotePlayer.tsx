import React, { useState, useEffect } from 'react';
import { Play, Pause, Mic } from 'lucide-react';

interface VoiceNotePlayerProps {
  duration?: string;
  isWhatsApp?: boolean;
}

export const VoiceNotePlayer: React.FC<VoiceNotePlayerProps> = ({
  duration = '00:42',
  isWhatsApp = true,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let timer: any;
    if (isPlaying) {
      timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 3;
        });
      }, 100);
    }
    return () => clearInterval(timer);
  }, [isPlaying]);

  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      if (progress >= 100) setProgress(0);
    }
  };

  // Generate faux waveform bars
  const bars = [
    25, 45, 80, 55, 30, 70, 95, 60, 40, 75, 90, 85, 40, 65, 80, 50, 30, 60, 90,
    75, 45, 60, 85, 100, 70, 40, 25, 60, 80, 55, 35, 20,
  ];

  return (
    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/50 max-w-sm">
      <button
        onClick={togglePlay}
        className={`w-9 h-9 rounded-full flex items-center justify-center transition-transform active:scale-95 cursor-pointer ${
          isWhatsApp
            ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
            : 'bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-600/20'
        }`}
      >
        {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
      </button>

      <div className="flex-1">
        <div className="flex items-center gap-[2px] h-7 cursor-pointer" onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const newPct = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
          setProgress(newPct);
        }}>
          {bars.map((height, idx) => {
            const barPct = (idx / bars.length) * 100;
            const isFilled = barPct <= progress;
            return (
              <span
                key={idx}
                className={`w-[3px] rounded-full transition-colors ${
                  isFilled
                    ? isWhatsApp ? 'bg-emerald-400' : 'bg-violet-400'
                    : 'bg-slate-700'
                }`}
                style={{ height: `${Math.max(15, (height * 24) / 100)}px` }}
              />
            );
          })}
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
          <span className="flex items-center gap-1 font-mono">
            <Mic className="w-3 h-3 text-emerald-400" />
            {isPlaying ? `${Math.floor((progress / 100) * 42)}s` : duration}
          </span>
          <span className="text-[10px] text-emerald-400/90 font-medium">Nota de voz</span>
        </div>
      </div>
    </div>
  );
};
