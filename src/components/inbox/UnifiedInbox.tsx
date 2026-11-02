import React, { useState, useEffect } from 'react';
import { ChatList } from './ChatList';
import { ChatConversation } from './ChatConversation';
import { FanProfileSidebar } from './FanProfileSidebar';
import { VaultPickerModal } from './VaultPickerModal';
import { PaymentLinkModal } from './PaymentLinkModal';
import { ScheduledModal } from './ScheduledModal';
import {
  ChatThread,
  Message,
  FanProfile,
  VaultItem,
  BotPersona,
  BotRule,
  PaymentGatewayConfig,
  PlatformId,
} from '../../types';

interface UnifiedInboxProps {
  threads: ChatThread[];
  messagesMap: Record<string, Message[]>;
  fans: FanProfile[];
  vaultItems: VaultItem[];
  persona: BotPersona;
  rules: BotRule[];
  gateways: PaymentGatewayConfig[];
  onSendMessage: (chatId: string, text: string, media?: any) => void;
  onToggleAttendedBy: (chatId: string, mode: 'bot' | 'creator') => void;
  onUpdateFan: (updatedFan: FanProfile) => void;
  onUnlockPpv: (chatId: string, messageId: string, itemTitle: string, price: number) => void;
  onConfirmPaymentAndRelease: (chatId: string, messageId: string, amount: number) => void;
  onLoadMessages?: (chatId: string) => Promise<void>;
  selectedThreadId?: string;
}

export const UnifiedInbox: React.FC<UnifiedInboxProps> = ({
  threads,
  messagesMap,
  fans,
  vaultItems,
  persona,
  rules,
  gateways,
  onSendMessage,
  onToggleAttendedBy,
  onUpdateFan,
  onUnlockPpv,
  onConfirmPaymentAndRelease,
  onLoadMessages,
  selectedThreadId,
}) => {
  const [activeChatId, setActiveChatId] = useState<string>(selectedThreadId || threads[0]?.id || '');

  useEffect(() => {
    if (selectedThreadId) {
      setActiveChatId(selectedThreadId);
      setIsMobileViewingChat(true);
    }
  }, [selectedThreadId]);

  // ── Guard: if active chat was deleted, fall back to first available thread ──
  useEffect(() => {
    if (activeChatId && !threads.find(t => t.id === activeChatId)) {
      setActiveChatId(threads[0]?.id || '');
      setIsMobileViewingChat(false);
    }
  }, [threads, activeChatId]);

  const [selectedPlatform, setSelectedPlatform] = useState<PlatformId | 'all'>('all');
  const [isFanDrawerOpen, setIsFanDrawerOpen] = useState(false);
  const [isMobileViewingChat, setIsMobileViewingChat] = useState(false);

  // Modals state
  const [isVaultModalOpen, setIsVaultModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  const activeChat = threads.find((t) => t.id === activeChatId) || threads[0];
  const activeMessages = activeChat ? messagesMap[activeChat.id] || [] : [];
  const activeFan = activeChat ? fans.find((f) => f.id === activeChat.fanId) : undefined;

  const handleSelectChat = (id: string) => {
    setActiveChatId(id);
    setIsMobileViewingChat(true);
    // Lazily load messages from API if not yet fetched
    onLoadMessages?.(id);
  };

  const handleSendFromConversation = (text: string, media?: any) => {
    if (!activeChat) return;
    onSendMessage(activeChat.id, text, media);
  };

  const handleSendVaultItem = (item: VaultItem, asPpv: boolean, price?: number, isViewOnce?: boolean) => {
    if (!activeChat) return;
    const mediaPayload: any = {
      type: item.type,
      url: item.url,
      thumbnailUrl: item.thumbnailUrl,
      title: item.title,
      duration: item.duration,
      isPpv: asPpv,
      ppvPrice: price || item.price,
      isUnlocked: !asPpv,
      isViewOnce: isViewOnce,
    };

    const textCaption = asPpv
      ? `🔒 Contenido Bloqueado: "${item.title}" — Desbloquéalo ahora por $${price || item.price} USD 🔥`
      : `✨ Aquí tienes: "${item.title}"`;

    onSendMessage(activeChat.id, textCaption, mediaPayload);
  };

  const handleSendPaymentLink = (data: {
    gatewayId: string;
    amount: number;
    currency: string;
    messageText: string;
  }) => {
    if (!activeChat) return;
    onSendMessage(activeChat.id, data.messageText);
  };

  const handleScheduleSubmit = (data: { text: string; date: string; time: string; vaultItemId?: string }) => {
    if (!activeChat) return;
    const item = vaultItems.find((v) => v.id === data.vaultItemId);
    const media = item
      ? {
          type: item.type,
          url: item.url,
          title: item.title,
          isPpv: true,
          ppvPrice: item.price,
          isUnlocked: false,
        }
      : undefined;

    onSendMessage(
      activeChat.id,
      `⏱️ [ENVÍO PROGRAMADO PARA ${data.date} a las ${data.time}]: ${data.text}`,
      media
    );
  };

  return (
    <div className="flex-1 flex h-full overflow-hidden relative">
      {/* Col 1: Threads List (hidden on mobile when viewing chat) */}
      <ChatList
        threads={threads}
        messagesMap={messagesMap}
        activeChatId={activeChat?.id || null}
        onSelectChat={handleSelectChat}
        selectedPlatform={selectedPlatform}
        onSelectPlatform={setSelectedPlatform}
        isMobileViewingChat={isMobileViewingChat}
      />

      {/* Col 2: Chat Conversation Canvas (hidden on mobile when NOT viewing chat) */}
      <div
        className={`${
          isMobileViewingChat ? 'flex w-full' : 'hidden md:flex'
        } flex-1 h-full overflow-hidden`}
      >
        {activeChat ? (
          <ChatConversation
            chat={activeChat}
            messages={activeMessages}
            fanProfile={activeFan}
            vaultItems={vaultItems}
            persona={persona}
            rules={rules}
            gateways={gateways}
            onSendMessage={handleSendFromConversation}
            onToggleAttendedBy={(mode) => onToggleAttendedBy(activeChat.id, mode)}
            onOpenVaultModal={() => setIsVaultModalOpen(true)}
            onOpenPaymentModal={() => setIsPaymentModalOpen(true)}
            onOpenScheduleModal={() => setIsScheduleModalOpen(true)}
            onToggleFanDrawer={() => setIsFanDrawerOpen(!isFanDrawerOpen)}
            onUnlockPpv={(messageId, title, price) =>
              onUnlockPpv(activeChat.id, messageId, title, price)
            }
            onConfirmPaymentAndRelease={(messageId, amount) =>
              onConfirmPaymentAndRelease(activeChat.id, messageId, amount)
            }
            onBackToList={() => setIsMobileViewingChat(false)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
            Selecciona una conversación para comenzar
          </div>
        )}
      </div>

      {/* Col 3: Fan CRM Sidebar Drawer (slide-over on mobile) */}
      {activeFan && (
        <FanProfileSidebar
          fan={activeFan}
          isOpen={isFanDrawerOpen}
          onClose={() => setIsFanDrawerOpen(false)}
          onUpdateFan={onUpdateFan}
          onOpenPaymentModal={() => setIsPaymentModalOpen(true)}
        />
      )}

      {/* Modals */}
      <VaultPickerModal
        isOpen={isVaultModalOpen}
        onClose={() => setIsVaultModalOpen(false)}
        vaultItems={vaultItems}
        fanProfile={activeFan}
        onSendItem={handleSendVaultItem}
      />

      <PaymentLinkModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        gateways={gateways}
        fanProfile={activeFan}
        onSendPaymentLink={handleSendPaymentLink}
      />

      <ScheduledModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        vaultItems={vaultItems}
        onSchedule={handleScheduleSubmit}
      />
    </div>
  );
};
