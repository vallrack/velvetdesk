import React from 'react';
import { FanTier } from '../../types';
import { Sparkles, ShoppingBag, Eye, AlertCircle } from 'lucide-react';

interface FanTierBadgeProps {
  tier: FanTier;
  size?: 'sm' | 'md';
}

export const FAN_TIER_CONFIG: Record<
  FanTier,
  { label: string; bg: string; text: string; border: string; icon: React.ComponentType<{ className?: string }> }
> = {
  vip: {
    label: 'VIP Whale ($250+)',
    bg: 'bg-amber-500/15',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    icon: Sparkles,
  },
  recurrente: {
    label: 'Comprador Recurrente',
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    icon: ShoppingBag,
  },
  curioso: {
    label: 'Curioso / Nuevo',
    bg: 'bg-blue-500/15',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
    icon: Eye,
  },
  tacano: {
    label: 'Tacaño / Free-rider',
    bg: 'bg-rose-500/15',
    text: 'text-rose-400',
    border: 'border-rose-500/30',
    icon: AlertCircle,
  },
};

export const FanTierBadge: React.FC<FanTierBadgeProps> = ({ tier, size = 'sm' }) => {
  const config = FAN_TIER_CONFIG[tier] || FAN_TIER_CONFIG.curioso;
  const Icon = config.icon;

  const sizeClass = size === 'sm' ? 'text-[11px] px-2 py-0.5 gap-1' : 'text-xs px-2.5 py-1 gap-1.5';
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-md border ${config.bg} ${config.text} ${config.border} ${sizeClass}`}
    >
      <Icon className={iconSize} />
      <span>{config.label}</span>
    </span>
  );
};
