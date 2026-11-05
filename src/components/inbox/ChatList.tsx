import React, { useState } from 'react';
import { Search, Filter, Bot, UserCheck, CheckCircle2, X, Bell } from 'lucide-react';
import { ChatThread, PlatformId, AttendedBy, FanTier, Message } from '../../types';
import { PlatformBadge } from '../common/PlatformBadge';
import { FanTierBadge } from '../common/FanTierBadge';

interface ChatListProps {
  threads: ChatThread[];
  messagesMap?: Record<string, Message[]>;
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  selectedPlatform: PlatformId | 'all';
  onSelectPlatform: (platform: PlatformId | 'all') => void;
  isMobileViewingChat?: boolean;
}

export const ChatList: React.FC<ChatListProps> = ({
  threads,
  messagesMap,
  activeChatId,
  onSelectChat,
  selectedPlatform,
  onSelectPlatform,
  isMobileViewingChat = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [attendedFilter, setAttendedFilter] = useState<'all' | AttendedBy>('all');
  const [tierFilter, setTierFilter] = useState<'all' | FanTier>('all');
  const [onlyUnread, setOnlyUnread] = useState(false);

  const totalUnreadCount = threads.filter(t => (t.unreadCount || 0) > 0).length;

  const filteredThreads = threads.filter((thread) => {
    const matchesPlatform = selectedPlatform === 'all' || thread.platform === selectedPlatform;
    const matchesAttended = attendedFilter === 'all' || thread.attendedBy === attendedFilter;
    const matchesTier = tierFilter === 'all' || thread.fanTier === tierFilter;
    const matchesUnread = !onlyUnread || (thread.unreadCount || 0) > 0;

    const term = searchTerm.trim().toLowerCase();
    let matchesSearch = true;
    if (term) {
      const inName = (thread.fanName || '').toLowerCase().includes(term);
      const inHandle = (thread.fanHandle || '').toLowerCase().includes(term);
      const inLastMsg = (thread.lastMessage || '').toLowerCase().includes(term);
      const inHistory = messagesMap?.[thread.id]?.some((m) =>
        (m.text || '').toLowerCase().includes(term)
      );
      matchesSearch = inName || inHandle || inLastMsg || Boolean(inHistory);
    }

    return matchesPlatform && matchesAttended && matchesTier && matchesUnread && matchesSearch;
  });

  const hasActiveFilters =
    searchTerm !== '' ||
    attendedFilter !== 'all' ||
    tierFilter !== 'all' ||
    selectedPlatform !== 'all' ||
    onlyUnread;

  const handleResetFilters = () => {
    setSearchTerm('');
    setAttendedFilter('all');
    setTierFilter('all');
    onSelectPlatform('all');
    setOnlyUnread(false);
  };

  const platforms: { id: PlatformId | 'all'; label: string }[] = [
    { id: 'all', label: 'Todos' },
    { id: 'onlyfans', label: 'OnlyFans' },
    { id: 'fansly', label: 'Fansly' },
    { id: 'telegram', label: 'Telegram' },
    { id: 'manyvids', label: 'ManyVids' },
    { id: 'whatsapp', label: 'WhatsApp' },
    { id: 'pornhub', label: 'Pornhub' },
    { id: 'scatbook', label: 'Scatbook' },
    { id: 'vipweb', label: 'VIPweb' },
  ];

  return (
    <div
      className={`${
        isMobileViewingChat ? 'hidden md:flex' : 'flex w-full'
      } md:w-80 lg:w-96 border-r border-slate-800 bg-slate-950 flex-col h-full shrink-0`}
    >
      {/* Search and Filters Header */}
      <div className="p-3.5 sm:p-4 border-b border-slate-800 space-y-2.5 sm:space-y-3">
        {/* Search Input with Clear Button */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar fan, @handle o mensaje..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500/60"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
              title="Borrar búsqueda"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Platform Scrollable Filter (RF1.1, RF1.2) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {platforms.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelectPlatform(p.id)}
              className={`text-xs px-2.5 py-1 rounded-lg whitespace-nowrap cursor-pointer transition-colors ${
                selectedPlatform === p.id
                  ? 'bg-pink-600 text-white font-medium shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* State & Tier Secondary Filters + Unread Quick Toggle */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <select
            value={attendedFilter}
            onChange={(e) => setAttendedFilter(e.target.value as any)}
            className="bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-slate-300 text-[11px] focus:outline-none focus:border-pink-500/60"
          >
            <option value="all">Atención: Todos</option>
            <option value="bot">🤖 Solo Bot</option>
            <option value="creator">👩‍🎤 Solo Creadora</option>
          </select>

          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value as any)}
            className="bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-slate-300 text-[11px] focus:outline-none focus:border-pink-500/60"
          >
            <option value="all">Tier: Todos</option>
            <option value="vip">✨ VIP Whales</option>
            <option value="recurrente">🛍️ Recurrentes</option>
            <option value="curioso">👀 Curiosos</option>
            <option value="tacano">⚠️ Tacaños</option>
          </select>
        </div>

        {/* Unread Toggle and Match Count Bar */}
        <div className="flex items-center justify-between text-[11px] pt-0.5">
          <button
            onClick={() => setOnlyUnread(!onlyUnread)}
            className={`px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors cursor-pointer text-[10px] font-medium ${
              onlyUnread
                ? 'bg-pink-500/20 text-pink-400 border border-pink-500/40'
                : 'bg-slate-900 text-slate-400 hover:text-slate-300 border border-slate-800'
            }`}
          >
            <Bell className="w-3 h-3" />
            <span>No leídos {totalUnreadCount > 0 ? `(${totalUnreadCount})` : ''}</span>
          </button>

          <span className="text-slate-500 text-[10px]">
            {filteredThreads.length} de {threads.length} chats
          </span>
        </div>
      </div>

      {/* Threads List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-900">
        {filteredThreads.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs space-y-2">
            <p>No se encontraron conversaciones con estos filtros.</p>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="text-pink-400 hover:text-pink-300 text-[11px] font-medium underline cursor-pointer"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          filteredThreads.map((thread) => {
            const isActive = thread.id === activeChatId;

            return (
              <div
                key={thread.id}
                onClick={() => onSelectChat(thread.id)}
                className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer select-none relative ${
                  isActive
                    ? 'bg-slate-900/90 border-l-4 border-l-pink-500'
                    : 'hover:bg-slate-900/40'
                }`}
              >
                {/* Avatar with Platform and Online Indicator */}
                <div className="relative shrink-0">
                  <img
                    src={thread.fanAvatar}
                    alt={thread.fanName}
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover border border-slate-800"
                  />
                  <div className="absolute -bottom-1 -right-1">
                    <PlatformBadge platform={thread.platform} size="sm" showLabel={false} />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-semibold text-white text-xs truncate">
                        {thread.fanName}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 shrink-0 font-mono">
                      {thread.lastMessageTime}
                    </span>
                  </div>

                  {/* Channel & Attended status */}
                  <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                    <PlatformBadge platform={thread.platform} size="sm" />
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex items-center gap-1 ${
                        thread.attendedBy === 'bot'
                          ? 'bg-pink-500/10 text-pink-400'
                          : 'bg-purple-500/10 text-purple-400'
                      }`}
                    >
                      {thread.attendedBy === 'bot' ? (
                        <>
                          <Bot className="w-2.5 h-2.5" /> Bot
                        </>
                      ) : (
                        <>
                          <UserCheck className="w-2.5 h-2.5" /> Creadora
                        </>
                      )}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono font-medium ml-auto">
                      ${thread.totalSpent}
                    </span>
                  </div>

                  {/* Snippet or Matching History Message */}
                  {(() => {
                    const term = searchTerm.trim().toLowerCase();
                    const inLast = (thread.lastMessage || '').toLowerCase().includes(term);
                    const historicalMatch = term && !inLast
                      ? messagesMap?.[thread.id]?.find(m => (m.text || '').toLowerCase().includes(term))
                      : null;

                    if (historicalMatch) {
                      return (
                        <p className="text-[10.5px] text-pink-300 bg-pink-500/15 border border-pink-500/30 px-1.5 py-0.5 rounded truncate leading-tight">
                          💬 "{historicalMatch.text}"
                        </p>
                      );
                    }
                    return (
                      <p className="text-[11px] text-slate-400 truncate leading-snug">
                        {thread.lastMessage || 'Sin mensajes recientes'}
                      </p>
                    );
                  })()}
                </div>

                {/* Unread Counter Badge */}
                {thread.unreadCount > 0 && (
                  <span className="shrink-0 w-5 h-5 rounded-full bg-pink-600 text-white text-[10px] font-bold flex items-center justify-center mt-1">
                    {thread.unreadCount}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
