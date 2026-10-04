import React, { useState } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, MainView } from './components/layout/Sidebar';
import { UnifiedInbox } from './components/inbox/UnifiedInbox';
import { BotEngineView } from './components/bot/BotEngineView';
import { VaultView } from './components/vault/VaultView';
import { PaymentsView } from './components/payments/PaymentsView';
import { CrmView } from './components/crm/CrmView';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { ChannelsView } from './components/channels/ChannelsView';
import { SimulateIncomingModal } from './components/inbox/SimulateIncomingModal';
import {
  INITIAL_CHANNELS,
  INITIAL_VAULT,
  INITIAL_FANS,
  INITIAL_CHATS,
  INITIAL_MESSAGES,
  INITIAL_BOT_PERSONA,
  INITIAL_BOT_RULES,
  INITIAL_FAQS,
  INITIAL_PAYMENT_GATEWAYS,
} from './mock/initialData';
import {
  ChannelIntegration,
  VaultItem,
  FanProfile,
  ChatThread,
  Message,
  BotPersona,
  BotRule,
  FAQItem,
  PaymentGatewayConfig,
  PlatformId,
  FanTier,
} from './types';
import { requestBotReply } from './services/geminiService';

export default function App() {
  const [currentView, setCurrentView] = useState<MainView>('inbox');
  const [channels, setChannels] = useState<ChannelIntegration[]>(INITIAL_CHANNELS);
  const [vaultItems, setVaultItems] = useState<VaultItem[]>(INITIAL_VAULT);
  const [fans, setFans] = useState<FanProfile[]>(INITIAL_FANS);
  const [threads, setThreads] = useState<ChatThread[]>(INITIAL_CHATS);
  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>(INITIAL_MESSAGES);
  const [persona, setPersona] = useState<BotPersona>(INITIAL_BOT_PERSONA);
  const [rules, setRules] = useState<BotRule[]>(INITIAL_BOT_RULES);
  const [faqs, setFaqs] = useState<FAQItem[]>(INITIAL_FAQS);
  const [gateways, setGateways] = useState<PaymentGatewayConfig[]>(INITIAL_PAYMENT_GATEWAYS);
  const [isGlobalBotActive, setIsGlobalBotActive] = useState<boolean>(true);
  const [isSimulateModalOpen, setIsSimulateModalOpen] = useState<boolean>(false);

  const totalUnread = threads.reduce((acc, t) => acc + t.unreadCount, 0);
  const todayRevenue = channels.reduce((acc, c) => acc + c.todayRevenue, 0);

  // Send message from creator (RF1.4: automatically pauses bot for this chat)
  const handleSendMessage = (chatId: string, text: string, media?: any) => {
    const thread = threads.find((t) => t.id === chatId);
    if (!thread) return;

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      chatId,
      sender: 'creator',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      media,
      status: 'delivered',
    };

    // Update messages
    setMessagesMap((prev) => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), newMessage],
    }));

    // Update thread: switch to creator manual control and pause bot (RF1.4)
    setThreads((prev) =>
      prev.map((t) => {
        if (t.id === chatId) {
          return {
            ...t,
            attendedBy: 'creator',
            botPausedReason: 'Intervención manual de la creadora hace un momento',
            lastMessage: text,
            lastMessageTime: newMessage.timestamp,
            unreadCount: 0,
          };
        }
        return t;
      })
    );
  };

  // Toggle attended by state
  const handleToggleAttendedBy = (chatId: string, mode: 'bot' | 'creator') => {
    setThreads((prev) =>
      prev.map((t) => {
        if (t.id === chatId) {
          return {
            ...t,
            attendedBy: mode,
            botPausedReason: mode === 'creator' ? 'Modo manual activado por la creadora' : undefined,
          };
        }
        return t;
      })
    );
  };

  // Unlock PPV Content and record purchase
  const handleUnlockPpv = (chatId: string, messageId: string, itemTitle: string, price: number) => {
    const thread = threads.find((t) => t.id === chatId);
    if (!thread) return;

    // Update message state
    setMessagesMap((prev) => {
      const chatMsgs = prev[chatId] || [];
      return {
        ...prev,
        [chatId]: chatMsgs.map((m) => {
          if (m.id === messageId && m.media) {
            return {
              ...m,
              media: { ...m.media, isUnlocked: true },
            };
          }
          return m;
        }),
      };
    });

    // Update fan spending and purchase history
    setFans((prev) =>
      prev.map((f) => {
        if (f.id === thread.fanId) {
          const newPurchase = {
            id: `ord-${Date.now()}`,
            vaultItemId: 'ppv-unlocked',
            itemTitle,
            amount: price,
            date: new Date().toISOString().split('T')[0],
            platform: thread.platform,
            paymentMethod: `${thread.platform.toUpperCase()} Saldo/Directo`,
          };
          const newTotal = f.totalSpent + price;
          const newTier: FanTier = newTotal >= 250 ? 'vip' : newTotal >= 50 ? 'recurrente' : 'curioso';
          return {
            ...f,
            totalSpent: newTotal,
            tier: newTier,
            purchasedItems: [newPurchase, ...f.purchasedItems],
          };
        }
        return f;
      })
    );

    // Update thread spending
    setThreads((prev) =>
      prev.map((t) => (t.id === chatId ? { ...t, totalSpent: t.totalSpent + price } : t))
    );

    // Update channel revenue
    setChannels((prev) =>
      prev.map((c) =>
        c.id === thread.platform ? { ...c, todayRevenue: c.todayRevenue + price } : c
      )
    );
  };

  // Confirm external payment and automatically release content (RF4.2)
  const handleConfirmPaymentAndRelease = (chatId: string, messageId: string, amount: number) => {
    const thread = threads.find((t) => t.id === chatId);
    if (!thread) return;

    // Confirm transaction in message
    setMessagesMap((prev) => {
      const chatMsgs = prev[chatId] || [];
      const updated = chatMsgs.map((m) => {
        if (m.id === messageId && m.paymentDetails) {
          return {
            ...m,
            paymentDetails: { ...m.paymentDetails, status: 'confirmed' as const },
          };
        }
        return m;
      });

      // Release content automatically
      const unlockedItem = vaultItems.find((v) => v.price === amount) || vaultItems[1];
      const autoReleaseMessage: Message = {
        id: `msg-release-${Date.now()}`,
        chatId,
        sender: 'bot',
        text: `✅ ¡Pago de $${amount} USD confirmado exitosamente! Aquí tienes tu contenido desbloqueado de inmediato amor, ¡disfrútalo muchísimo! 💋🔥`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        media: {
          type: unlockedItem.type,
          url: unlockedItem.url,
          title: unlockedItem.title,
          isPpv: true,
          ppvPrice: amount,
          isUnlocked: true,
        },
        status: 'delivered',
      };

      return {
        ...prev,
        [chatId]: [...updated, autoReleaseMessage],
      };
    });

    // Update fan LTV and purchase history
    setFans((prev) =>
      prev.map((f) => {
        if (f.id === thread.fanId) {
          const newPurchase = {
            id: `ord-ext-${Date.now()}`,
            vaultItemId: 'ppv-released',
            itemTitle: `Contenido Liberado ($${amount})`,
            amount,
            date: new Date().toISOString().split('T')[0],
            platform: thread.platform,
            paymentMethod: 'Crypto / Enlace Externo',
          };
          const newTotal = f.totalSpent + amount;
          return {
            ...f,
            totalSpent: newTotal,
            purchasedItems: [newPurchase, ...f.purchasedItems],
          };
        }
        return f;
      })
    );

    // Update channel revenue
    setChannels((prev) =>
      prev.map((c) =>
        c.id === thread.platform ? { ...c, todayRevenue: c.todayRevenue + amount } : c
      )
    );
  };

  // Simulate Incoming Message from any of the 7 channels
  const handleSimulateIncoming = async (params: {
    platform: PlatformId;
    fanName: string;
    fanTier: FanTier;
    text: string;
    triggerBotReply: boolean;
  }) => {
    // Find or create thread
    let existingThread = threads.find(
      (t) => t.platform === params.platform && t.fanName === params.fanName
    );

    let chatId = existingThread?.id;

    if (!existingThread) {
      chatId = `chat-sim-${Date.now()}`;
      const newFanId = `fan-sim-${Date.now()}`;

      const newFan: FanProfile = {
        id: newFanId,
        name: params.fanName,
        handle: `@${params.fanName.toLowerCase().replace(/\s+/g, '_')}`,
        avatar:
          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
        platform: params.platform,
        tier: params.fanTier,
        totalSpent: params.fanTier === 'vip' ? 300 : params.fanTier === 'recurrente' ? 80 : 0,
        joinDate: new Date().toISOString().split('T')[0],
        lastActive: 'En línea',
        notes: `Nuevo cliente simulado proveniente de ${params.platform.toUpperCase()}.`,
        tags: [params.platform, params.fanTier],
        preferences: ['Contenido exclusivo'],
        purchasedItems: [],
      };

      const newThread: ChatThread = {
        id: chatId,
        fanId: newFanId,
        fanName: params.fanName,
        fanHandle: newFan.handle,
        fanAvatar: newFan.avatar,
        platform: params.platform,
        attendedBy: 'bot',
        lastMessage: params.text,
        lastMessageTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        unreadCount: 1,
        fanTier: params.fanTier,
        totalSpent: newFan.totalSpent,
        isOnline: true,
      };

      setFans((prev) => [newFan, ...prev]);
      setThreads((prev) => [newThread, ...prev]);
      existingThread = newThread;
    } else {
      // Update existing thread
      setThreads((prev) =>
        prev.map((t) =>
          t.id === chatId
            ? {
                ...t,
                lastMessage: params.text,
                lastMessageTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                unreadCount: t.unreadCount + 1,
                isOnline: true,
              }
            : t
        )
      );
    }

    const fanMsg: Message = {
      id: `msg-${Date.now()}`,
      chatId: chatId!,
      sender: 'fan',
      text: params.text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'read',
    };

    setMessagesMap((prev) => ({
      ...prev,
      [chatId!]: [...(prev[chatId!] || []), fanMsg],
    }));

    // Trigger Bot Auto-Reply if enabled & thread attended by bot
    if (params.triggerBotReply && isGlobalBotActive && existingThread.attendedBy === 'bot') {
      setTimeout(async () => {
        try {
          const res = await requestBotReply({
            fanName: params.fanName,
            fanTier: params.fanTier,
            platform: params.platform,
            persona,
            rules,
            messages: [...(messagesMap[chatId!] || []), fanMsg],
            vaultMenu: vaultItems,
          });

          const botMsg: Message = {
            id: `msg-bot-${Date.now()}`,
            chatId: chatId!,
            sender: 'bot',
            text: res.reply,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: 'delivered',
          };

          // If suggested PPV
          if (res.suggestedPpvId) {
            const ppvItem = vaultItems.find((v) => v.id === res.suggestedPpvId) || vaultItems[0];
            botMsg.media = {
              type: ppvItem.type,
              url: ppvItem.url,
              title: ppvItem.title,
              isPpv: true,
              ppvPrice: ppvItem.price,
              isUnlocked: false,
            };
          }

          setMessagesMap((prev) => ({
            ...prev,
            [chatId!]: [...(prev[chatId!] || []), botMsg],
          }));

          setThreads((prev) =>
            prev.map((t) =>
              t.id === chatId
                ? {
                    ...t,
                    lastMessage: botMsg.text,
                    lastMessageTime: botMsg.timestamp,
                  }
                : t
            )
          );
        } catch (e) {
          console.error(e);
        }
      }, (persona.humanTypingDelaySeconds || 2) * 1000);
    }

    // Switch view to inbox so creator sees the arrival
    setCurrentView('inbox');
  };

  const handleUpdateFan = (updated: FanProfile) => {
    setFans((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
    setThreads((prev) =>
      prev.map((t) => (t.fanId === updated.id ? { ...t, fanTier: updated.tier } : t))
    );
  };

  const handleAddVaultItem = (item: VaultItem) => {
    setVaultItems((prev) => [item, ...prev]);
  };

  const handleDeleteVaultItem = (id: string) => {
    setVaultItems((prev) => prev.filter((v) => v.id !== id));
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans selection:bg-pink-500/30 selection:text-pink-200">
      {/* Top Navbar */}
      <Navbar
        channels={channels}
        isGlobalBotActive={isGlobalBotActive}
        onToggleGlobalBot={() => setIsGlobalBotActive(!isGlobalBotActive)}
        onOpenSimulateModal={() => setIsSimulateModalOpen(true)}
        todayTotalRevenue={todayRevenue}
        unreadCount={totalUnread}
      />

      {/* Main Layout Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar Navigation */}
        <Sidebar
          currentView={currentView}
          onSelectView={setCurrentView}
          unreadCount={totalUnread}
          channelsCount={channels.length}
        />

        {/* Dynamic Views */}
        <main className="flex-1 flex overflow-hidden bg-slate-950">
          {currentView === 'inbox' && (
            <UnifiedInbox
              threads={threads}
              messagesMap={messagesMap}
              fans={fans}
              vaultItems={vaultItems}
              persona={persona}
              rules={rules}
              gateways={gateways}
              onSendMessage={handleSendMessage}
              onToggleAttendedBy={handleToggleAttendedBy}
              onUpdateFan={handleUpdateFan}
              onUnlockPpv={handleUnlockPpv}
              onConfirmPaymentAndRelease={handleConfirmPaymentAndRelease}
            />
          )}

          {currentView === 'bot' && (
            <BotEngineView
              persona={persona}
              rules={rules}
              faqs={faqs}
              vaultItems={vaultItems}
              onUpdatePersona={setPersona}
              onUpdateRules={setRules}
              onUpdateFaqs={setFaqs}
            />
          )}

          {currentView === 'vault' && (
            <VaultView
              vaultItems={vaultItems}
              chats={threads}
              onAddVaultItem={handleAddVaultItem}
              onDeleteVaultItem={handleDeleteVaultItem}
              onSendToChat={(chatId, item, asPpv) => {
                const text = asPpv
                  ? `🔒 Contenido Bloqueado: "${item.title}" ($${item.price} USD)`
                  : `✨ Aquí tienes: "${item.title}"`;
                handleSendMessage(chatId, text, {
                  type: item.type,
                  url: item.url,
                  title: item.title,
                  isPpv: asPpv,
                  ppvPrice: item.price,
                  isUnlocked: !asPpv,
                });
                setCurrentView('inbox');
              }}
            />
          )}

          {currentView === 'payments' && (
            <PaymentsView
              gateways={gateways}
              onUpdateGateways={setGateways}
            />
          )}

          {currentView === 'crm' && (
            <CrmView
              fans={fans}
              onUpdateFan={handleUpdateFan}
            />
          )}

          {currentView === 'analytics' && (
            <AnalyticsView channels={channels} />
          )}

          {currentView === 'channels' && (
            <ChannelsView
              channels={channels}
              onRefreshChannel={(id) => {
                setChannels((prev) =>
                  prev.map((c) =>
                    c.id === id
                      ? {
                          ...c,
                          status: 'connected',
                          lastSyncTime: 'En tiempo real',
                          latencyMs: Math.floor(Math.random() * 80) + 60,
                        }
                      : c
                  )
                );
              }}
            />
          )}
        </main>
      </div>

      {/* Simulate Incoming Message Modal */}
      <SimulateIncomingModal
        isOpen={isSimulateModalOpen}
        onClose={() => setIsSimulateModalOpen(false)}
        onSimulateMessage={handleSimulateIncoming}
      />
    </div>
  );
}
