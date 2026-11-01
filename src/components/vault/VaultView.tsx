import React, { useState } from 'react';
import {
  FolderLock,
  Upload,
  Search,
  Filter,
  Film,
  Image as ImageIcon,
  Mic,
  DollarSign,
  Plus,
  Clock,
  Send,
  Eye,
  CheckCircle2,
  Trash2,
  Sparkles,
  Edit2,
} from 'lucide-react';
import { VaultItem, ChatThread, MediaType } from '../../types';

interface VaultViewProps {
  vaultItems: VaultItem[];
  chats: ChatThread[];
  onAddVaultItem: (item: VaultItem) => void;
  onUpdateVaultItem: (id: string, updates: Partial<VaultItem>) => void;
  onDeleteVaultItem: (id: string) => void;
  onSendToChat: (chatId: string, item: VaultItem, asPpv: boolean) => void;
}

export const VaultView: React.FC<VaultViewProps> = ({
  vaultItems,
  chats,
  onAddVaultItem,
  onUpdateVaultItem,
  onDeleteVaultItem,
  onSendToChat,
}) => {
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('todos');
  const [typeFilter, setTypeFilter] = useState<'all' | MediaType>('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  
  // Edit State
  const [editItem, setEditItem] = useState<VaultItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editTags, setEditTags] = useState('');
  const [editFile, setEditFile] = useState<File | null>(null);
  const [isEditingLoading, setIsEditingLoading] = useState(false);

  // Preview State
  const [previewItem, setPreviewItem] = useState<VaultItem | null>(null);

  // Quick Dispatch modal state
  const [dispatchItem, setDispatchItem] = useState<VaultItem | null>(null);
  const [dispatchChatId, setDispatchChatId] = useState(chats[0]?.id || '');
  const [dispatchAsPpv, setDispatchAsPpv] = useState(true);
  const [dispatchSuccess, setDispatchSuccess] = useState(false);

  // New Upload state
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadType, setUploadType] = useState<MediaType>('video');
  const [uploadPrice, setUploadPrice] = useState<number>(35);
  const [uploadTags, setUploadTags] = useState('Exclusivo, PPV, 4K');
  const [uploadDuration, setUploadDuration] = useState('10:00');
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  // Stores a base64 JPEG thumbnail captured from the first frame of the video
  const [uploadVideoThumb, setUploadVideoThumb] = useState<string>('');

  const allTags = [
    'todos',
    'Exclusivo',
    'PPV',
    'Vista Previa',
    'Audio Personalizado',
    'Video Largo',
    'Lencería',
    'Agua / Baño',
  ];

  const filteredItems = vaultItems.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase());
    const matchesTag = selectedTag === 'todos' || item.tags.includes(selectedTag);
    const matchesType = typeFilter === 'all' || item.type === typeFilter;
    return matchesSearch && matchesTag && matchesType;
  });

  /** Captures the first frame of a video File and returns a JPEG data URL */
  const captureVideoThumbnail = (file: File): Promise<string> =>
    new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';

      let resolved = false;
      const finish = (result: string) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timer);
        URL.revokeObjectURL(url);
        resolve(result);
      };

      const timer = setTimeout(() => finish(''), 4000);

      video.onloadedmetadata = () => {
        const target = Math.min(1, (video.duration || 2) * 0.1);
        video.currentTime = target > 0 ? target : 0.1;
      };

      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 360;
          const ctx = canvas.getContext('2d');
          if (ctx && video.videoWidth > 0) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            finish(dataUrl);
            return;
          }
        } catch {
          // ignore
        }
        finish('');
      };

      video.onerror = () => finish('');
      video.src = url;
    });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      const isVideo = file.type.startsWith('video');
      const isAudio = file.type.startsWith('audio');
      setUploadType(isVideo ? 'video' : isAudio ? 'audio' : 'photo');
      setUploadTitle(file.name.replace(/\.[^/.]+$/, ''));

      // Create local object URL for preview (used as fallback URL if server upload fails)
      const objectUrl = URL.createObjectURL(file);
      setUploadPreviewUrl(objectUrl);

      // For videos: also capture a thumbnail frame from the video
      if (isVideo) {
        const thumb = await captureVideoThumbnail(file);
        setUploadVideoThumb(thumb);
      } else {
        setUploadVideoThumb('');
      }
    }
  };

  const handleSaveUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim() || !uploadFile) return;

    setIsUploading(true);
    // Keep blob URL as fallback so the file still loads even if server is down
    let finalUrl = uploadPreviewUrl;

    try {
      const formData = new FormData();
      formData.append('file', uploadFile);

      const serverBase = `http://localhost:${import.meta.env.VITE_PORT || 3000}`;
      const res = await fetch(`${serverBase}/api/vault/upload`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          // Convert relative path to absolute URL so <video> and <img> can load it
          finalUrl = data.url.startsWith('http') ? data.url : `${serverBase}${data.url}`;
        }
      }
    } catch (err) {
      console.error('Error uploading file (falling back to blob URL):', err);
    }

    const tags = uploadTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const defaultThumbs: Record<MediaType, string> = {
      photo: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80',
      video: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
      audio: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80',
    };

    const newItem: VaultItem = {
      id: `ppv-${Date.now()}`,
      title: uploadTitle,
      description: uploadDesc || 'Contenido multimedia cargado desde la PC de la creadora.',
      type: uploadType,
      url: finalUrl,
      // For videos: use the canvas-captured frame so the grid card shows the real content.
      // For photos: use the actual image URL. For audio: use a decorative placeholder.
      thumbnailUrl:
        uploadType === 'video'
          ? (uploadVideoThumb || finalUrl)
          : uploadType === 'photo'
          ? finalUrl
          : defaultThumbs.audio,
      tags,
      price: uploadPrice,
      duration: uploadType !== 'photo' ? uploadDuration : undefined,
      fileSize: `${(uploadFile.size / (1024 * 1024)).toFixed(1)} MB`,
      createdDate: new Date().toISOString().split('T')[0],
    };

    onAddVaultItem(newItem);
    setShowUploadModal(false);
    setIsUploading(false);
    setUploadTitle('');
    setUploadDesc('');
    setUploadPreviewUrl('');
    setUploadFile(null);
    setUploadVideoThumb('');
  };

  const handleDispatch = () => {
    if (!dispatchItem || !dispatchChatId) return;
    onSendToChat(dispatchChatId, dispatchItem, dispatchAsPpv);
    setDispatchSuccess(true);
    setTimeout(() => {
      setDispatchSuccess(false);
      setDispatchItem(null);
    }, 1500);
  };

  const openEditModal = (item: VaultItem) => {
    setEditItem(item);
    setEditTitle(item.title);
    setEditDesc(item.description || '');
    setEditPrice(item.price);
    setEditTags(item.tags.join(', '));
    setEditFile(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    
    setIsEditingLoading(true);
    let finalUrl = editItem.url;
    let finalSize = editItem.fileSize;
    let finalThumbnail = editItem.thumbnailUrl;

    // If a new file was selected, upload it first
    if (editFile) {
      // Capture thumbnail if it's a video
      const isVideoFile = editFile.type.startsWith('video');
      if (isVideoFile) {
        const thumb = await captureVideoThumbnail(editFile);
        if (thumb) finalThumbnail = thumb;
      }

      try {
        const formData = new FormData();
        formData.append('file', editFile);

        const serverBase = `http://localhost:${import.meta.env.VITE_PORT || 3000}`;
        const res = await fetch(`${serverBase}/api/vault/upload`, {
          method: 'POST',
          body: formData,
        });
        if (res.ok) {
          const data = await res.json();
          if (data.url) {
            finalUrl = data.url.startsWith('http') ? data.url : `${serverBase}${data.url}`;
            finalSize = `${(editFile.size / (1024 * 1024)).toFixed(1)} MB`;
            // For photos: the URL itself is the thumbnail
            if (editItem.type === 'photo') finalThumbnail = finalUrl;
          }
        }
      } catch (err) {
        console.error('Error uploading new file during edit (blob fallback):', err);
        // Fallback: use a blob URL so the preview still works this session
        finalUrl = URL.createObjectURL(editFile);
        finalSize = `${(editFile.size / (1024 * 1024)).toFixed(1)} MB`;
        if (editItem.type === 'photo') finalThumbnail = finalUrl;
      }
    }
    
    const tags = editTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
      
    onUpdateVaultItem(editItem.id, {
      title: editTitle,
      description: editDesc,
      price: editPrice,
      tags,
      url: finalUrl,
      thumbnailUrl: finalThumbnail,
      fileSize: finalSize
    });
    
    setIsEditingLoading(false);
    setEditItem(null);
    setEditFile(null);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
      {/* Top Header */}
      <div className="p-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FolderLock className="w-5 h-5 text-pink-400" />
              Bóveda de Contenido Multimedia (Vault)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              RF3.1 a RF3.4: Sube archivos desde tu PC, clasifícalos por etiquetas y despáchalos en tiempo real o programados.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-medium text-xs flex items-center gap-2 shadow-lg shadow-pink-600/25 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              Subir Archivo Local (PC)
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`text-xs px-3 py-1.5 rounded-lg whitespace-nowrap cursor-pointer transition-colors ${
                  selectedTag === tag
                    ? 'bg-pink-600 text-white font-medium'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                {tag === 'todos' ? 'Todos los tags' : `#${tag}`}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 focus:outline-none focus:border-pink-500/60"
            >
              <option value="all">Todos los formatos</option>
              <option value="video">🎥 Videos</option>
              <option value="photo">📸 Fotos</option>
              <option value="audio">🎙️ Audios / Notas de voz</option>
            </select>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar por título..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-pink-500/60"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Vault Items */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-pink-500/40 transition-all flex flex-col justify-between group shadow-lg"
            >
              <div>
                <div className="relative h-44 w-full bg-slate-950 overflow-hidden cursor-pointer" onClick={() => setPreviewItem(item)}>
                  {item.type === 'video' ? (
                    <div className="w-full h-full relative group-hover:scale-105 transition-transform duration-500 ease-out bg-slate-950 flex items-center justify-center">
                      <video
                        key={item.url}
                        src={`${item.url}#t=0.5`}
                        preload="metadata"
                        muted
                        playsInline
                        className="w-full h-full object-cover pointer-events-none"
                      />
                      {/* Play button overlay */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/25 group-hover:bg-black/45 transition-colors">
                        <div className="w-12 h-12 rounded-full bg-pink-600/90 text-white flex items-center justify-center shadow-lg transform transition-transform group-hover:scale-110">
                          <div className="w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-l-[14px] border-l-white ml-1" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <img
                      src={item.thumbnailUrl || (item.type === 'audio' ? 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80' : 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80')}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null;
                        if (item.type === 'audio') target.src = 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80';
                        else target.src = 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80';
                      }}
                    />
                  )}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-black/80 text-pink-400 backdrop-blur-sm flex items-center gap-1">
                      {item.type === 'video' ? (
                        <Film className="w-3 h-3" />
                      ) : item.type === 'audio' ? (
                        <Mic className="w-3 h-3" />
                      ) : (
                        <ImageIcon className="w-3 h-3" />
                      )}
                      {item.type}
                    </span>
                    {item.duration && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/80 text-slate-300 backdrop-blur-sm">
                        {item.duration}
                      </span>
                    )}
                  </div>

                  <div className="absolute top-2.5 right-2.5">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-pink-600 text-white shadow-md">
                      ${item.price} USD
                    </span>
                  </div>
                </div>

                <div className="p-4">
                  <h4 className="font-semibold text-white text-xs line-clamp-1 group-hover:text-pink-400 transition-colors">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                    {item.description}
                  </p>

                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {item.tags.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] bg-slate-800/80 border border-slate-700/50 text-slate-300 px-2 py-0.5 rounded-full font-medium tracking-wide shadow-sm"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 pt-0 border-t border-slate-800/80 mt-2 flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-mono">
                  {item.fileSize || 'HD'}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewItem(item)}
                    className="p-1.5 text-slate-500 hover:text-emerald-400 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors"
                    title="Previsualizar contenido"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => openEditModal(item)}
                    className="p-1.5 text-slate-500 hover:text-blue-400 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors"
                    title="Editar detalles"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteVaultItem(item.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors"
                    title="Eliminar de la bóveda"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setDispatchItem(item)}
                    className="px-3 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                  >
                    <Send className="w-3 h-3" /> Despachar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upload Modal (RF3.1) */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <h3 className="font-semibold text-white text-sm flex items-center gap-2">
              <Upload className="w-4 h-4 text-pink-400" />
              Subir Archivo Local a la Bóveda (PC)
            </h3>

            <form onSubmit={handleSaveUpload} className="space-y-4">
              {/* File input area */}
              <div className="border-2 border-dashed border-slate-700 hover:border-pink-500 rounded-2xl p-6 text-center cursor-pointer bg-slate-950/50 transition-colors relative">
                <input
                  type="file"
                  accept="image/*,video/*,audio/*"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <Upload className="w-8 h-8 text-pink-400 mx-auto mb-2" />
                <p className="text-xs font-medium text-white">Haz clic o arrastra fotos, videos o audios</p>
                <p className="text-[11px] text-slate-500 mt-1">Soporta MP4, MOV, JPG, PNG, MP3, WAV</p>
              </div>

              {uploadPreviewUrl && (
                <div className="p-3 bg-pink-500/10 border border-pink-500/30 rounded-xl text-xs text-pink-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-pink-400 shrink-0" />
                  <span className="truncate">Archivo cargado en memoria local listo para catalogar</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Título del Contenido</label>
                <input
                  type="text"
                  placeholder="Ej. Set Lencería Negra de Encaje"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500/60"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Descripción corta</label>
                <textarea
                  rows={2}
                  placeholder="Detalles que verá el cliente antes o después de desbloquear..."
                  value={uploadDesc}
                  onChange={(e) => setUploadDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-pink-500/60"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Precio PPV (USD)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={uploadPrice}
                    onChange={(e) => setUploadPrice(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500/60"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Tipo de Formato</label>
                  <select
                    value={uploadType}
                    onChange={(e) => setUploadType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500/60"
                  >
                    <option value="video">Video (MP4 / MOV)</option>
                    <option value="photo">Foto (Set / Imagen)</option>
                    <option value="audio">Audio / Nota de voz</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Etiquetas (Separadas por comas)
                </label>
                <input
                  type="text"
                  placeholder="Exclusivo, PPV, 4K, Lencería"
                  value={uploadTags}
                  onChange={(e) => setUploadTags(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500/60"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-medium bg-pink-600 hover:bg-pink-500 text-white rounded-xl cursor-pointer"
                >
                  Guardar en Bóveda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dispatch Modal */}
      {dispatchItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <h3 className="font-semibold text-white text-sm flex items-center gap-2">
              <Send className="w-4 h-4 text-pink-400" />
              Despachar "{dispatchItem.title}"
            </h3>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Seleccionar Chat / Fan Destino
              </label>
              <select
                value={dispatchChatId}
                onChange={(e) => setDispatchChatId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-pink-500/60"
              >
                {chats.map((c) => (
                  <option key={c.id} value={c.id}>
                    [{c.platform.toUpperCase()}] {c.fanName} ({c.fanTier.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <input
                type="checkbox"
                checked={dispatchAsPpv}
                onChange={(e) => setDispatchAsPpv(e.target.checked)}
                className="w-4 h-4 rounded text-pink-600 bg-slate-900 border-slate-700"
              />
              <span>Bloquear como PPV (${dispatchItem.price} USD)</span>
            </label>

            {dispatchSuccess ? (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 text-center font-semibold">
                ¡Contenido enviado con éxito al chat!
              </div>
            ) : (
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDispatchItem(null)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDispatch}
                  className="px-5 py-2 text-xs font-medium bg-pink-600 hover:bg-pink-500 text-white rounded-xl cursor-pointer"
                >
                  Enviar Ahora
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <h3 className="font-semibold text-white text-sm flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-blue-400" />
              Editar Detalles del Contenido
            </h3>

            <form onSubmit={handleSaveEdit} className="space-y-4 mt-4">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 uppercase mb-1.5">Reemplazar Archivo (Opcional)</label>
                <div className="flex items-center gap-3">
                  <label className="flex-1 cursor-pointer bg-slate-950 border border-slate-800 hover:border-blue-500/50 rounded-xl px-4 py-2.5 flex items-center justify-center gap-2 transition-colors">
                    <Upload className="w-4 h-4 text-slate-400" />
                    <span className="text-xs text-slate-300 font-medium truncate">
                      {editFile ? editFile.name : 'Seleccionar nuevo archivo...'}
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          setEditFile(e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                  {editFile && (
                    <button
                      type="button"
                      onClick={() => setEditFile(null)}
                      className="p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                      title="Quitar archivo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 mt-1.5">Si no seleccionas nada, se mantendrá el archivo original.</p>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 uppercase mb-1.5">Título del Contenido</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 uppercase mb-1.5">Precio (USD) - 0 para Gratis</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={editPrice}
                  onChange={(e) => setEditPrice(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 uppercase mb-1.5">Etiquetas (separadas por coma)</label>
                <input
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 uppercase mb-1.5">Descripción (Opcional)</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none h-20 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setEditItem(null)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                  disabled={isEditingLoading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isEditingLoading}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isEditingLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    'Guardar Cambios'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewItem && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/95 backdrop-blur-md p-4"
          onClick={() => setPreviewItem(null)}
        >
          <div 
            className="relative w-full max-w-4xl bg-black rounded-3xl overflow-hidden shadow-2xl flex flex-col items-center justify-center min-h-[50vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button 
              onClick={() => setPreviewItem(null)}
              className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/50 hover:bg-rose-600 rounded-full text-white flex items-center justify-center transition-colors backdrop-blur-sm text-lg font-bold"
            >
              ✕
            </button>
            
            {/* Media Player */}
            {previewItem.type === 'video' ? (
              <video 
                key={previewItem.url}
                src={previewItem.url} 
                controls 
                autoPlay 
                playsInline
                className="w-full max-h-[85vh] object-contain bg-black"
                onError={(e) => {
                  console.error('[Preview] Video failed to load:', previewItem.url, e);
                }}
              />
            ) : previewItem.type === 'audio' ? (
              <div className="w-full max-w-md p-10 flex flex-col items-center justify-center bg-slate-900 border border-slate-800 rounded-2xl m-8">
                <Mic className="w-16 h-16 text-pink-500 mb-6 animate-pulse" />
                <h3 className="text-white font-medium mb-8 text-center">{previewItem.title}</h3>
                <audio 
                  key={previewItem.url}
                  src={previewItem.url} 
                  controls 
                  autoPlay 
                  className="w-full"
                  onError={(e) => {
                    console.error('[Preview] Audio failed to load:', previewItem.url, e);
                  }}
                />
              </div>
            ) : (
              <img 
                src={previewItem.url} 
                alt={previewItem.title} 
                className="w-full max-h-[85vh] object-contain"
                onError={(e) => {
                  const t = e.target as HTMLImageElement;
                  t.onerror = null;
                  t.src = 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80';
                }}
              />
            )}
            
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
              <h3 className="text-white font-semibold text-lg">{previewItem.title}</h3>
              <p className="text-slate-300 text-sm">{previewItem.description}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
