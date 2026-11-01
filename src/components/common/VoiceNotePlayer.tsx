import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, CheckCheck, Mic } from 'lucide-react';

interface VoiceNotePlayerProps {
  audioUrl?: string;
  duration?: string;
  /** Avatar URL for the sender — shown as the icon like WhatsApp */
  avatarUrl?: string;
  /** If true uses green WhatsApp palette, else uses dark WhatsApp fan palette */
  isOutgoing?: boolean;
  /** Message timestamp e.g. "10:45" */
  timestamp?: string;
  /** Status for double check mark */
  status?: 'sent' | 'delivered' | 'read' | string;
}

export const VoiceNotePlayer: React.FC<VoiceNotePlayerProps> = ({
  audioUrl,
  duration = '0:15',
  avatarUrl,
  isOutgoing = true,
  timestamp,
  status = 'read',
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTimeStr, setCurrentTimeStr] = useState('0:00');
  const [totalDurationStr, setTotalDurationStr] = useState(duration);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fmt = (sec: number) => {
    if (!sec || isNaN(sec) || !isFinite(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onMeta = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setTotalDurationStr(fmt(audio.duration));
      }
    };
    const onTime = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setProgress((audio.currentTime / audio.duration) * 100);
        setCurrentTimeStr(fmt(audio.currentTime));
      }
    };
    const onEnd = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTimeStr('0:00');
    };

    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnd);
    };
  }, [audioUrl]);

  // Simulate playback when no real audio
  useEffect(() => {
    if (audioUrl) return;
    let t: any;
    if (isPlaying) {
      t = setInterval(() => {
        setProgress(p => {
          if (p >= 100) { setIsPlaying(false); return 0; }
          return p + 4;
        });
      }, 100);
    }
    return () => clearInterval(t);
  }, [isPlaying, audioUrl]);

  const togglePlay = () => {
    if (audioRef.current && audioUrl) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(true));
      }
    } else {
      setIsPlaying(p => !p);
      if (progress >= 100) setProgress(0);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    setProgress(pct);
    if (audioRef.current?.duration && isFinite(audioRef.current.duration)) {
      audioRef.current.currentTime = (pct / 100) * audioRef.current.duration;
    }
  };

  // Organic waveform pattern matching WhatsApp
  const bars = [
    22, 35, 55, 80, 62, 40, 75, 95, 58, 45, 82, 90, 48, 70, 88, 52, 32,
    65, 92, 80, 46, 60, 85, 100, 72, 42, 28, 58, 78, 54, 38, 25, 50, 68,
  ];

  return (
    <div className="flex items-center gap-3 select-none py-0.5" style={{ minWidth: 240, maxWidth: 310 }}>
      {audioUrl && <audio ref={audioRef} src={audioUrl} preload="metadata" />}

      {/* Avatar / Mic circle like WhatsApp */}
      <div className="relative shrink-0">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Avatar"
            className="w-11 h-11 rounded-full object-cover border border-white/10"
          />
        ) : (
          <div className={`w-11 h-11 rounded-full flex items-center justify-center ${
            isOutgoing ? 'bg-emerald-600/50 text-emerald-200' : 'bg-slate-700 text-slate-300'
          }`}>
            <Mic className="w-5 h-5 text-emerald-300" />
          </div>
        )}
        <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#005c4b] flex items-center justify-center">
          <Mic className="w-2.5 h-2.5 text-white" />
        </span>
      </div>

      {/* Main player body: play button + waveform + bottom row (duration & timestamp) */}
      <div className="flex-1 min-w-0 flex flex-col justify-between gap-1">
        <div className="flex items-center gap-2">
          {/* Play / Pause button */}
          <button
            type="button"
            onClick={togglePlay}
            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 cursor-pointer transition-all active:scale-95 ${
              isOutgoing
                ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950'
                : 'bg-emerald-500 hover:bg-emerald-400 text-white'
            }`}
            aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          {/* Waveform bars */}
          <div
            className="flex-1 flex items-center gap-[2px] h-7 cursor-pointer px-1"
            onClick={handleSeek}
            title="Adelantar / Retroceder"
          >
            {bars.map((h, i) => {
              const filled = (i / bars.length) * 100 <= progress;
              return (
                <span
                  key={i}
                  className={`rounded-full transition-colors duration-75 ${
                    filled
                      ? isOutgoing ? 'bg-emerald-300' : 'bg-emerald-400'
                      : isOutgoing ? 'bg-emerald-700/60' : 'bg-slate-600/70'
                  }`}
                  style={{ width: 2.5, height: Math.max(4, (h / 100) * 24) }}
                />
              );
            })}
          </div>
        </div>

        {/* WhatsApp Footer: Duration on the left, Timestamp + Blue check on the right */}
        <div className="flex items-center justify-between px-1 text-[11px] text-white/80 font-sans">
          <span className="font-mono text-[10px] tracking-tight">
            {isPlaying ? currentTimeStr : totalDurationStr}
          </span>
          <div className="flex items-center gap-1 text-[10px] text-white/70">
            {timestamp && <span>{timestamp}</span>}
            {isOutgoing && (
              <CheckCheck
                className={`w-3.5 h-3.5 ${
                  status === 'read' ? 'text-sky-300' : 'text-white/60'
                }`}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
