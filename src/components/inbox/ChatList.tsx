import React, { useState } from 'react';
import { Search, Filter, Bot, UserCheck, CheckCircle2 } from 'lucide-react';
import { ChatThread, PlatformId, AttendedBy, FanTier } from '../../types';
import { PlatformBadge } from '../common/PlatformBadge';
import { FanTierBadge } from '../common/FanTierBadge';

interface ChatListProps {
  threads: ChatThread[];
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  selectedPlatform: PlatformId | 'all';
  onSelectPlatform: (platform: PlatformId | 'all') => void;
}

export const ChatList: React.FC<ChatListProps> = ({
  threads,
  activeChatId,
  onSelectChat,
  selectedPlatform,
  onSelectPlatform,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [attendedFilter, setAttendedFilter] = useState<'all' | AttendedBy>('all');
  const [tierFilter, setTierFilter] = useState<'all' | FanTier>('all');

  const filteredThreads = threads.filter((thread) => {
    const matchesPlatform = selectedPlatform === 'all' || thread.platform === selectedPlatform;
    const matchesAttended = attendedFilter === 'all' || thread.attendedBy === attendedFilter;
    const matchesTier = tierFilter === 'all' || thread.fanTier === tierFilter;
    const matchesSearch =
      thread.fanName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      thread.fanHandle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      thread.lastMessage.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesPlatform && matchesAttended && matchesTier && matchesSearch;
  });

  const platforms: { id: PlatformId | 'all'; label: string }[] = [
    { id: 'all', label: 'Todos los canales' },
    { id: 'fansly', label: 'Fansly' },
    { id: 'telegram', label: 'Telegram' },
    { id: 'manyvids', label: 'ManyVids' },
    { id: 'whatsapp', label: 'WhatsApp' },
    { id: 'pornhub', label: 'Pornhub' },
    { id: 'scatbook', label: 'Scatbook' },
    { id: 'vipweb', label: 'VIPweb' },
  ];

  return (
    <div className="w-80 sm:w-96 border-r border-slate-800 bg-slate-950 flex flex-col h-full shrink-0">
      {/* Search and Filters Header */}
      <div className="p-4 border-b border-slate-800 space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar fan, @handle o mensaje..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500/60"
          />
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

        {/* State & Tier Secondary Filters (RF1.4, RF5.2) */}
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
      </div>

      {/* Threads List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-900">
        {filteredThreads.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No se encontraron conversaciones con estos filtros.
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
                    className="w-11 h-11 rounded-full object-cover border border-slate-800"
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
                  <div className="flex items-center gap-1.5 mb-1.5">
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

                  {/* Snippet */}
                  <p className="text-[11px] text-slate-400 truncate leading-snug">
                    {thread.lastMessage}
                  </p>
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
