import React, { useState } from 'react';
import { X, Calendar, Clock, Send, Sparkles } from 'lucide-react';
import { VaultItem } from '../../types';

interface ScheduledModalProps {
  isOpen: boolean;
  onClose: () => void;
  vaultItems: VaultItem[];
  onSchedule: (data: { text: string; date: string; time: string; vaultItemId?: string }) => void;
}

export const ScheduledModal: React.FC<ScheduledModalProps> = ({
  isOpen,
  onClose,
  vaultItems,
  onSchedule,
}) => {
  const [text, setText] = useState('¡Hola amor! Te dejo esto que preparé especialmente para que lo veas esta noche... 💋');
  const [selectedVaultId, setSelectedVaultId] = useState<string>('');
  const [date, setDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [time, setTime] = useState('22:00');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !selectedVaultId) return;
    onSchedule({ text, date, time, vaultItemId: selectedVaultId || undefined });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-pink-500/10 text-pink-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Programar Envío de Mensaje</h3>
              <p className="text-xs text-slate-400">Automatiza la entrega en un horario estratégico</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Mensaje de acompañamiento
            </label>
            <textarea
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Escribe el mensaje..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500/60"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Adjuntar contenido de la Bóveda (Opcional)
            </label>
            <select
              value={selectedVaultId}
              onChange={(e) => setSelectedVaultId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-pink-500/60"
            >
              <option value="">Sin archivo multimedia adjunto</option>
              {vaultItems.map((item) => (
                <option key={item.id} value={item.id}>
                  [{item.type.toUpperCase()}] {item.title} — ${item.price} USD
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-pink-400" /> Fecha
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-pink-500/60"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-pink-400" /> Hora
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-pink-500/60"
              />
            </div>
          </div>

          <div className="p-3 bg-pink-500/5 border border-pink-500/20 rounded-xl flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-pink-400 mt-0.5 shrink-0" />
            <p className="text-xs text-pink-200/80">
              <strong>Tip de conversión:</strong> Los envíos programados entre las 22:00 y 01:00 aumentan la tasa de apertura y compra de PPV en un 38%.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-medium bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white rounded-xl flex items-center gap-2 shadow-lg shadow-pink-600/25 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              Programar Envio
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
