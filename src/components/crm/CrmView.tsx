import React, { useState } from 'react';
import {
  Users,
  Search,
  Filter,
  DollarSign,
  Tag,
  ShoppingBag,
  Sparkles,
  ArrowUpRight,
  MessageCircle,
  Edit3,
  ArrowLeft,
  X,
  Download,
  Check,
  Plus,
  TrendingUp,
  CreditCard,
  Clock,
  Award,
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
  const [sortBy, setSortBy] = useState<'spent' | 'purchases' | 'recent' | 'name'>('spent');
  const [activeFanId, setActiveFanId] = useState<string>(fans[0]?.id || '');
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);

  // Note editing state
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');
  const [savedNotesToast, setSavedNotesToast] = useState(false);

  // New tag draft
  const [newTagInput, setNewTagInput] = useState('');
  const [showAddTag, setShowAddTag] = useState(false);

  // Filter & Sort
  const filteredFans = fans
    .filter((fan) => {
      const query = search.toLowerCase();
      const matchesSearch =
        fan.name.toLowerCase().includes(query) ||
        fan.handle.toLowerCase().includes(query) ||
        (fan.notes && fan.notes.toLowerCase().includes(query)) ||
        (fan.tags && fan.tags.some((t) => t.toLowerCase().includes(query)));
      const matchesTier = selectedTier === 'all' || fan.tier === selectedTier;
      const matchesPlatform = selectedPlatform === 'all' || fan.platform === selectedPlatform;
      return matchesSearch && matchesTier && matchesPlatform;
    })
    .sort((a, b) => {
      if (sortBy === 'spent') return b.totalSpent - a.totalSpent;
      if (sortBy === 'purchases') return b.purchasedItems.length - a.purchasedItems.length;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return (b.lastActive || '').localeCompare(a.lastActive || '');
    });

  const selectedFan = fans.find((f) => f.id === activeFanId) || filteredFans[0] || fans[0];

  // Aggregates
  const totalRevenueAll = fans.reduce((acc, f) => acc + f.totalSpent, 0);
  const totalPurchasesAll = fans.reduce((acc, f) => acc + f.purchasedItems.length, 0);
  const totalVips = fans.filter((f) => f.tier === 'vip').length;
  const avgTicketGlobal = totalPurchasesAll > 0 ? totalRevenueAll / totalPurchasesAll : 0;

  const handleSelectFan = (id: string) => {
    setActiveFanId(id);
    setIsMobileDetailOpen(true);
    setIsEditingNotes(false);
    setShowAddTag(false);
  };

  const handleStartEditNotes = () => {
    if (!selectedFan) return;
    setNotesDraft(selectedFan.notes || '');
    setIsEditingNotes(true);
  };

  const handleSaveNotes = () => {
    if (!selectedFan) return;
    const updated = { ...selectedFan, notes: notesDraft };
    onUpdateFan(updated);
    setIsEditingNotes(false);
    setSavedNotesToast(true);
    setTimeout(() => setSavedNotesToast(false), 2200);
  };

  const handleChangeTier = (newTier: FanTier) => {
    if (!selectedFan) return;
    const updated = { ...selectedFan, tier: newTier };
    onUpdateFan(updated);
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFan || !newTagInput.trim()) return;
    const cleanTag = newTagInput.trim().replace(/^#/, '').toLowerCase();
    if (selectedFan.tags.includes(cleanTag)) {
      setNewTagInput('');
      setShowAddTag(false);
      return;
    }
    const updated = { ...selectedFan, tags: [...selectedFan.tags, cleanTag] };
    onUpdateFan(updated);
    setNewTagInput('');
    setShowAddTag(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (!selectedFan) return;
    const updated = {
      ...selectedFan,
      tags: selectedFan.tags.filter((t) => t !== tagToRemove),
    };
    onUpdateFan(updated);
  };

  // CSV Export
  const handleExportCsv = () => {
    const headers = [
      'ID',
      'Nombre',
      'Handle',
      'Plataforma',
      'Tier',
      'Total Gastado (USD)',
      'Cantidad Compras',
      'Fecha Registro',
      'Ultima Actividad',
      'Etiquetas',
      'Notas',
    ];

    const rows = filteredFans.map((f) => [
      f.id,
      `"${f.name.replace(/"/g, '""')}"`,
      `"${f.handle.replace(/"/g, '""')}"`,
      f.platform,
      f.tier,
      f.totalSpent.toFixed(2),
      f.purchasedItems.length,
      `"${f.joinDate || ''}"`,
      `"${f.lastActive || ''}"`,
      `"${(f.tags || []).join('; ')}"`,
      `"${(f.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `velvetdesk_crm_fans_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderFanDetail = (fan: FanProfile) => {
    const avgTicketFan =
      fan.purchasedItems.length > 0 ? fan.totalSpent / fan.purchasedItems.length : 0;

    return (
      <div className="flex flex-col flex-1 bg-slate-900/40 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* Header Profile Card */}
        <div className="flex items-start justify-between gap-4 bg-slate-900/80 p-4 sm:p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-3 sm:gap-4">
            <img
              src={fan.avatar}
              alt={fan.name}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-pink-500/50 shadow-xl shrink-0"
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-white">{fan.name}</h3>
                <PlatformBadge platform={fan.platform} size="sm" />
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {fan.handle} • Cliente desde {fan.joinDate}
              </p>

              {/* Tier selector */}
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[11px] text-slate-400">Categoría:</span>
                <select
                  value={fan.tier}
                  onChange={(e) => handleChangeTier(e.target.value as FanTier)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-0.5 text-xs text-amber-300 font-medium focus:outline-none focus:border-pink-500 cursor-pointer"
                >
                  <option value="vip">✨ VIP Whale</option>
                  <option value="recurrente">🛍️ Recurrente</option>
                  <option value="curioso">👀 Curioso</option>
                  <option value="tacano">⚠️ Tacaño</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Direct Chat Button */}
            {onSelectChatForFan && (
              <button
                onClick={() => onSelectChatForFan(fan.id)}
                className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-pink-600/20 transition-all cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Abrir</span> Chat
              </button>
            )}

            {/* Close button for mobile sheet */}
            <button
              onClick={() => setIsMobileDetailOpen(false)}
              className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">LTV Total</span>
            <span className="text-base sm:text-lg font-bold text-emerald-400 font-mono block mt-1">
              ${fan.totalSpent.toFixed(2)}
            </span>
          </div>
          <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">PPVs Comprados</span>
            <span className="text-base sm:text-lg font-bold text-white font-mono block mt-1">
              {fan.purchasedItems.length} items
            </span>
          </div>
          <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Ticket Promedio</span>
            <span className="text-base sm:text-lg font-bold text-cyan-400 font-mono block mt-1">
              ${avgTicketFan.toFixed(2)}
            </span>
          </div>
          <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Actividad</span>
            <span className="text-xs font-medium text-slate-300 font-mono block mt-1 truncate">
              {fan.lastActive || 'Reciente'}
            </span>
          </div>
        </div>

        {/* Creator Confidential Notes */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Edit3 className="w-3.5 h-3.5 text-pink-400" />
              Notas Confidenciales de la Creadora (RF5.1)
            </label>
            {!isEditingNotes && (
              <button
                onClick={handleStartEditNotes}
                className="text-[11px] text-pink-400 hover:text-pink-300 font-medium cursor-pointer"
              >
                Editar notas
              </button>
            )}
            {savedNotesToast && (
              <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium animate-pulse">
                <Check className="w-3 h-3" /> Guardado con éxito
              </span>
            )}
          </div>

          {isEditingNotes ? (
            <div className="space-y-2">
              <textarea
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                placeholder="Escribe preferencias del fan, gustos, recordatorios privados..."
                rows={4}
                className="w-full bg-slate-950 border border-pink-500/50 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-pink-500"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setIsEditingNotes(false)}
                  className="px-3 py-1 rounded-lg text-xs text-slate-400 hover:text-white bg-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveNotes}
                  className="px-3 py-1 rounded-lg text-xs text-white bg-pink-600 hover:bg-pink-500 font-medium cursor-pointer"
                >
                  Guardar Notas
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/70 p-3 rounded-lg border border-slate-800">
              {fan.notes || 'Sin notas registradas para este fan. Haz clic en "Editar notas" para agregar preferencias o contexto privado.'}
            </p>
          )}
        </div>

        {/* Behavioral Tags */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-pink-400" />
              Etiquetas de Comportamiento (RF5.2)
            </label>
            <button
              onClick={() => setShowAddTag(!showAddTag)}
              className="text-[11px] text-pink-400 hover:text-pink-300 flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" /> Añadir tag
            </button>
          </div>

          {showAddTag && (
            <form onSubmit={handleAddTag} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="ej: lenceria_roja, pide_descuento..."
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-pink-500"
                autoFocus
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-pink-600 hover:bg-pink-500 text-white rounded-lg text-xs font-medium cursor-pointer"
              >
                Agregar
              </button>
              <button
                type="button"
                onClick={() => setShowAddTag(false)}
                className="p-1.5 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </form>
          )}

          <div className="flex flex-wrap gap-1.5">
            {fan.tags && fan.tags.length > 0 ? (
              fan.tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-pink-500/10 border border-pink-500/30 text-pink-300 font-mono"
                >
                  #{t}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(t)}
                    className="hover:text-pink-100 p-0.5 ml-0.5 cursor-pointer"
                    title="Eliminar etiqueta"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-500">Sin etiquetas asignadas.</span>
            )}
          </div>
        </div>

        {/* Purchase History */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
              Historial de Contenido Adquirido (RF5.3)
            </h4>
            <span className="text-[11px] text-slate-400 font-mono">
              {fan.purchasedItems.length} compras (${fan.totalSpent.toFixed(2)})
            </span>
          </div>

          {fan.purchasedItems.length === 0 ? (
            <div className="p-6 bg-slate-900/60 border border-dashed border-slate-800 rounded-xl text-center text-slate-500 text-xs">
              Este usuario no ha comprado contenido PPV todavía.
            </div>
          ) : (
            <div className="space-y-2">
              {fan.purchasedItems.map((p) => (
                <div
                  key={p.id}
                  className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-white truncate">{p.itemTitle}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                      {p.date} • {p.platform?.toUpperCase()} • {p.paymentMethod}
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
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden relative">
      {/* Top Header & Global Stats */}
      <div className="p-4 sm:p-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-pink-400" />
              CRM de Clientes & Suscriptores (RF5.1 - RF5.3)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Perfiles omnicanal, notas privadas, etiquetas VIP y exportación de audiencias.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div className="px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs">
              <span className="text-slate-400 block text-[9px] uppercase font-mono">Total LTV</span>
              <span className="font-bold text-emerald-400 font-mono text-sm sm:text-base">
                ${totalRevenueAll.toFixed(2)}
              </span>
            </div>
            <div className="px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs">
              <span className="text-slate-400 block text-[9px] uppercase font-mono">VIP Whales</span>
              <span className="font-bold text-amber-400 font-mono text-sm sm:text-base">
                {totalVips} fans
              </span>
            </div>
            <div className="px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs">
              <span className="text-slate-400 block text-[9px] uppercase font-mono">Ticket Prom.</span>
              <span className="font-bold text-cyan-400 font-mono text-sm sm:text-base">
                ${avgTicketGlobal.toFixed(2)}
              </span>
            </div>
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              title="Descargar lista de fans en formato CSV"
            >
              <Download className="w-3.5 h-3.5 text-pink-400" />
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value as any)}
              className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 focus:outline-none focus:border-pink-500/60 flex-1 sm:flex-none cursor-pointer"
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
              className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 focus:outline-none focus:border-pink-500/60 flex-1 sm:flex-none cursor-pointer"
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

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 focus:outline-none focus:border-pink-500/60 flex-1 sm:flex-none cursor-pointer"
            >
              <option value="spent">Mayor Gasto ($)</option>
              <option value="purchases">Más Compras</option>
              <option value="recent">Más Reciente</option>
              <option value="name">Nombre A-Z</option>
            </select>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por nombre, handle, tag o nota..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500/60 placeholder:text-slate-500"
            />
          </div>
        </div>
      </div>

      {/* Main CRM Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Table / List View */}
        <div className="w-full md:w-1/2 lg:w-3/5 border-r border-slate-800 overflow-y-auto">
          {filteredFans.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No se encontraron clientes con los filtros aplicados.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 sticky top-0 border-b border-slate-800 text-slate-400 font-mono">
                <tr>
                  <th className="p-3 sm:p-3.5">Cliente</th>
                  <th className="p-3 sm:p-3.5">Canal</th>
                  <th className="hidden sm:table-cell p-3.5">Categoría</th>
                  <th className="p-3 sm:p-3.5">Gasto LTV</th>
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
                        isSelected
                          ? 'bg-pink-950/20 border-l-4 border-l-pink-500'
                          : 'hover:bg-slate-900/50'
                      }`}
                    >
                      <td className="p-3 sm:p-3.5">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <img
                            src={fan.avatar}
                            alt={fan.name}
                            className="w-9 h-9 rounded-full object-cover border border-slate-700 shrink-0"
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
                      <td className="p-3 sm:p-3.5">
                        <span className="font-mono font-bold text-emerald-400 block">
                          ${fan.totalSpent.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono block">
                          {fan.purchasedItems.length} compras
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
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
        <div className="fixed inset-0 z-40 bg-slate-950/95 backdrop-blur-sm flex flex-col md:hidden">
          {renderFanDetail(selectedFan)}
        </div>
      )}
    </div>
  );
};
