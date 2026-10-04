import React, { useState } from 'react';
import {
  Radio,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  ExternalLink,
  Shield,
  Key,
  Wifi,
  Sparkles,
  Server,
  Zap,
} from 'lucide-react';
import { ChannelIntegration } from '../../types';
import { PlatformBadge } from '../common/PlatformBadge';

interface ChannelsViewProps {
  channels: ChannelIntegration[];
  onRefreshChannel: (channelId: string) => void;
}

export const ChannelsView: React.FC<ChannelsViewProps> = ({
  channels,
  onRefreshChannel,
}) => {
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  const handleRefresh = (id: string) => {
    setRefreshingId(id);
    onRefreshChannel(id);
    setTimeout(() => setRefreshingId(null), 1200);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
      {/* Top Header */}
      <div className="p-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Radio className="w-5 h-5 text-pink-400" />
              Canales Conectados & Centralización Omnicanal (RF1.1)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Monitoreo y estado de conexión en vivo con Fansly, Telegram, ManyVids, WhatsApp, Pornhub, Scatbook y VIPweb.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-2 rounded-xl text-xs text-emerald-300 font-semibold">
            <Wifi className="w-4 h-4 text-emerald-400" />
            <span>7/7 Canales Sincronizados en Tiempo Real</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {channels.map((ch) => {
            const isRefreshing = refreshingId === ch.id;

            return (
              <div
                key={ch.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-pink-500/30 transition-all flex flex-col justify-between shadow-lg"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-center justify-between mb-3">
                    <PlatformBadge platform={ch.id} size="md" />
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 font-mono bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      EN LÍNEA
                    </span>
                  </div>

                  {/* Sync type & credential info */}
                  <div className="space-y-2 my-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Tipo de Enlace:</span>
                      <span className="font-semibold text-white">{ch.syncType}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Latencia Webhook:</span>
                      <span className="font-mono text-emerald-400 font-bold">{ch.latencyMs} ms</span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Última Sincronización:</span>
                      <span className="text-slate-300 font-mono">{ch.lastSyncTime}</span>
                    </div>

                    <div className="p-2.5 bg-slate-950 border border-slate-800/80 rounded-xl mt-3">
                      <span className="text-[10px] text-slate-500 uppercase block font-mono">Credenciales / Sesión:</span>
                      <span className="text-xs font-mono text-pink-300 truncate block mt-0.5">
                        {ch.credentialInfo}
                      </span>
                    </div>
                  </div>

                  {/* Live Stats */}
                  <div className="grid grid-cols-2 gap-2 my-3 p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/60 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Chats Activos</span>
                      <span className="font-bold text-white font-mono text-sm">{ch.activeChatsCount}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Ventas Hoy</span>
                      <span className="font-bold text-emerald-400 font-mono text-sm">
                        ${ch.todayRevenue.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer action */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between mt-2">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                    <Zap className="w-3 h-3 text-emerald-400" /> Auto-reconexión activa
                  </span>

                  <button
                    onClick={() => handleRefresh(ch.id)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer transition-colors"
                    title="Forzar resincronización"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-pink-400' : ''}`} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
