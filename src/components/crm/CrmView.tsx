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
  ArrowLeft,
  X,
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
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);

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

  const handleSelectFan = (id: string) => {
    setActiveFanId(id);
    setIsMobileDetailOpen(true);
  };

  const renderFanDetail = (fan: FanProfile) => (
    <div className="flex flex-col flex-1 bg-slate-900/40 overflow-y-auto p-4 sm:p-6 space-y-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <img
            src={fan.avatar}
            alt={fan.name}
            className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-pink-500/40 shadow-xl"
          />
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white">{fan.name}</h3>
            <p className="text-[11px] sm:text-xs text-slate-400 font-mono">
              {fan.handle} • Cliente desde {fan.joinDate}
            </p>
            <div className="flex items-center gap-1.5 sm:gap-2 mt-1.5 flex-wrap">
              <PlatformBadge platform={fan.platform} size="sm" />
              <FanTierBadge tier={fan.tier} size="sm" />
            </div>
          </div>
        </div>

        {/* Close button for mobile sheet */}
        <button
          onClick={() => setIsMobileDetailOpen(false)}
          className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Metrics cards */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        <div className="p-3 sm:p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-[10px] text-slate-400 uppercase font-mono">Total Gastado</span>
          <span className="text-lg sm:text-xl font-bold text-emerald-400 font-mono block mt-1">
            ${fan.totalSpent.toFixed(2)} USD
          </span>
        </div>
        <div className="p-3 sm:p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-[10px] text-slate-400 uppercase font-mono">PPVs Desbloqueados</span>
          <span className="text-lg sm:text-xl font-bold text-white font-mono block mt-1">
            {fan.purchasedItems.length} piezas
          </span>
        </div>
      </div>

      {/* Creator Notes */}
      <div className="p-3.5 sm:p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1.5">
        <label className="text-xs font-semibold text-white flex items-center gap-1.5">
          <Edit3 className="w-3.5 h-3.5 text-pink-400" />
          Notas Confidenciales de la Creadora (RF5.1)
        </label>
        <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-2.5 sm:p-3 rounded-lg border border-slate-800">
          {fan.notes || 'Sin notas registradas para este fan.'}
        </p>
      </div>

      {/* Tags */}
      <div>
        <label className="text-xs font-semibold text-white mb-2 flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-pink-400" />
          Etiquetas de Comportamiento (RF5.2)
        </label>
        <div className="flex flex-wrap gap-1.5">
          {fan.tags.map((t) => (
            <span
              key={t}
              className="text-xs px-2.5 py-1 rounded-lg bg-pink-500/10 border border-pink-500/30 text-pink-300 font-mono"
            >
              #{t}
            </span>
          ))}
        </div>
      </div>

      {/* Purchase History */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
            <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
            Historial de Contenido Adquirido (RF5.3)
          </h4>
          <span className="text-[11px] text-slate-500">
            {fan.purchasedItems.length} compras
          </span>
        </div>

        {fan.purchasedItems.length === 0 ? (
          <div className="p-4 bg-slate-900/60 border border-dashed border-slate-800 rounded-xl text-center text-slate-500 text-xs">
            Este usuario no ha comprado contenido PPV todavía.
          </div>
        ) : (
          <div className="space-y-1.5 sm:space-y-2">
            {fan.purchasedItems.map((p) => (
              <div
                key={p.id}
                className="p-2.5 sm:p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between gap-2 text-xs"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-white truncate">{p.itemTitle}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                    {p.date} • {p.paymentMethod}
                  </p>
                </div>
                <span className="font-mono font-bold text-emerald-400 shrink-0">
                  +${p.amount.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden relative">
      {/* Top Header & Stats */}
      <div className="p-4 sm:p-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-pink-400" />
              CRM de Clientes & Suscriptores (RF5.1 - RF5.3)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 sm:mt-1">
              Perfiles omnicanal, etiquetas VIP y prevención de ventas duplicadas.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs">
              <span className="text-slate-400 block text-[9px] sm:text-[10px] uppercase font-mono">Gasto LTV</span>
              <span className="font-bold text-emerald-400 font-mono text-xs sm:text-base">
                ${totalRevenueAll.toFixed(2)} USD
              </span>
            </div>
            <div className="px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs">
              <span className="text-slate-400 block text-[9px] sm:text-[10px] uppercase font-mono">VIPs</span>
              <span className="font-bold text-amber-400 font-mono text-xs sm:text-base">
                {totalVips} clientes
              </span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-3 sm:mt-5 flex flex-wrap items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value as any)}
              className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 focus:outline-none focus:border-pink-500/60 flex-1 sm:flex-none"
            >
              <option value="all">Todos los tiers</option>
              <option value="vip">✨ VIP Whales</option>
              <option value="recurrente">🛍️ Recurrentes</option>
              <option value="curioso">👀 Curiosos</option>
              <option value="tacano">⚠️ Tacaños</option>
            </select>

            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value as any)}
              className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 focus:outline-none focus:border-pink-500/60 flex-1 sm:flex-none"
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

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por nombre o handle..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-pink-500/60"
            />
          </div>
        </div>
      </div>

      {/* Main CRM Columns */}
      <div className="flex-1 flex overflow-hidden">
        {/* Table / List */}
        <div className="w-full md:w-1/2 lg:w-3/5 border-r border-slate-800 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 sticky top-0 border-b border-slate-800 text-slate-400 font-mono">
              <tr>
                <th className="p-3 sm:p-3.5">Cliente</th>
                <th className="p-3 sm:p-3.5">Canal</th>
                <th className="hidden sm:table-cell p-3.5">Categoría</th>
                <th className="p-3 sm:p-3.5">Gasto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredFans.map((fan) => {
                const isSelected = fan.id === selectedFan?.id;
                return (
                  <tr
                    key={fan.id}
                    onClick={() => handleSelectFan(fan.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-pink-950/20 border-l-4 border-l-pink-500' : 'hover:bg-slate-900/50'
                    }`}
                  >
                    <td className="p-3 sm:p-3.5">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <img
                          src={fan.avatar}
                          alt={fan.name}
                          className="w-8 h-8 rounded-full object-cover border border-slate-700 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-white truncate text-xs">{fan.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono truncate">{fan.handle}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 sm:p-3.5">
                      <PlatformBadge platform={fan.platform} size="sm" showLabel={false} />
                    </td>
                    <td className="hidden sm:table-cell p-3.5">
                      <FanTierBadge tier={fan.tier} size="sm" />
                    </td>
                    <td className="p-3 sm:p-3.5 font-mono font-bold text-emerald-400">
                      ${fan.totalSpent.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Desktop Detail Panel */}
        {selectedFan && (
          <div className="hidden md:flex flex-col flex-1">
            {renderFanDetail(selectedFan)}
          </div>
        )}
      </div>

      {/* Mobile Drawer/Modal for Fan Detail */}
      {isMobileDetailOpen && selectedFan && (
        <div className="fixed inset-0 z-40 bg-slate-950/90 backdrop-blur-sm flex flex-col md:hidden">
          {renderFanDetail(selectedFan)}
        </div>
      )}
    </div>
  );
};
