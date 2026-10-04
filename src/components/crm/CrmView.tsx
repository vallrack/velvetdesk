import React, { useState } from 'react';
import {
  Users,
  Search,
  Filter,
  DollarSign,
  Tag,
  ShoppingBag,
  Sparkles,
  ShieldAlert,
  ArrowUpRight,
  MessageCircle,
  Edit3,
} from 'lucide-react';
import { FanProfile, FanTier, PlatformId } from '../../types';
import { PlatformBadge } from '../common/PlatformBadge';
import { FanTierBadge } from '../common/FanTierBadge';

interface CrmViewProps {
  fans: FanProfile[];
  onSelectChatForFan?: (fanId: string) => void;
  onUpdateFan: (fan: FanProfile) => void;
}

export const CrmView: React.FC<CrmViewProps> = ({
  fans,
  onSelectChatForFan,
  onUpdateFan,
}) => {
  const [search, setSearch] = useState('');
  const [selectedTier, setSelectedTier] = useState<'all' | FanTier>('all');
  const [selectedPlatform, setSelectedPlatform] = useState<'all' | PlatformId>('all');
  const [activeFanId, setActiveFanId] = useState<string>(fans[0]?.id || '');

  const filteredFans = fans.filter((fan) => {
    const matchesSearch =
      fan.name.toLowerCase().includes(search.toLowerCase()) ||
      fan.handle.toLowerCase().includes(search.toLowerCase()) ||
      fan.notes.toLowerCase().includes(search.toLowerCase());
    const matchesTier = selectedTier === 'all' || fan.tier === selectedTier;
    const matchesPlatform = selectedPlatform === 'all' || fan.platform === selectedPlatform;
    return matchesSearch && matchesTier && matchesPlatform;
  });

  const selectedFan = fans.find((f) => f.id === activeFanId) || filteredFans[0];

  const totalRevenueAll = fans.reduce((acc, f) => acc + f.totalSpent, 0);
  const totalVips = fans.filter((f) => f.tier === 'vip').length;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
      {/* Top Header & Stats */}
      <div className="p-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-pink-400" />
              CRM de Clientes & Gestión de Suscriptores (RF5.1 - RF5.3)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Perfiles omnicanal unificados, etiquetas de gasto (VIP, Recurrente, Curioso, Tacaño) y prevención de duplicados de venta.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs">
              <span className="text-slate-400 block text-[10px] uppercase">Gasto Acumulado CRM</span>
              <span className="font-bold text-emerald-400 font-mono text-base">
                ${totalRevenueAll.toFixed(2)} USD
              </span>
            </div>
            <div className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs">
              <span className="text-slate-400 block text-[10px] uppercase">Whales VIP</span>
              <span className="font-bold text-amber-400 font-mono text-base">
                {totalVips} clientes
              </span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value as any)}
              className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 focus:outline-none focus:border-pink-500/60"
            >
              <option value="all">Todos los niveles (Tiers)</option>
              <option value="vip">✨ VIP Whales ($250+)</option>
              <option value="recurrente">🛍️ Compradores Recurrentes</option>
              <option value="curioso">👀 Curiosos / Nuevos</option>
              <option value="tacano">⚠️ Tacaños / Free-riders</option>
            </select>

            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value as any)}
              className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 focus:outline-none focus:border-pink-500/60"
            >
              <option value="all">Todas las redes</option>
              <option value="fansly">Fansly</option>
              <option value="telegram">Telegram</option>
              <option value="manyvids">ManyVids</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="pornhub">Pornhub</option>
              <option value="scatbook">Scatbook</option>
              <option value="vipweb">VIPweb</option>
            </select>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por nombre, @handle o notas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-pink-500/60 w-64"
            />
          </div>
        </div>
      </div>

      {/* Main CRM Columns */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Fan Table / List */}
        <div className="w-full md:w-1/2 lg:w-3/5 border-r border-slate-800 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 sticky top-0 border-b border-slate-800 text-slate-400 font-mono">
              <tr>
                <th className="p-3.5">Cliente</th>
                <th className="p-3.5">Canal</th>
                <th className="p-3.5">Categoría (RF5.2)</th>
                <th className="p-3.5">Gasto Total</th>
                <th className="p-3.5">Compras</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredFans.map((fan) => {
                const isSelected = fan.id === selectedFan?.id;
                return (
                  <tr
                    key={fan.id}
                    onClick={() => setActiveFanId(fan.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-pink-950/20 border-l-4 border-l-pink-500' : 'hover:bg-slate-900/50'
                    }`}
                  >
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <img
                          src={fan.avatar}
                          alt={fan.name}
                          className="w-8 h-8 rounded-full object-cover border border-slate-700"
                        />
                        <div>
                          <p className="font-semibold text-white truncate">{fan.name}</p>
                          <p className="text-[11px] text-slate-500 font-mono">{fan.handle}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <PlatformBadge platform={fan.platform} size="sm" />
                    </td>
                    <td className="p-3.5">
                      <FanTierBadge tier={fan.tier} size="sm" />
                    </td>
                    <td className="p-3.5 font-mono font-bold text-emerald-400">
                      ${fan.totalSpent.toFixed(2)}
                    </td>
                    <td className="p-3.5 text-slate-400 font-mono">
                      {fan.purchasedItems.length} PPVs
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Right: Selected Fan Comprehensive Detail */}
        {selectedFan ? (
          <div className="hidden md:flex flex-col flex-1 bg-slate-900/30 overflow-y-auto p-6 space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <img
                  src={selectedFan.avatar}
                  alt={selectedFan.name}
                  className="w-16 h-16 rounded-full object-cover border-2 border-pink-500/40 shadow-xl"
                />
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedFan.name}</h3>
                  <p className="text-xs text-slate-400 font-mono">{selectedFan.handle} • Cliente desde {selectedFan.joinDate}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <PlatformBadge platform={selectedFan.platform} size="sm" />
                    <FanTierBadge tier={selectedFan.tier} size="sm" />
                  </div>
                </div>
              </div>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-mono">Total Gastado</span>
                <span className="text-xl font-bold text-emerald-400 font-mono block mt-1">
                  ${selectedFan.totalSpent.toFixed(2)} USD
                </span>
              </div>
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-mono">Archivos Desbloqueados</span>
                <span className="text-xl font-bold text-white font-mono block mt-1">
                  {selectedFan.purchasedItems.length} piezas
                </span>
              </div>
            </div>

            {/* Creator Notes */}
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
              <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5 text-pink-400" />
                Notas Confidenciales de la Creadora (RF5.1)
              </label>
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-lg border border-slate-800">
                {selectedFan.notes || 'Sin notas registradas para este fan.'}
              </p>
            </div>

            {/* Tags */}
            <div>
              <label className="text-xs font-semibold text-white mb-2 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-pink-400" />
                Etiquetas de Comportamiento (RF5.2)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {selectedFan.tags.map((t) => (
                  <span
                    key={t}
                    className="text-xs px-2.5 py-1 rounded-lg bg-pink-500/10 border border-pink-500/30 text-pink-300 font-mono"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            </div>

            {/* Purchase History (RF5.3 - Anti Duplicate Sales) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
                  Historial Detallado de Contenido Adquirido (RF5.3)
                </h4>
                <span className="text-[11px] text-slate-500">
                  {selectedFan.purchasedItems.length} compras verificadas
                </span>
              </div>

              {selectedFan.purchasedItems.length === 0 ? (
                <div className="p-4 bg-slate-900/60 border border-dashed border-slate-800 rounded-xl text-center text-slate-500 text-xs">
                  Este usuario no ha comprado contenido PPV todavía.
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedFan.purchasedItems.map((p) => (
                    <div
                      key={p.id}
                      className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <p className="font-semibold text-white">{p.itemTitle}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {p.date} • {p.paymentMethod} • Canal: {p.platform.toUpperCase()}
                        </p>
                      </div>
                      <span className="font-mono font-bold text-emerald-400">
                        +${p.amount.toFixed(2)} USD
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center text-slate-500 text-xs">
            Selecciona un fan para ver su perfil CRM detallado.
          </div>
        )}
      </div>
    </div>
  );
};
