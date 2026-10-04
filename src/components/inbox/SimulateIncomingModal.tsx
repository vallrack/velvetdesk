import React, { useState } from 'react';
import { X, PlayCircle, Bot, Sparkles, MessageSquare } from 'lucide-react';
import { PlatformId, FanTier } from '../../types';
import { PlatformBadge } from '../common/PlatformBadge';

interface SimulateIncomingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSimulateMessage: (params: {
    platform: PlatformId;
    fanName: string;
    fanTier: FanTier;
    text: string;
    triggerBotReply: boolean;
  }) => void;
}

export const SimulateIncomingModal: React.FC<SimulateIncomingModalProps> = ({
  isOpen,
  onClose,
  onSimulateMessage,
}) => {
  const [platform, setPlatform] = useState<PlatformId>('whatsapp');
  const [fanName, setFanName] = useState('Juan David');
  const [fanTier, setFanTier] = useState<FanTier>('curioso');
  const [text, setText] = useState('Hola amor! Cuánto cuesta tu video exclusivo de la ducha? 🔥');
  const [triggerBotReply, setTriggerBotReply] = useState(true);

  if (!isOpen) return null;

  const platforms: PlatformId[] = [
    'fansly',
    'telegram',
    'manyvids',
    'whatsapp',
    'pornhub',
    'scatbook',
    'vipweb',
  ];

  const presets = [
    {
      title: '🏷️ Preguntar Precios & Menú PPV',
      text: 'Hola mi reina, qué contenido nuevo tienes disponible hoy y qué precios manejas?',
      tier: 'curioso' as FanTier,
    },
    {
      title: '🔥 Deseo de Comprar Video Ducha (Alto Interés)',
      text: 'Amor quiero el video de la ducha de 14 min que vi en tu preview. ¿Por dónde te puedo pagar ya mismo?',
      tier: 'recurrente' as FanTier,
    },
    {
      title: '💳 Aviso de Pago Realizado (Crypto/PayPal)',
      text: 'Te acabo de transferir $45 por Wise! Por favor mándame el video privado 💕',
      tier: 'vip' as FanTier,
    },
    {
      title: '🎙️ Petición de Custom / Audio con Nombre',
      text: 'Hola guapa, me puedes hacer un audio de 3 minutos diciendo mi nombre mientras te tocas?',
      tier: 'vip' as FanTier,
    },
    {
      title: '🚫 Tacaño pidiendo fotos gratis',
      text: 'Regálame una fotito gratis sin censura y te prometo que mañana te compro todo...',
      tier: 'tacano' as FanTier,
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSimulateMessage({
      platform,
      fanName,
      fanTier,
      text,
      triggerBotReply,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-pink-500/10 text-pink-400 flex items-center justify-center shrink-0">
              <PlayCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm sm:text-base">Simulador Multicanal</h3>
              <p className="text-[10px] sm:text-xs text-slate-400">Prueba la omnicanalidad y respuesta del bot</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3.5 sm:space-y-4 overflow-y-auto">
          {/* Platform selection */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Canal de Origen del Mensaje (RF1.1)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {platforms.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlatform(p)}
                  className={`p-1.5 rounded-xl border text-xs cursor-pointer transition-all ${
                    platform === p ? 'ring-2 ring-pink-500 bg-slate-800' : 'bg-slate-950 border-slate-800 opacity-70 hover:opacity-100'
                  }`}
                >
                  <PlatformBadge platform={p} size="sm" />
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Nombre del Fan</label>
              <input
                type="text"
                value={fanName}
                onChange={(e) => setFanName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500/60"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Nivel CRM del Fan</label>
              <select
                value={fanTier}
                onChange={(e) => setFanTier(e.target.value as FanTier)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500/60"
              >
                <option value="vip">VIP Whale ($250+)</option>
                <option value="recurrente">Comprador Recurrente</option>
                <option value="curioso">Curioso / Nuevo</option>
                <option value="tacano">Tacaño / Free-rider</option>
              </select>
            </div>
          </div>

          {/* Quick presets */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Plantillas de Prueba Rápidas</span>
              <span className="text-[10px] text-pink-400">Click para rellenar</span>
            </label>
            <div className="space-y-1.5">
              {presets.map((pr, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setText(pr.text);
                    setFanTier(pr.tier);
                  }}
                  className="w-full text-left p-2 rounded-lg bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-[11px] text-slate-300 flex items-center justify-between group cursor-pointer transition-colors"
                >
                  <span className="font-medium group-hover:text-pink-300 truncate mr-2">{pr.title}</span>
                  <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-900 text-slate-400">
                    {pr.tier}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Message Textarea */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Texto del Mensaje</label>
            <textarea
              rows={2}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-pink-500/60"
            />
          </div>

          {/* Bot Trigger Checkbox */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-pink-400" />
              <div>
                <p className="text-xs font-medium text-white">Activar Respuesta Automática del Bot</p>
                <p className="text-[10px] text-slate-400">
                  Simula retardo humano (2.5s) y genera respuesta con IA / Reglas
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={triggerBotReply}
              onChange={(e) => setTriggerBotReply(e.target.checked)}
              className="w-4 h-4 rounded text-pink-600 focus:ring-0 bg-slate-900 border-slate-700 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-xl cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-medium bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white rounded-xl flex items-center gap-2 shadow-lg shadow-pink-600/25 cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Inyectar Mensaje Ahora
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
