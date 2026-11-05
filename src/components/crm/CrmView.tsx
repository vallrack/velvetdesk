import React, { useState, useMemo } from 'react';
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
  Trash2,
  CheckSquare,
  Square,
  MinusSquare,
  AlertTriangle,
  UserPlus,
  Save,
  ChevronDown,
} from 'lucide-react';
import { FanProfile, FanTier, PlatformId } from '../../types';
import { PlatformBadge } from '../common/PlatformBadge';
import { FanTierBadge } from '../common/FanTierBadge';

interface CrmViewProps {
  fans: FanProfile[];
  onSelectChatForFan?: (fanId: string) => void;
  onUpdateFan: (fan: FanProfile) => void;
  onCreateFan?: (fan: Partial<FanProfile>) => Promise<FanProfile>;
  onDeleteFan?: (fanId: string) => void;
  onDeleteFansBatch?: (fanIds: string[]) => void;
  onUpdateFansBatch?: (fanIds: string[], updates: Partial<FanProfile>) => void;
}

const TIER_OPTIONS: { value: FanTier; label: string; icon: string; color: string }[] = [
  { value: 'vip', label: 'VIP Whale', icon: '✨', color: 'text-amber-400' },
  { value: 'recurrente', label: 'Recurrente', icon: '🛍️', color: 'text-blue-400' },
  { value: 'curioso', label: 'Curioso', icon: '👀', color: 'text-emerald-400' },
  { value: 'tacano', label: 'Tacaño', icon: '⚠️', color: 'text-slate-400' },
];

const PLATFORM_OPTIONS: { value: PlatformId; label: string }[] = [
  { value: 'onlyfans', label: 'OnlyFans' },
  { value: 'fansly', label: 'Fansly' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'manyvids', label: 'ManyVids' },
  { value: 'pornhub', label: 'Pornhub' },
  { value: 'scatbook', label: 'Scatbook' },
  { value: 'vipweb', label: 'VIPweb' },
];

export const CrmView: React.FC<CrmViewProps> = ({
  fans,
  onSelectChatForFan,
  onUpdateFan,
  onCreateFan,
  onDeleteFan,
  onDeleteFansBatch,
  onUpdateFansBatch,
}) => {
  const [search, setSearch] = useState('');
  const [selectedTier, setSelectedTier] = useState<'all' | FanTier>('all');
  const [selectedPlatform, setSelectedPlatform] = useState<'all' | PlatformId>('all');
  const [sortBy, setSortBy] = useState<'spent' | 'purchases' | 'recent' | 'name'>('spent');
  const [activeFanId, setActiveFanId] = useState<string>(fans[0]?.id || '');
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);

  // ── Selection State for Bulk Actions ──
  const [selectedFanIds, setSelectedFanIds] = useState<Set<string>>(new Set());

  // ── Modals State ──
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [fanToEdit, setFanToEdit] = useState<FanProfile | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newFanForm, setNewFanForm] = useState<Partial<FanProfile>>({
    name: '',
    handle: '',
    platform: 'whatsapp',
    tier: 'curioso',
    totalSpent: 0,
    phoneOrUsername: '',
    notes: '',
  });

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [fanToDelete, setFanToDelete] = useState<FanProfile | null>(null);

  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);

  // ── Notes Editing in Detail Panel ──
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');

  // ── New Tag Draft ──
  const [newTagInput, setNewTagInput] = useState('');
  const [showAddTag, setShowAddTag] = useState(false);

  // ── Toast Feedback ──
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // ── Filter & Sort ──
  const filteredFans = useMemo(() => {
    return fans
      .filter((fan) => {
        const query = search.toLowerCase();
        const matchesSearch =
          fan.name.toLowerCase().includes(query) ||
          fan.handle.toLowerCase().includes(query) ||
          (fan.phoneOrUsername && fan.phoneOrUsername.toLowerCase().includes(query)) ||
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
  }, [fans, search, selectedTier, selectedPlatform, sortBy]);

  const selectedFan = fans.find((f) => f.id === activeFanId) || filteredFans[0] || fans[0];

  // ── Selection Handlers ──
  const isAllFilteredSelected =
    filteredFans.length > 0 && filteredFans.every((f) => selectedFanIds.has(f.id));
  const isPartiallySelected =
    filteredFans.some((f) => selectedFanIds.has(f.id)) && !isAllFilteredSelected;

  const handleToggleSelectAll = () => {
    if (isAllFilteredSelected) {
      setSelectedFanIds(new Set());
    } else {
      const newSet = new Set(selectedFanIds);
      filteredFans.forEach((f) => newSet.add(f.id));
      setSelectedFanIds(newSet);
    }
  };

  const handleToggleSelectFan = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSet = new Set(selectedFanIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedFanIds(newSet);
  };

  const handleClearSelection = () => {
    setSelectedFanIds(new Set());
  };

  // ── Bulk Tier Change ──
  const handleBulkChangeTier = (newTier: FanTier) => {
    if (selectedFanIds.size === 0) return;
    const ids = Array.from(selectedFanIds);
    if (onUpdateFansBatch) {
      onUpdateFansBatch(ids, { tier: newTier });
    } else {
      ids.forEach((id) => {
        const f = fans.find((x) => x.id === id);
        if (f) onUpdateFan({ ...f, tier: newTier });
      });
    }
    showToast(`✅ Se cambió el estado a "${newTier.toUpperCase()}" para ${ids.length} clientes.`);
    setSelectedFanIds(new Set());
  };

  // ── Bulk Delete ──
  const handleConfirmBatchDelete = () => {
    if (selectedFanIds.size === 0) return;
    const ids = Array.from(selectedFanIds);
    if (onDeleteFansBatch) {
      onDeleteFansBatch(ids);
    } else if (onDeleteFan) {
      ids.forEach((id) => onDeleteFan(id));
    }
    showToast(`🗑️ ${ids.length} clientes eliminados con éxito.`);
    setSelectedFanIds(new Set());
    setIsBatchDeleteModalOpen(false);
  };

  // ── Single Edit Handler ──
  const handleOpenEditModal = (fan: FanProfile, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFanToEdit({ ...fan });
    setIsEditModalOpen(true);
  };

  const handleSaveEditFan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fanToEdit) return;
    onUpdateFan(fanToEdit);
    setIsEditModalOpen(false);
    showToast(`✅ Cliente "${fanToEdit.name}" actualizado.`);
  };

  // ── Single Delete Handler ──
  const handleOpenDeleteModal = (fan: FanProfile, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFanToDelete(fan);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDeleteSingle = () => {
    if (!fanToDelete) return;
    if (onDeleteFan) {
      onDeleteFan(fanToDelete.id);
    }
    showToast(`🗑️ Cliente "${fanToDelete.name}" eliminado.`);
    setIsDeleteModalOpen(false);
    setFanToDelete(null);
    if (activeFanId === fanToDelete.id) {
      const nextFan = fans.find((f) => f.id !== fanToDelete.id);
      if (nextFan) setActiveFanId(nextFan.id);
    }
  };

  // ── Create Fan Handler ──
  const handleCreateNewFan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFanForm.name?.trim()) return;

    const fanData: Partial<FanProfile> = {
      ...newFanForm,
      handle: newFanForm.handle?.trim() || `@${newFanForm.name.toLowerCase().replace(/\s+/g, '_')}`,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(newFanForm.name)}&background=8b5cf6&color=fff`,
      totalSpent: Number(newFanForm.totalSpent) || 0,
      joinDate: new Date().toISOString().split('T')[0],
      lastActive: 'En línea',
      tags: [newFanForm.platform || 'fansly', newFanForm.tier || 'curioso'],
      preferences: [],
    };

    if (onCreateFan) {
      try {
        const created = await onCreateFan(fanData);
        setActiveFanId(created.id);
        showToast(`✨ Cliente "${created.name}" registrado.`);
      } catch {
        showToast('❌ Error creando cliente.');
      }
    }
    setIsCreateModalOpen(false);
    setNewFanForm({
      name: '',
      handle: '',
      platform: 'whatsapp',
      tier: 'curioso',
      totalSpent: 0,
      phoneOrUsername: '',
      notes: '',
    });
  };

  // ── Global Aggregates ──
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
    showToast('✅ Notas guardadas.');
  };

  const handleChangeTier = (newTier: FanTier) => {
    if (!selectedFan) return;
    const updated = { ...selectedFan, tier: newTier };
    onUpdateFan(updated);
    showToast(`✅ Categoría cambiada a ${newTier.toUpperCase()}`);
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

  // CSV Export (Filtered or Selected)
  const handleExportCsv = (onlySelected = false) => {
    const listToExport = onlySelected
      ? fans.filter((f) => selectedFanIds.has(f.id))
      : filteredFans;

    if (listToExport.length === 0) {
      alert('No hay clientes para exportar.');
      return;
    }

    const headers = [
      'ID',
      'Nombre',
      'Handle',
      'Contacto/Telefono',
      'Plataforma',
      'Tier',
      'Total Gastado (USD)',
      'Cantidad Compras',
      'Fecha Registro',
      'Ultima Actividad',
      'Etiquetas',
      'Notas',
    ];

    const rows = listToExport.map((f) => [
      f.id,
      `"${f.name.replace(/"/g, '""')}"`,
      `"${f.handle.replace(/"/g, '""')}"`,
      `"${(f.phoneOrUsername || '').replace(/"/g, '""')}"`,
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
    link.setAttribute('download', `velvetdesk_crm_${new Date().toISOString().slice(0, 10)}.csv`);
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
        <div className="flex items-start justify-between gap-4 bg-slate-900/80 p-4 sm:p-5 rounded-2xl border border-slate-800 relative group">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <img
              src={fan.avatar}
              alt={fan.name}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-pink-500/50 shadow-xl shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-white truncate">{fan.name}</h3>
                <PlatformBadge platform={fan.platform} size="sm" />
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">
                {fan.handle} {fan.phoneOrUsername ? `• ${fan.phoneOrUsername}` : ''} • Desde {fan.joinDate}
              </p>

              {/* Quick Tier Selector */}
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[11px] text-slate-400">Estado:</span>
                <select
                  value={fan.tier}
                  onChange={(e) => handleChangeTier(e.target.value as FanTier)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-0.5 text-xs text-amber-300 font-medium focus:outline-none focus:border-pink-500 cursor-pointer"
                >
                  {TIER_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.icon} {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Edit Fan Button */}
            <button
              onClick={() => handleOpenEditModal(fan)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-medium transition-colors cursor-pointer"
              title="Editar datos del cliente"
            >
              <Edit3 className="w-3.5 h-3.5 text-pink-400" />
              <span className="hidden sm:inline">Editar</span>
            </button>

            {/* Delete Fan Button */}
            <button
              onClick={() => handleOpenDeleteModal(fan)}
              className="p-1.5 bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-400 rounded-xl transition-colors cursor-pointer"
              title="Eliminar este cliente"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* Direct Chat Button */}
            {onSelectChatForFan && (
              <button
                onClick={() => onSelectChatForFan(fan.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-pink-600/20 transition-all cursor-pointer"
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
              Notas Confidenciales de la Creadora
            </label>
            {!isEditingNotes && (
              <button
                onClick={handleStartEditNotes}
                className="text-[11px] text-pink-400 hover:text-pink-300 font-medium cursor-pointer"
              >
                Editar notas
              </button>
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
                  className="px-3 py-1 rounded-lg text-xs text-slate-400 hover:text-white bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveNotes}
                  className="px-3 py-1 rounded-lg text-xs text-white bg-pink-600 hover:bg-pink-500 font-semibold"
                >
                  Guardar Notas
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
              {fan.notes || <span className="text-slate-500 italic">Sin notas registradas aún. Haz clic en "Editar notas" para agregar preferencias.</span>}
            </p>
          )}
        </div>

        {/* Tags */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-pink-400" />
              Etiquetas del Perfil ({fan.tags.length})
            </label>
            <button
              onClick={() => setShowAddTag(!showAddTag)}
              className="text-[11px] text-pink-400 hover:text-pink-300 font-medium flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" /> Añadir
            </button>
          </div>

          {showAddTag && (
            <form onSubmit={handleAddTag} className="flex gap-2">
              <input
                type="text"
                placeholder="Nueva etiqueta (ej: paga_usdt, lenceria)..."
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-pink-500"
              />
              <button
                type="submit"
                className="px-3 py-1 bg-pink-600 hover:bg-pink-500 text-white rounded-lg text-xs font-medium cursor-pointer"
              >
                Agregar
              </button>
            </form>
          )}

          <div className="flex flex-wrap gap-1.5">
            {fan.tags.map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-1 rounded-lg text-[11px] bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1.5"
              >
                #{tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-red-400 cursor-pointer"
                  title="Eliminar etiqueta"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Purchase History */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
          <label className="text-xs font-semibold text-white flex items-center gap-1.5">
            <ShoppingBag className="w-3.5 h-3.5 text-pink-400" />
            Historial de Compras & PPVs ({fan.purchasedItems.length})
          </label>

          {fan.purchasedItems.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-xs">
              Este fan aún no ha desbloqueado contenido de pago.
            </div>
          ) : (
            <div className="space-y-2">
              {fan.purchasedItems.map((p) => (
                <div
                  key={p.id}
                  className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs"
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
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-4 right-4 z-50 bg-slate-800/95 border border-pink-500/50 text-white px-4 py-2.5 rounded-xl shadow-2xl text-xs flex items-center gap-2 backdrop-blur-md animate-in fade-in slide-in-from-top-2">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header & Global Stats */}
      <div className="p-4 sm:p-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-pink-400" />
              Gestión de Clientes & CRM Omnicanal
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Edición individual y masiva, estados de cliente, notas privadas y exportación.
            </p>
          </div>

          {/* Quick Metrics & Global Actions */}
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

            {/* Create New Fan Button */}
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-pink-600/20 transition-all cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Nuevo Cliente</span>
            </button>

            {/* Export CSV Button */}
            <button
              onClick={() => handleExportCsv(false)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              title="Descargar lista de fans en formato CSV"
            >
              <Download className="w-3.5 h-3.5 text-pink-400" />
              <span className="hidden sm:inline">Exportar CSV</span>
            </button>
          </div>
        </div>

        {/* Filters and Search Controls */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value as any)}
              className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 focus:outline-none focus:border-pink-500/60 flex-1 sm:flex-none cursor-pointer"
            >
              <option value="all">Todos los tiers</option>
              {TIER_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.icon} {t.label}
                </option>
              ))}
            </select>

            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value as any)}
              className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 focus:outline-none focus:border-pink-500/60 flex-1 sm:flex-none cursor-pointer"
            >
              <option value="all">Todas las redes</option>
              {PLATFORM_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
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
              placeholder="Buscar por nombre, @handle, tag o nota..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500/60 placeholder:text-slate-500"
            />
          </div>
        </div>
      </div>

      {/* Main CRM Split View */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Table / List View */}
        <div className="w-full md:w-1/2 lg:w-3/5 border-r border-slate-800 overflow-y-auto">
          {filteredFans.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              No se encontraron clientes con los filtros aplicados.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 sticky top-0 border-b border-slate-800 text-slate-400 font-mono z-10 backdrop-blur-sm">
                <tr>
                  {/* Select All Checkbox */}
                  <th className="p-3 sm:p-3.5 w-10 text-center">
                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      className="text-slate-400 hover:text-white cursor-pointer"
                      title={isAllFilteredSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}
                    >
                      {isAllFilteredSelected ? (
                        <CheckSquare className="w-4 h-4 text-pink-500" />
                      ) : isPartiallySelected ? (
                        <MinusSquare className="w-4 h-4 text-pink-400" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="p-3 sm:p-3.5">Cliente</th>
                  <th className="p-3 sm:p-3.5">Canal</th>
                  <th className="hidden sm:table-cell p-3.5">Categoría</th>
                  <th className="p-3 sm:p-3.5">Gasto LTV</th>
                  <th className="p-3 sm:p-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredFans.map((fan) => {
                  const isRowActive = fan.id === selectedFan?.id;
                  const isChecked = selectedFanIds.has(fan.id);

                  return (
                    <tr
                      key={fan.id}
                      onClick={() => handleSelectFan(fan.id)}
                      className={`cursor-pointer transition-colors group ${
                        isChecked
                          ? 'bg-pink-950/30 border-l-4 border-l-pink-500'
                          : isRowActive
                          ? 'bg-slate-800/50 border-l-4 border-l-purple-500'
                          : 'hover:bg-slate-900/50'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-3 sm:p-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => handleToggleSelectFan(fan.id, e)}
                          className="text-slate-400 hover:text-white cursor-pointer"
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-pink-500" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600 group-hover:text-slate-400" />
                          )}
                        </button>
                      </td>

                      {/* Client Info */}
                      <td className="p-3 sm:p-3.5">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                          <img
                            src={fan.avatar}
                            alt={fan.name}
                            className="w-9 h-9 rounded-full object-cover border border-slate-700 shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="font-semibold text-white truncate text-xs">{fan.name}</p>
                            <p className="text-[10px] text-slate-500 font-mono truncate">
                              {fan.handle}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Platform */}
                      <td className="p-3 sm:p-3.5">
                        <PlatformBadge platform={fan.platform} size="sm" showLabel={false} />
                      </td>

                      {/* Tier */}
                      <td className="hidden sm:table-cell p-3.5">
                        <FanTierBadge tier={fan.tier} size="sm" />
                      </td>

                      {/* LTV */}
                      <td className="p-3 sm:p-3.5">
                        <span className="font-mono font-bold text-emerald-400 block">
                          ${fan.totalSpent.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono block">
                          {fan.purchasedItems.length} compras
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-3 sm:p-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => handleOpenEditModal(fan, e)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Editar cliente"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleOpenDeleteModal(fan, e)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/40 transition-colors cursor-pointer"
                            title="Eliminar cliente"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
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

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* FLOATING BULK ACTIONS TOOLBAR                                         */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {selectedFanIds.size > 0 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 bg-slate-900/95 border border-pink-500/50 shadow-2xl rounded-2xl p-2.5 sm:p-3 backdrop-blur-xl flex items-center gap-2 sm:gap-3 flex-wrap text-xs animate-in slide-in-from-bottom-4">
            <div className="flex items-center gap-1.5 px-2 text-pink-300 font-semibold">
              <CheckSquare className="w-4 h-4 text-pink-400" />
              <span>{selectedFanIds.size} seleccionados</span>
            </div>

            <div className="h-4 w-px bg-slate-700 hidden sm:block" />

            {/* Change Status in Bulk */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-[11px] hidden sm:inline">Cambiar estado:</span>
              <div className="flex gap-1">
                {TIER_OPTIONS.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => handleBulkChangeTier(t.value)}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                    title={`Marcar ${selectedFanIds.size} seleccionados como ${t.label}`}
                  >
                    <span>{t.icon}</span>
                    <span className="hidden md:inline">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="h-4 w-px bg-slate-700 hidden sm:block" />

            {/* Export Selected to CSV */}
            <button
              onClick={() => handleExportCsv(true)}
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
              title="Descargar solo los clientes seleccionados"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">CSV</span>
            </button>

            {/* Delete Selected in Bulk */}
            <button
              onClick={() => setIsBatchDeleteModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-[11px] flex items-center gap-1.5 shadow-lg shadow-red-600/20 cursor-pointer transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Eliminar ({selectedFanIds.size})</span>
            </button>

            {/* Clear Selection */}
            <button
              onClick={handleClearSelection}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              title="Cancelar selección"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Mobile Drawer/Modal for Fan Detail */}
      {isMobileDetailOpen && selectedFan && (
        <div className="fixed inset-0 z-40 bg-slate-950/95 backdrop-blur-sm flex flex-col md:hidden">
          {renderFanDetail(selectedFan)}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: EDITAR CLIENTE (INDIVIDUAL)                                    */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {isEditModalOpen && fanToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-pink-400" />
                <h3 className="font-bold text-white text-base">Editar Perfil de Cliente</h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditFan} className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Nombre</label>
                  <input
                    type="text"
                    required
                    value={fanToEdit.name}
                    onChange={(e) => setFanToEdit({ ...fanToEdit, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-pink-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Handle / Usuario</label>
                  <input
                    type="text"
                    value={fanToEdit.handle}
                    onChange={(e) => setFanToEdit({ ...fanToEdit, handle: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-pink-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Canal / Red</label>
                  <select
                    value={fanToEdit.platform}
                    onChange={(e) => setFanToEdit({ ...fanToEdit, platform: e.target.value as PlatformId })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-pink-500 cursor-pointer"
                  >
                    {PLATFORM_OPTIONS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Categoría / Estado</label>
                  <select
                    value={fanToEdit.tier}
                    onChange={(e) => setFanToEdit({ ...fanToEdit, tier: e.target.value as FanTier })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-amber-300 font-medium focus:outline-none focus:border-pink-500 cursor-pointer"
                  >
                    {TIER_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.icon} {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Total Gastado ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={fanToEdit.totalSpent}
                    onChange={(e) => setFanToEdit({ ...fanToEdit, totalSpent: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-emerald-400 font-mono font-bold focus:outline-none focus:border-pink-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Teléfono o Contacto</label>
                <input
                  type="text"
                  placeholder="Ej: +34 611 234 567 o @usuario"
                  value={fanToEdit.phoneOrUsername || ''}
                  onChange={(e) => setFanToEdit({ ...fanToEdit, phoneOrUsername: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Notas Confidenciales</label>
                <textarea
                  rows={3}
                  value={fanToEdit.notes || ''}
                  onChange={(e) => setFanToEdit({ ...fanToEdit, notes: e.target.value })}
                  placeholder="Preferencias, fetiches, recordatorios privados..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-pink-500 resize-none leading-relaxed"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-semibold rounded-xl shadow-lg shadow-pink-600/20 cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: NUEVO CLIENTE (CREAR)                                          */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">Registrar Nuevo Cliente</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewFan} className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Nombre Completo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Marcos Silva"
                    value={newFanForm.name}
                    onChange={(e) => setNewFanForm({ ...newFanForm, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-pink-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Handle / Usuario</label>
                  <input
                    type="text"
                    placeholder="Ej: @marcos_s"
                    value={newFanForm.handle}
                    onChange={(e) => setNewFanForm({ ...newFanForm, handle: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-pink-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Canal</label>
                  <select
                    value={newFanForm.platform}
                    onChange={(e) => setNewFanForm({ ...newFanForm, platform: e.target.value as PlatformId })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-pink-500 cursor-pointer"
                  >
                    {PLATFORM_OPTIONS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Categoría</label>
                  <select
                    value={newFanForm.tier}
                    onChange={(e) => setNewFanForm({ ...newFanForm, tier: e.target.value as FanTier })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-amber-300 font-medium focus:outline-none focus:border-pink-500 cursor-pointer"
                  >
                    {TIER_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.icon} {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Gasto Inicial ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={newFanForm.totalSpent || ''}
                    onChange={(e) => setNewFanForm({ ...newFanForm, totalSpent: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-emerald-400 font-mono font-bold focus:outline-none focus:border-pink-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Teléfono o Identificador</label>
                <input
                  type="text"
                  placeholder="Ej: +34 600 000 000"
                  value={newFanForm.phoneOrUsername || ''}
                  onChange={(e) => setNewFanForm({ ...newFanForm, phoneOrUsername: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Notas Privadas</label>
                <textarea
                  rows={3}
                  value={newFanForm.notes || ''}
                  onChange={(e) => setNewFanForm({ ...newFanForm, notes: e.target.value })}
                  placeholder="Gustos del fan, preferencias, cómo conoció el canal..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-pink-500 resize-none leading-relaxed"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-600/20 cursor-pointer"
                >
                  Crear Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: ELIMINAR CLIENTE INDIVIDUAL                                    */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {isDeleteModalOpen && fanToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-red-500/40 rounded-2xl w-full max-w-sm shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-950/60 border border-red-500/30 rounded-2xl text-red-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Eliminar Cliente</h3>
                <p className="text-xs text-slate-400">Esta acción no se puede deshacer.</p>
              </div>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center gap-3 text-xs">
              <img src={fanToDelete.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
              <div className="min-w-0">
                <p className="font-bold text-white truncate">{fanToDelete.name}</p>
                <p className="text-[11px] text-slate-500 font-mono truncate">{fanToDelete.handle}</p>
                <p className="text-[10px] text-emerald-400 font-mono font-bold mt-0.5">
                  LTV: ${fanToDelete.totalSpent.toFixed(2)}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              ¿Estás seguro de que deseas eliminar a <strong>{fanToDelete.name}</strong>? Se eliminarán también sus notas privadas y registro en el CRM.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSingle}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl text-xs shadow-lg shadow-red-600/30 cursor-pointer"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: ELIMINAR EN MASA                                               */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {isBatchDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-red-500/40 rounded-2xl w-full max-w-sm shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-950/60 border border-red-500/30 rounded-2xl text-red-400">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Eliminación Masiva</h3>
                <p className="text-xs text-slate-400">Acción permanente e irreversible.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              ¿Estás seguro de que deseas eliminar permanentemente a los{' '}
              <strong className="text-red-400 font-mono font-bold text-sm">
                {selectedFanIds.size}
              </strong>{' '}
              clientes seleccionados?
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsBatchDeleteModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmBatchDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl text-xs shadow-lg shadow-red-600/30 cursor-pointer"
              >
                Eliminar {selectedFanIds.size} Clientes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
