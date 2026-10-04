import React from 'react';
import {
  Sparkles,
  Bot,
  PlayCircle,
  TrendingUp,
  Radio,
  Wifi,
  DollarSign,
  Bell,
} from 'lucide-react';
import { ChannelIntegration } from '../../types';
import { PlatformBadge } from '../common/PlatformBadge';

interface NavbarProps {
  channels: ChannelIntegration[];
  isGlobalBotActive: boolean;
  onToggleGlobalBot: () => void;
  onOpenSimulateModal: () => void;
  todayTotalRevenue: number;
  unreadCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  channels,
  isGlobalBotActive,
  onToggleGlobalBot,
  onOpenSimulateModal,
  todayTotalRevenue,
  unreadCount,
}) => {
  return (
    <header className="h-16 border-b border-slate-800 bg-slate-950 px-6 flex items-center justify-between shrink-0 z-30">
      {/* Brand & Status */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-pink-500/20">
            <Sparkles className="w-5 h-5 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-white text-base tracking-tight font-sans">
                Velvet<span className="text-pink-500">Desk</span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-pink-500/10 text-pink-400 border border-pink-500/20">
                Creator Suite
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">Omnichannel Bot & CRM</p>
          </div>
        </div>

        {/* 7 Channel Status Indicators */}
        <div className="hidden xl:flex items-center gap-1.5 bg-slate-900/80 border border-slate-800 p-1 rounded-xl">
          {channels.map((ch) => (
            <div
              key={ch.id}
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono text-slate-300"
              title={`${ch.name}: ${ch.status}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>{ch.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Simulate Incoming Message Button */}
        <button
          onClick={onOpenSimulateModal}
          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-pink-600/20 cursor-pointer transition-all active:scale-95"
          title="Probar llegada de mensaje en cualquiera de los 7 canales"
        >
          <PlayCircle className="w-4 h-4 fill-current" />
          <span className="hidden sm:inline">Simular Mensaje Entrante</span>
        </button>

        {/* Master Bot Switch */}
        <button
          onClick={onToggleGlobalBot}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all cursor-pointer ${
            isGlobalBotActive
              ? 'bg-pink-950/40 border-pink-500/40 text-pink-300'
              : 'bg-slate-900 border-slate-800 text-slate-500'
          }`}
          title="Interruptor maestro del bot para todos los canales"
        >
          <Bot className="w-4 h-4" />
          <span className="hidden md:inline">Bot Global:</span>
          <span
            className={`font-mono uppercase font-bold text-[10px] px-1.5 py-0.5 rounded ${
              isGlobalBotActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
            }`}
          >
            {isGlobalBotActive ? 'ON' : 'OFF'}
          </span>
        </button>

        {/* Today's Revenue */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
          <span className="text-[10px] uppercase font-mono text-slate-400">Hoy:</span>
          <span className="font-mono font-bold text-emerald-400">
            ${todayTotalRevenue.toFixed(2)}
          </span>
        </div>
      </div>
    </header>
  );
};
