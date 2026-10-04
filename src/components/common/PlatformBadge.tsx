import React from 'react';
import { PlatformId } from '../../types';
import { Send, MessageCircle, Flame, Film, PlaySquare, Radio, Crown } from 'lucide-react';

interface PlatformBadgeProps {
  platform: PlatformId;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const PLATFORM_CONFIG: Record<
  PlatformId,
  { name: string; color: string; bg: string; border: string; icon: React.ComponentType<{ className?: string }> }
> = {
  fansly: {
    name: 'Fansly',
    color: '#00aff0',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
    icon: Flame,
  },
  telegram: {
    name: 'Telegram',
    color: '#229ed9',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/30',
    icon: Send,
  },
  manyvids: {
    name: 'ManyVids',
    color: '#e91e63',
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/30',
    icon: Film,
  },
  whatsapp: {
    name: 'WhatsApp',
    color: '#25d366',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    icon: MessageCircle,
  },
  pornhub: {
    name: 'Pornhub',
    color: '#ff9900',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    icon: PlaySquare,
  },
  scatbook: {
    name: 'Scatbook',
    color: '#8b5cf6',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    icon: Radio,
  },
  vipweb: {
    name: 'VIPweb',
    color: '#eab308',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    icon: Crown,
  },
};

export const PlatformBadge: React.FC<PlatformBadgeProps> = ({
  platform,
  size = 'md',
  showLabel = true,
}) => {
  const config = PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.fansly;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  }[size];

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  }[size];

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border transition-all ${config.bg} ${config.border} ${sizeClasses}`}
      style={{ color: config.color }}
    >
      <Icon className={iconSizes} />
      {showLabel && <span>{config.name}</span>}
    </span>
  );
};
