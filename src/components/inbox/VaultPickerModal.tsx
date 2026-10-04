import React, { useState } from 'react';
import { X, Search, Lock, Unlock, Eye, Sparkles, AlertTriangle } from 'lucide-react';
import { VaultItem, FanProfile } from '../../types';

interface VaultPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  vaultItems: VaultItem[];
  fanProfile?: FanProfile;
  onSendItem: (item: VaultItem, asPpv: boolean, customPrice?: number, isViewOnce?: boolean) => void;
}

export const VaultPickerModal: React.FC<VaultPickerModalProps> = ({
  isOpen,
  onClose,
  vaultItems,
  fanProfile,
  onSendItem,
}) => {
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('todos');
  const [isPpvMode, setIsPpvMode] = useState(true);
  const [isViewOnce, setIsViewOnce] = useState(false);

  if (!isOpen) return null;

  const allTags = ['todos', 'Exclusivo', 'PPV', 'Vista Previa', 'Audio Personalizado', 'Video Largo', 'Lencería'];

  const filtered = vaultItems.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const matchesTag = selectedTag === 'todos' || item.tags.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  const alreadyPurchasedIds = new Set(fanProfile?.purchasedItems.map((p) => p.vaultItemId) || []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-pink-400" />
              Bóveda de Contenido Multimedia
            </h3>
            <p className="text-xs text-slate-400">
              Selecciona un archivo para enviar a {fanProfile?.name || 'este chat'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options Bar */}
        <div className="px-6 py-3 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-xs">
            <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300">
              <input
                type="checkbox"
                checked={isPpvMode}
                onChange={(e) => setIsPpvMode(e.target.checked)}
                className="w-4 h-4 rounded text-pink-600 focus:ring-0 bg-slate-900 border-slate-700"
              />
              <span className="flex items-center gap-1 font-medium">
                <Lock className="w-3.5 h-3.5 text-pink-400" /> Bloquear como PPV (De pago)
              </span>
            </label>

            {fanProfile?.platform === 'whatsapp' && (
              <label className="flex items-center gap-2 cursor-pointer select-none text-emerald-400">
                <input
                  type="checkbox"
                  checked={isViewOnce}
                  onChange={(e) => setIsViewOnce(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-0 bg-slate-900 border-slate-700"
                />
                <span className="flex items-center gap-1 font-medium">
                  <Eye className="w-3.5 h-3.5" /> Enviar como Foto Efímera (1 sola vista)
                </span>
              </label>
            )}
          </div>

          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar contenido o tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-pink-500/60"
            />
          </div>
        </div>

        {/* Tags */}
        <div className="px-6 py-2 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto">
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`text-[11px] px-2.5 py-1 rounded-full whitespace-nowrap cursor-pointer transition-colors ${
                selectedTag === tag
                  ? 'bg-pink-600 text-white font-medium'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              {tag === 'todos' ? 'Todos los archivos' : `#${tag}`}
            </button>
          ))}
        </div>

        {/* Content Grid */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
          {filtered.map((item) => {
            const alreadyBought = alreadyPurchasedIds.has(item.id);

            return (
              <div
                key={item.id}
                className={`relative bg-slate-950 border rounded-xl overflow-hidden transition-all flex flex-col justify-between group ${
                  alreadyBought ? 'border-amber-500/40 bg-amber-500/5' : 'border-slate-800 hover:border-pink-500/40'
                }`}
              >
                <div>
                  <div className="relative h-32 w-full overflow-hidden bg-slate-900">
                    <img
                      src={item.thumbnailUrl}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2 left-2 flex items-center gap-1.5">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-black/75 text-pink-400 backdrop-blur-sm">
                        {item.type}
                      </span>
                      {item.duration && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/75 text-slate-300 backdrop-blur-sm">
                          {item.duration}
                        </span>
                      )}
                    </div>
                    <div className="absolute top-2 right-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-pink-600 text-white shadow-md">
                        ${item.price} USD
                      </span>
                    </div>

                    {alreadyBought && (
                      <div className="absolute inset-0 bg-amber-950/60 backdrop-blur-[2px] flex items-center justify-center p-2 text-center">
                        <span className="text-xs font-semibold text-amber-300 flex items-center gap-1 bg-amber-900/80 px-2 py-1 rounded-md border border-amber-500/40">
                          <AlertTriangle className="w-3.5 h-3.5" /> Ya adquirido por este fan
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-3">
                    <h4 className="text-xs font-semibold text-white line-clamp-1">{item.title}</h4>
                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">{item.description}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.tags.map((t) => (
                        <span key={t} className="text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-3 pt-0 border-t border-slate-900 mt-2 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">
                    {item.fileSize || 'Alta resolución'}
                  </span>
                  <button
                    onClick={() => {
                      onSendItem(item, isPpvMode, item.price, isViewOnce);
                      onClose();
                    }}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                      isPpvMode
                        ? 'bg-pink-600 hover:bg-pink-500 text-white shadow-sm'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                    }`}
                  >
                    {isPpvMode ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                    {isPpvMode ? `Enviar PPV ($${item.price})` : 'Enviar Libre'}
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
