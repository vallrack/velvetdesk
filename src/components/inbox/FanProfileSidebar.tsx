import React, { useState } from 'react';
import { X, User, DollarSign, Calendar, Tag, Heart, ShieldAlert, ShoppingBag, Plus, Save } from 'lucide-react';
import { FanProfile, FanTier } from '../../types';
import { PlatformBadge } from '../common/PlatformBadge';
import { FanTierBadge } from '../common/FanTierBadge';

interface FanProfileSidebarProps {
  fan: FanProfile;
  isOpen: boolean;
  onClose: () => void;
  onUpdateFan: (updatedFan: FanProfile) => void;
  onOpenPaymentModal: () => void;
}

export const FanProfileSidebar: React.FC<FanProfileSidebarProps> = ({
  fan,
  isOpen,
  onClose,
  onUpdateFan,
  onOpenPaymentModal,
}) => {
  const [notes, setNotes] = useState(fan.notes);
  const [tier, setTier] = useState<FanTier>(fan.tier);
  const [newTag, setNewTag] = useState('');
  const [tags, setTags] = useState<string[]>(fan.tags);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    onUpdateFan({
      ...fan,
      notes,
      tier,
      tags,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTag.trim()) {
      e.preventDefault();
      if (!tags.includes(newTag.trim())) {
        setTags([...tags, newTag.trim()]);
      }
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  return (
    <div className="w-80 border-l border-slate-800 bg-slate-950 flex flex-col h-full overflow-hidden shrink-0 z-20">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <h3 className="font-semibold text-white text-sm flex items-center gap-1.5">
          <User className="w-4 h-4 text-pink-400" />
          Perfil CRM del Fan
        </h3>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-900 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 overflow-y-auto space-y-5 flex-1 text-xs">
        {/* Fan Avatar & Main Info */}
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            <img
              src={fan.avatar}
              alt={fan.name}
              className="w-16 h-16 rounded-full object-cover border-2 border-pink-500/40 shadow-lg shadow-pink-500/10"
            />
            <div className="absolute -bottom-1 -right-1">
              <PlatformBadge platform={fan.platform} size="sm" showLabel={false} />
            </div>
          </div>
          <h4 className="font-bold text-white text-sm mt-2">{fan.name}</h4>
          <p className="text-slate-400 text-[11px] font-mono">{fan.handle || fan.phoneOrUsername}</p>

          <div className="mt-2.5 flex items-center gap-1.5">
            <FanTierBadge tier={tier} size="sm" />
            <PlatformBadge platform={fan.platform} size="sm" />
          </div>
        </div>

        {/* Financial metrics */}
        <div className="grid grid-cols-2 gap-2 bg-slate-900/60 border border-slate-800 rounded-xl p-3">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Gasto Total LTV</span>
            <span className="text-base font-bold text-emerald-400 font-mono flex items-center mt-0.5">
              ${fan.totalSpent.toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">PPVs Comprados</span>
            <span className="text-base font-bold text-white font-mono mt-0.5 block">
              {fan.purchasedItems.length} items
            </span>
          </div>
        </div>

        {/* Change Tier */}
        <div>
          <label className="block text-[11px] font-medium text-slate-300 mb-1">
            Nivel / Segmento del Fan (RF5.2)
          </label>
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value as FanTier)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-pink-500/60"
          >
            <option value="vip">VIP Whale ($250+)</option>
            <option value="recurrente">Comprador Recurrente</option>
            <option value="curioso">Curioso / Nuevo</option>
            <option value="tacano">Tacaño / Free-rider</option>
          </select>
        </div>

        {/* Creator Private Notes */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-medium text-slate-300">Notas Privadas de la Creadora</label>
            <span className="text-[10px] text-slate-500">Solo visible por ti</span>
          </div>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Fetiches, límites, preferencias, cómo prefiere pagar..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-pink-500/60"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-[11px] font-medium text-slate-300 mb-1 flex items-center gap-1">
            <Tag className="w-3 h-3 text-pink-400" /> Etiquetas Personalizadas
          </label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {tags.map((t) => (
              <span
                key={t}
                className="bg-slate-900 border border-slate-800 text-slate-300 px-2 py-0.5 rounded text-[11px] flex items-center gap-1"
              >
                #{t}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(t)}
                  className="hover:text-rose-400 ml-0.5 cursor-pointer"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <input
            type="text"
            placeholder="Escribe tag y presiona Enter..."
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={handleAddTag}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-pink-500/60"
          />
        </div>

        {/* Purchase History (RF5.3) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] font-medium text-slate-300 flex items-center gap-1">
              <ShoppingBag className="w-3 h-3 text-emerald-400" /> Historial de Compras (Evita duplicados)
            </label>
            <span className="text-[10px] text-slate-500">{fan.purchasedItems.length} compras</span>
          </div>

          {fan.purchasedItems.length === 0 ? (
            <div className="p-3 bg-slate-900/40 border border-dashed border-slate-800 rounded-lg text-center text-slate-500 text-[11px]">
              No tiene compras registradas aún.
            </div>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {fan.purchasedItems.map((p) => (
                <div
                  key={p.id}
                  className="p-2 rounded-lg bg-slate-900 border border-slate-800/80 flex items-start justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-slate-200 truncate">{p.itemTitle}</p>
                    <p className="text-[10px] text-slate-500">
                      {p.date} • {p.paymentMethod}
                    </p>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-400 font-mono shrink-0">
                    +${p.amount}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Preferences / Fetishes */}
        {fan.preferences.length > 0 && (
          <div>
            <label className="block text-[11px] font-medium text-slate-300 mb-1 flex items-center gap-1">
              <Heart className="w-3 h-3 text-pink-400" /> Preferencias Detectadas
            </label>
            <div className="space-y-1">
              {fan.preferences.map((pref, i) => (
                <div key={i} className="text-[11px] text-slate-400 bg-slate-900/60 px-2 py-1 rounded">
                  • {pref}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="p-3 border-t border-slate-800 bg-slate-950 flex items-center gap-2">
        <button
          onClick={onOpenPaymentModal}
          className="flex-1 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 font-medium text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
        >
          <DollarSign className="w-3.5 h-3.5" /> Enviar Cobro
        </button>
        <button
          onClick={handleSave}
          className="flex-1 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-medium text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-md shadow-pink-600/20"
        >
          <Save className="w-3.5 h-3.5" />
          {savedSuccess ? '¡Guardado!' : 'Guardar CRM'}
        </button>
      </div>
    </div>
  );
};
