import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LoginView } from './components/auth/LoginView';
import { getCurrentUser, onAuthStateChange, logout as authLogout, type AuthUser } from './services/authService';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, MainView } from './components/layout/Sidebar';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { UnifiedInbox } from './components/inbox/UnifiedInbox';
import { BotEngineView } from './components/bot/BotEngineView';
import { VaultView } from './components/vault/VaultView';
import { PaymentsView } from './components/payments/PaymentsView';
import { CrmView } from './components/crm/CrmView';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { ChannelsView } from './components/channels/ChannelsView';
import { SimulateIncomingModal } from './components/inbox/SimulateIncomingModal';
import { WebhooksMonitorModal } from './components/channels/WebhooksMonitorModal';
import { playChimeSound } from './utils/soundAlert';
import { X, MessageSquare } from 'lucide-react';
import { supabase } from './lib/supabase';
import * as api from './services/apiService';
import { requestBotReply } from './services/geminiService';
import type {
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
  AppNotification,
} from './types';

// ─── Default empty states (no mock data) ─────────────────────────────────────
const DEFAULT_PERSONA: BotPersona = {
  tone: 'coqueta',
  toneLabel: 'Coqueta, Pícara y Dulce',
  customSystemPrompt: '',
  useEmojis: true,
  humanTypingDelaySeconds: 2,
  autoUpsellEnabled: true,
  upsellDiscountPercent: 20,
  autoPauseOnCreatorReply: true,
};

export default function App() {
  const [currentView, setCurrentView] = useState<MainView>('inbox');

  // ─── App state (starts empty, loaded from API) ────────────────────────────
  const [channels, setChannels] = useState<ChannelIntegration[]>([]);
  const [vaultItems, setVaultItems] = useState<VaultItem[]>([]);
  const [fans, setFans] = useState<FanProfile[]>([]);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | undefined>(undefined);
  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>({});
  const [persona, setPersonaState] = useState<BotPersona>(DEFAULT_PERSONA);
  const [rules, setRulesState] = useState<BotRule[]>([]);
  const [faqs, setFaqsState] = useState<FAQItem[]>([]);
  const [gateways, setGatewaysState] = useState<PaymentGatewayConfig[]>([]);
  const [isGlobalBotActive, setIsGlobalBotActive] = useState<boolean>(true);
  const [isSimulateModalOpen, setIsSimulateModalOpen] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ─── Realtime & Notifications State ───────────────────────────────────────
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(true);
  const [isWebhooksModalOpen, setIsWebhooksModalOpen] = useState<boolean>(false);
  const [activeToastNotif, setActiveToastNotif] = useState<AppNotification | null>(null);

  // ─── Auth state ───────────────────────────────────────────────────────────
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const realtimeRef = useRef<{ messagesChannel: any; threadsChannel: any } | null>(null);

  // ─── Web Push Notifications setup ────────────────────────────────────────
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      // Request after a short delay so it doesn't feel abrupt
      const t = setTimeout(() => Notification.requestPermission(), 4000);
      return () => clearTimeout(t);
    }
  }, []);

  function sendPushNotification(title: string, body: string, icon?: string) {
    if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
      try {
        new Notification(title, {
          body: body.length > 80 ? body.slice(0, 77) + '…' : body,
          icon: icon || '/favicon.ico',
          badge: '/favicon.ico',
          tag: 'velvetdesk-message',
          renotify: true,
        } as any);
      } catch (e) {
        console.warn('[Push] Notification failed:', e);
      }
    }
  }

  // ─── Realtime Toast Auto-Dismiss ──────────────────────────────────────────
  useEffect(() => {
    if (activeToastNotif) {
      const timer = setTimeout(() => setActiveToastNotif(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [activeToastNotif]);

  const handleSelectNotification = useCallback((notif: AppNotification) => {
    if (notif.chatId) {
      setSelectedThreadId(notif.chatId);
      setCurrentView('inbox');
    }
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
    setActiveToastNotif(null);
  }, []);

  // ─── Auth bootstrap on mount ─────────────────────────────────────────────
  useEffect(() => {
    getCurrentUser().then(user => {
      setAuthUser(user);
      setAuthChecked(true);
    });
    const { data: { subscription } } = onAuthStateChange(user => {
      setAuthUser(user);
      setAuthChecked(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  // ─── Load all data once authenticated ────────────────────────────────────
  useEffect(() => {
    if (!authUser) return;
    loadInitialData();
    setupRealtimeSubscriptions();
    return () => teardownRealtimeSubscriptions();
  }, [authUser?.id]);

  async function loadInitialData() {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [
        fetchedChannels,
        fetchedThreads,
        fetchedFans,
        fetchedVault,
        fetchedPersona,
        fetchedRules,
        fetchedFaqs,
        fetchedGateways,
      ] = await Promise.all([
        api.fetchChannels(),
        api.fetchThreads(),
        api.fetchFans(),
        api.fetchVault(),
        api.fetchBotPersona(),
        api.fetchBotRules(),
        api.fetchFaqs(),
        api.fetchGateways(),
      ]);

      setChannels(fetchedChannels);
      setThreads(fetchedThreads);
      setFans(fetchedFans);
      setVaultItems(fetchedVault);
      setPersonaState(fetchedPersona);
      setRulesState(fetchedRules);
      setFaqsState(fetchedFaqs);
      setGatewaysState(fetchedGateways);
    } catch (err: any) {
      console.error('[App] Failed to load data:', err);
      setLoadError(err.message || 'Error al cargar datos. Verifica la conexión con Supabase.');
    } finally {
      setIsLoading(false);
    }
  }

  // ─── Message cache timestamps (avoid stale data after server restart) ───────
  const msgCacheTimestamps = useRef<Record<string, number>>({});

  // ─── Load messages for a specific chat (lazy, with 60s TTL cache) ──────────
  const loadMessages = useCallback(async (chatId: string) => {
    const now = Date.now();
    const lastLoaded = msgCacheTimestamps.current[chatId] || 0;
    const isFresh = now - lastLoaded < 60_000; // 60 second TTL

    if (messagesMap[chatId] && isFresh) return; // Cache is valid — skip fetch
    try {
      const msgs = await api.fetchMessages(chatId);
      msgCacheTimestamps.current[chatId] = now;
      setMessagesMap(prev => ({ ...prev, [chatId]: msgs }));
    } catch (e) {
      console.error('[App] Failed to load messages for chat', chatId, e);
    }
  }, [messagesMap]);

  // ─── Supabase Realtime subscriptions ─────────────────────────────────────
  function setupRealtimeSubscriptions() {
    const messagesChannel = supabase
      .channel('realtime-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new as any;
        const newMessage: Message = {
          id: msg.id,
          chatId: msg.chat_id,
          sender: msg.sender,
          text: msg.text,
          timestamp: msg.timestamp,
          media: msg.media || undefined,
          status: msg.status,
          paymentDetails: msg.payment_details || undefined,
        };
        setMessagesMap(prev => {
          const existing = prev[msg.chat_id] || [];
          // Avoid duplicates
          if (existing.some(m => m.id === msg.id)) return prev;
          return { ...prev, [msg.chat_id]: [...existing, newMessage] };
        });

        // 🔔 Web Push, In-App Toast & Audio Chime when a FAN sends a message
        if (msg.sender === 'fan') {
          if (isSoundEnabled) {
            playChimeSound();
          }

          setThreads(current => {
            const t = current.find(th => th.id === msg.chat_id);
            const fanName = t?.fanName || 'Fan';
            const avatar = t?.fanAvatar;
            const platform = t?.platform;

            const notif: AppNotification = {
              id: `notif-${Date.now()}`,
              type: 'message',
              title: `Nuevo mensaje de ${fanName}`,
              description: msg.text || '(archivo multimedia)',
              timestamp: msg.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              platform,
              chatId: msg.chat_id,
              fanName,
              fanAvatar: avatar,
              read: false,
            };

            setNotifications(prev => [notif, ...prev.slice(0, 29)]);
            setActiveToastNotif(notif);

            sendPushNotification(
              `💬 Nuevo mensaje de ${fanName}`,
              msg.text || '(media)',
              avatar,
            );
            return current;
          });
        }
      })
      .subscribe();

    const threadsChannel = supabase
      .channel('realtime-threads')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'threads' }, (payload) => {
        const raw = payload.new as any;
        if (!raw) return;
        const updatedThread: ChatThread = {
          id: raw.id,
          fanId: raw.fan_id,
          fanName: raw.fan_name,
          fanHandle: raw.fan_handle,
          fanAvatar: raw.fan_avatar,
          platform: raw.platform as PlatformId,
          attendedBy: raw.attended_by,
          botPausedReason: raw.bot_paused_reason,
          lastMessage: raw.last_message,
          lastMessageTime: raw.last_message_time,
          unreadCount: raw.unread_count,
          fanTier: raw.fan_tier,
          totalSpent: raw.total_spent,
          isOnline: raw.is_online,
        };
        setThreads(prev => {
          const idx = prev.findIndex(t => t.id === raw.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = updatedThread;
            return next;
          }
          return [updatedThread, ...prev]; // New thread
        });
      })
      .subscribe();

    realtimeRef.current = { messagesChannel, threadsChannel };
  }

  function teardownRealtimeSubscriptions() {
    if (realtimeRef.current) {
      supabase.removeChannel(realtimeRef.current.messagesChannel);
      supabase.removeChannel(realtimeRef.current.threadsChannel);
    }
  }

  // ─── Computed values ──────────────────────────────────────────────────────
  const totalUnread = threads.reduce((acc, t) => acc + t.unreadCount, 0);
  const todayRevenue = channels.reduce((acc, c) => acc + c.todayRevenue, 0);

  // ─── Send message from creator ────────────────────────────────────────────
  const handleSendMessage = useCallback(async (chatId: string, text: string, media?: any) => {
    const thread = threads.find(t => t.id === chatId);
    if (!thread) return;

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const optimistic: Message = {
      id: `optimistic-${Date.now()}`,
      chatId,
      sender: 'creator',
      text,
      timestamp,
      media,
      status: 'sending',
    };

    // Optimistic update
    setMessagesMap(prev => ({ ...prev, [chatId]: [...(prev[chatId] || []), optimistic] }));
    setThreads(prev => prev.map(t => t.id === chatId ? {
      ...t, attendedBy: 'creator',
      botPausedReason: 'Intervención manual de la creadora',
      lastMessage: text, lastMessageTime: timestamp, unreadCount: 0,
    } : t));

    try {
      const saved = await api.sendMessage(chatId, { sender: 'creator', text, timestamp, media, status: 'delivered' });
      // Replace optimistic with real
      setMessagesMap(prev => ({
        ...prev,
        [chatId]: (prev[chatId] || []).map(m => m.id === optimistic.id ? { ...saved, chatId } : m),
      }));
    } catch (e) {
      console.error('[App] Send message error:', e);
      // ❌ Mark the optimistic message as failed so the user sees a visual error
      setMessagesMap(prev => ({
        ...prev,
        [chatId]: (prev[chatId] || []).map(m =>
          m.id === optimistic.id ? { ...m, status: 'failed' as any } : m
        ),
      }));
    }
  }, [threads]);

  // ─── Toggle bot/manual mode ───────────────────────────────────────────────
  const handleToggleAttendedBy = useCallback(async (chatId: string, mode: 'bot' | 'creator') => {
    setThreads(prev => prev.map(t => t.id === chatId ? {
      ...t, attendedBy: mode,
      botPausedReason: mode === 'creator' ? 'Modo manual activado por la creadora' : undefined,
    } : t));
    await api.updateThread(chatId, {
      attendedBy: mode,
      botPausedReason: mode === 'creator' ? 'Modo manual activado por la creadora' : undefined,
    }).catch(console.error);
  }, []);

  // ─── Unlock PPV content ───────────────────────────────────────────────────
  const handleUnlockPpv = useCallback(async (chatId: string, messageId: string, itemTitle: string, price: number) => {
    // Optimistic update
    setMessagesMap(prev => ({
      ...prev,
      [chatId]: (prev[chatId] || []).map(m =>
        m.id === messageId && m.media ? { ...m, media: { ...m.media, isUnlocked: true } } : m
      ),
    }));
    setThreads(prev => prev.map(t => t.id === chatId ? { ...t, totalSpent: t.totalSpent + price } : t));
    setFans(prev => prev.map(f => {
      const thread = threads.find(t => t.id === chatId);
      if (!thread || f.id !== thread.fanId) return f;
      const newTotal = f.totalSpent + price;
      const newTier: FanTier = newTotal >= 250 ? 'vip' : newTotal >= 50 ? 'recurrente' : 'curioso';
      return { ...f, totalSpent: newTotal, tier: newTier };
    }));

    await api.unlockPpv(messageId, chatId, price, itemTitle).catch(console.error);
  }, [threads]);

  // ─── Confirm external payment and release content ────────────────────────
  const handleConfirmPaymentAndRelease = useCallback(async (chatId: string, messageId: string, amount: number) => {
    const unlockedItem = vaultItems.find(v => v.price === amount) || vaultItems[0];
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Mark payment confirmed
    setMessagesMap(prev => ({
      ...prev,
      [chatId]: (prev[chatId] || []).map(m =>
        m.id === messageId && m.paymentDetails
          ? { ...m, paymentDetails: { ...m.paymentDetails, status: 'confirmed' as const } }
          : m
      ),
    }));

    if (unlockedItem) {
      const releaseMsg: Message = {
        id: `release-${Date.now()}`,
        chatId,
        sender: 'bot',
        text: `✅ ¡Pago de $${amount} USD confirmado! Aquí tienes tu contenido desbloqueado amor 💋🔥`,
        timestamp,
        media: { type: unlockedItem.type, url: unlockedItem.url, title: unlockedItem.title, isPpv: true, ppvPrice: amount, isUnlocked: true },
        status: 'delivered',
      };
      setMessagesMap(prev => ({ ...prev, [chatId]: [...(prev[chatId] || []), releaseMsg] }));
      await api.sendMessage(chatId, releaseMsg).catch(console.error);
    }

    await api.unlockPpv(messageId, chatId, amount, unlockedItem?.title || 'Contenido PPV').catch(console.error);
  }, [vaultItems]);

  // ─── Fan CRUD & Batch Operations (CRM) ──────────────────────────────────
  const handleCreateFan = useCallback(async (fan: Partial<FanProfile>) => {
    try {
      const created = await api.createFan(fan);
      setFans(prev => [created, ...prev]);
      return created;
    } catch (e) {
      console.error('[App] Failed to create fan:', e);
      throw e;
    }
  }, []);

  const handleUpdateFan = useCallback(async (updated: FanProfile) => {
    setFans(prev => prev.map(f => f.id === updated.id ? updated : f));
    setThreads(prev => prev.map(t => t.fanId === updated.id ? { ...t, fanTier: updated.tier } : t));
    await api.updateFan(updated.id, updated).catch(console.error);
  }, []);

  const handleDeleteFan = useCallback(async (id: string) => {
    setFans(prev => prev.filter(f => f.id !== id));
    // Also remove threads and messages belonging to this fan
    setThreads(prev => {
      const removed = prev.filter(t => t.fanId === id);
      setMessagesMap(msgs => {
        const next = { ...msgs };
        removed.forEach(t => delete next[t.id]);
        return next;
      });
      return prev.filter(t => t.fanId !== id);
    });
    await api.deleteFan(id).catch(console.error);
  }, []);

  const handleDeleteFansBatch = useCallback(async (ids: string[]) => {
    const idSet = new Set(ids);
    setFans(prev => prev.filter(f => !idSet.has(f.id)));
    // Also remove threads and messages belonging to deleted fans
    setThreads(prev => {
      const removed = prev.filter(t => idSet.has(t.fanId));
      setMessagesMap(msgs => {
        const next = { ...msgs };
        removed.forEach(t => delete next[t.id]);
        return next;
      });
      return prev.filter(t => !idSet.has(t.fanId));
    });
    await api.deleteFansBatch(ids).catch(console.error);
  }, []);

  const handleUpdateFansBatch = useCallback(async (ids: string[], updates: Partial<FanProfile>) => {
    const idSet = new Set(ids);
    setFans(prev => prev.map(f => idSet.has(f.id) ? { ...f, ...updates } : f));
    if (updates.tier) {
      setThreads(prev => prev.map(t => idSet.has(t.fanId) ? { ...t, fanTier: updates.tier! } : t));
    }
    await api.updateFansBatch(ids, updates).catch(console.error);
  }, []);

  // ─── Vault operations ─────────────────────────────────────────────────────
  const handleAddVaultItem = useCallback(async (item: VaultItem) => {
    setVaultItems(prev => [item, ...prev]);
    try {
      const saved = await api.createVaultItem(item);
      setVaultItems(prev => prev.map(v => v.id === item.id ? { ...saved } : v));
    } catch (e) {
      console.error('[App] Add vault item error:', e);
      setVaultItems(prev => prev.filter(v => v.id !== item.id));
    }
  }, []);

  const handleDeleteVaultItem = useCallback(async (id: string) => {
    setVaultItems(prev => prev.filter(v => v.id !== id));
    await api.deleteVaultItem(id).catch(console.error);
  }, []);

  const handleUpdateVaultItem = useCallback(async (id: string, updates: Partial<VaultItem>) => {
    setVaultItems(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v));
    try {
      const saved = await api.updateVaultItem(id, updates);
      setVaultItems(prev => prev.map(v => v.id === id ? { ...v, ...saved } : v));
    } catch (e) {
      console.error('[App] Failed to update vault item:', e);
    }
  }, []);

  // ─── Channel credentials ──────────────────────────────────────────────────
  const handleUpdateChannelCredentials = useCallback(async (
    channelId: PlatformId,
    credentials: { credentialInfo: string; accountUsername?: string; status: 'connected' | 'disconnected'; apiKeyOrToken?: string; sessionCookie?: string }
  ) => {
    setChannels(prev => prev.map(c => c.id === channelId ? {
      ...c, ...credentials, lastSyncTime: 'Conectando...', updated_at: new Date().toISOString(),
    } : c));
    await api.updateChannelCredentials(channelId, credentials).catch(console.error);
    const updatedChannels = await api.fetchChannels();
    setChannels(updatedChannels);
  }, []);

  const handleDisconnectChannel = useCallback(async (channelId: PlatformId) => {
    try {
      await api.disconnectChannel(channelId);
      const updatedChannels = await api.fetchChannels();
      setChannels(updatedChannels);
    } catch (e) {
      console.error('[App] Failed to disconnect channel:', e);
    }
  }, []);

  // ─── Bot persona / rules / faqs / gateways (with API save) ───────────────
  const handleUpdatePersona = useCallback(async (updated: BotPersona) => {
    setPersonaState(updated);
    await api.saveBotPersona(updated).catch(console.error);
  }, []);

  const handleUpdateRules = useCallback(async (updated: BotRule[]) => {
    setRulesState(updated);
    await api.saveBotRules(updated).catch(console.error);
  }, []);

  const handleUpdateFaqs = useCallback(async (updated: FAQItem[]) => {
    setFaqsState(updated);
    await api.saveFaqs(updated).catch(console.error);
  }, []);

  const handleUpdateGateways = useCallback(async (updated: PaymentGatewayConfig[]) => {
    setGatewaysState(updated);
    await api.saveGateways(updated).catch(console.error);
  }, []);

  // ─── Simulate incoming message (for testing/demo) ─────────────────────────
  const handleSimulateIncoming = useCallback(async (params: {
    platform: PlatformId;
    fanName: string;
    fanTier: FanTier;
    text: string;
    triggerBotReply: boolean;
  }) => {
    let existingThread = threads.find(t => t.platform === params.platform && t.fanName === params.fanName);
    let chatId = existingThread?.id;

    if (!existingThread) {
      chatId = `chat-sim-${Date.now()}`;
      const newFanId = `fan-sim-${Date.now()}`;
      const newFan: FanProfile = {
        id: newFanId, name: params.fanName,
        handle: `@${params.fanName.toLowerCase().replace(/\s+/g, '_')}`,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(params.fanName)}&background=8b5cf6&color=fff`,
        platform: params.platform, tier: params.fanTier,
        totalSpent: params.fanTier === 'vip' ? 300 : params.fanTier === 'recurrente' ? 80 : 0,
        joinDate: new Date().toISOString().split('T')[0], lastActive: 'En línea',
        notes: `Nuevo cliente simulado en ${params.platform.toUpperCase()}.`,
        tags: [params.platform, params.fanTier], preferences: ['Contenido exclusivo'], purchasedItems: [],
      };
      const newThread: ChatThread = {
        id: chatId, fanId: newFanId, fanName: params.fanName,
        fanHandle: newFan.handle, fanAvatar: newFan.avatar,
        platform: params.platform, attendedBy: 'bot',
        lastMessage: params.text, lastMessageTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        unreadCount: 1, fanTier: params.fanTier, totalSpent: newFan.totalSpent, isOnline: true,
      };
      setFans(prev => [newFan, ...prev]);
      setThreads(prev => [newThread, ...prev]);
      existingThread = newThread;
    } else {
      setThreads(prev => prev.map(t => t.id === chatId ? {
        ...t, lastMessage: params.text,
        lastMessageTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        unreadCount: t.unreadCount + 1, isOnline: true,
      } : t));
    }

    const fanMsg: Message = {
      id: `msg-sim-${Date.now()}`, chatId: chatId!,
      sender: 'fan', text: params.text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'read',
    };
    setMessagesMap(prev => ({ ...prev, [chatId!]: [...(prev[chatId!] || []), fanMsg] }));

    if (isSoundEnabled) {
      playChimeSound();
    }
    const notif: AppNotification = {
      id: `notif-sim-${Date.now()}`,
      type: 'message',
      title: `Nuevo mensaje de ${params.fanName}`,
      description: params.text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      platform: params.platform,
      chatId: chatId!,
      fanName: params.fanName,
      fanAvatar: newFan?.avatar || existingThread?.fanAvatar,
      read: false,
    };
    setNotifications(prev => [notif, ...prev.slice(0, 29)]);
    setActiveToastNotif(notif);

    if (params.triggerBotReply && isGlobalBotActive && existingThread.attendedBy === 'bot') {
      setTimeout(async () => {
        try {
          const res = await requestBotReply({
            fanName: params.fanName, fanTier: params.fanTier, platform: params.platform,
            persona, rules, messages: [...(messagesMap[chatId!] || []), fanMsg], vaultMenu: vaultItems,
          });

          // Check if fan asked for voice / audio note
          const fanTextLower = (params.text || '').toLowerCase();
          const wantsAudio = fanTextLower.includes('audio') ||
            fanTextLower.includes('voz') ||
            fanTextLower.includes('nota de voz') ||
            fanTextLower.includes('escuchar') ||
            fanTextLower.includes('habla') ||
            fanTextLower.includes('mándame un audio') ||
            fanTextLower.includes('mandame un audio');

          let voiceMedia: any = null;
          if (wantsAudio && res.reply) {
            try {
              const ttsRes = await fetch('/api/bot/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: res.reply, gender: 'female' }),
              });
              const ttsData = await ttsRes.json();
              if (ttsData.success && ttsData.audioUrl) {
                voiceMedia = {
                  type: 'audio',
                  url: ttsData.audioUrl,
                  isVoiceNote: true,
                  duration: '0:15',
                };
              }
            } catch (err) {
              console.warn('[Bot Voice] TTS error:', err);
            }
          }

          const botMsg: Message = {
            id: `msg-bot-sim-${Date.now()}`, chatId: chatId!,
            sender: 'bot',
            text: voiceMedia ? '' : res.reply,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: 'delivered',
            media: voiceMedia || undefined,
          };
          if (!voiceMedia && res.suggestedPpvId) {
            const ppvItem = vaultItems.find(v => v.id === res.suggestedPpvId) || vaultItems[0];
            if (ppvItem) botMsg.media = { type: ppvItem.type, url: ppvItem.url, title: ppvItem.title, isPpv: true, ppvPrice: ppvItem.price, isUnlocked: false };
          }
          setMessagesMap(prev => ({ ...prev, [chatId!]: [...(prev[chatId!] || []), botMsg] }));
          setThreads(prev => prev.map(t => t.id === chatId ? { ...t, lastMessage: voiceMedia ? '🎤 Nota de voz' : botMsg.text, lastMessageTime: botMsg.timestamp } : t));
        } catch (e) { console.error('[Simulate] Bot reply error:', e); }
      }, (persona.humanTypingDelaySeconds || 2) * 1000);
    }

    setCurrentView('inbox');
  }, [threads, messagesMap, vaultItems, isGlobalBotActive, persona, rules]);

  // ─── Logout handler ───────────────────────────────────────────────────────
  const handleLogout = useCallback(async () => {
    await authLogout();
    setAuthUser(null);
    setChannels([]);
    setThreads([]);
    setFans([]);
    setVaultItems([]);
    setMessagesMap({});
  }, []);

  // ─── Auth loading / gate ──────────────────────────────────────────────────
  if (!authChecked) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 text-sm">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  if (!authUser) {
    return <LoginView onAuthSuccess={() => getCurrentUser().then(setAuthUser)} />;
  }

  // ─── Loading screen ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 text-sm">Cargando VelvetDesk...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-slate-100 p-8">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-4xl">⚠️</div>
          <h2 className="text-xl font-semibold text-red-400">Error al conectar con la base de datos</h2>
          <p className="text-slate-400 text-sm">{loadError}</p>
          <p className="text-slate-500 text-xs">Verifica que <code className="text-pink-400">SUPABASE_URL</code> y <code className="text-pink-400">SUPABASE_SERVICE_ROLE_KEY</code> estén configuradas en tu archivo <code className="text-pink-400">.env</code></p>
          <button onClick={loadInitialData} className="mt-4 px-4 py-2 bg-pink-600 hover:bg-pink-500 rounded-lg text-sm font-medium transition-colors">
            Reintentar conexión
          </button>
        </div>
      </div>
    );
  }

  // ─── Main app ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans selection:bg-pink-500/30 selection:text-pink-200">
      <Navbar
        channels={channels}
        isGlobalBotActive={isGlobalBotActive}
        onToggleGlobalBot={() => setIsGlobalBotActive(!isGlobalBotActive)}
        onOpenSimulateModal={() => setIsSimulateModalOpen(true)}
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        todayTotalRevenue={todayRevenue}
        unreadCount={totalUnread}
        authUser={authUser}
        onLogout={handleLogout}
        notifications={notifications}
        onSelectNotification={handleSelectNotification}
        onClearNotifications={() => setNotifications([])}
        isSoundEnabled={isSoundEnabled}
        onToggleSound={() => setIsSoundEnabled(!isSoundEnabled)}
        onOpenWebhooksModal={() => setIsWebhooksModalOpen(true)}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          currentView={currentView}
          onSelectView={setCurrentView}
          unreadCount={totalUnread}
          channelsCount={channels.length}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

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
              onLoadMessages={loadMessages}
              selectedThreadId={selectedThreadId}
            />
          )}
          {currentView === 'bot' && (
            <BotEngineView
              persona={persona}
              rules={rules}
              faqs={faqs}
              vaultItems={vaultItems}
              onUpdatePersona={handleUpdatePersona}
              onUpdateRules={handleUpdateRules}
              onUpdateFaqs={handleUpdateFaqs}
            />
          )}
          {currentView === 'vault' && (
            <VaultView
              vaultItems={vaultItems}
              chats={threads}
              onAddVaultItem={handleAddVaultItem}
              onUpdateVaultItem={handleUpdateVaultItem}
              onDeleteVaultItem={handleDeleteVaultItem}
              onSendToChat={(chatId, item, asPpv) => {
                const text = asPpv ? `🔒 Contenido Bloqueado: "${item.title}" ($${item.price} USD)` : `✨ Aquí tienes: "${item.title}"`;
                handleSendMessage(chatId, text, { type: item.type, url: item.url, title: item.title, isPpv: asPpv, ppvPrice: item.price, isUnlocked: !asPpv });
                setCurrentView('inbox');
              }}
            />
          )}
          {currentView === 'payments' && (
            <PaymentsView gateways={gateways} onUpdateGateways={handleUpdateGateways} />
          )}
          {currentView === 'crm' && (
            <CrmView
              fans={fans}
              onUpdateFan={handleUpdateFan}
              onCreateFan={handleCreateFan}
              onDeleteFan={handleDeleteFan}
              onDeleteFansBatch={handleDeleteFansBatch}
              onUpdateFansBatch={handleUpdateFansBatch}
              onSelectChatForFan={(fanId) => {
                const thread = threads.find(
                  (t) => t.fanId === fanId || t.fanName.toLowerCase() === fans.find((f) => f.id === fanId)?.name.toLowerCase()
                );
                if (thread) {
                  setSelectedThreadId(thread.id);
                }
                setCurrentView('inbox');
              }}
            />
          )}
          {currentView === 'analytics' && (
            <AnalyticsView channels={channels} />
          )}
          {currentView === 'channels' && (
            <ChannelsView
              channels={channels}
              onUpdateChannelCredentials={handleUpdateChannelCredentials}
              onDisconnectChannel={handleDisconnectChannel}
              onOpenWebhooks={() => setIsWebhooksModalOpen(true)}
              onRefreshChannel={async (id) => {
                await api.refreshChannel(id as PlatformId);
                const updated = await api.fetchChannels();
                setChannels(updated);
              }}
            />
          )}
        </main>
      </div>

      <MobileBottomNav
        currentView={currentView}
        onSelectView={setCurrentView}
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        unreadCount={totalUnread}
      />

      <SimulateIncomingModal
        isOpen={isSimulateModalOpen}
        onClose={() => setIsSimulateModalOpen(false)}
        onSimulateMessage={handleSimulateIncoming}
      />

      {/* Floating In-App Toast Notification */}
      {activeToastNotif && (
        <div
          onClick={() => handleSelectNotification(activeToastNotif)}
          className="fixed top-20 right-4 sm:right-6 z-50 bg-slate-900/95 border border-pink-500/50 rounded-2xl p-3 sm:p-4 shadow-2xl shadow-pink-500/20 max-w-sm flex items-start gap-3 cursor-pointer backdrop-blur-md animate-in slide-in-from-top-3 hover:bg-slate-800 transition-all select-none"
        >
          <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 overflow-hidden shrink-0">
            {activeToastNotif.fanAvatar ? (
              <img src={activeToastNotif.fanAvatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <MessageSquare className="w-5 h-5 text-pink-400 m-2.5" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1 mb-0.5">
              <span className="font-bold text-white text-xs truncate">
                {activeToastNotif.title}
              </span>
              <span className="text-[10px] text-slate-500 font-mono shrink-0">
                {activeToastNotif.timestamp}
              </span>
            </div>
            <p className="text-xs text-slate-300 truncate">
              {activeToastNotif.description}
            </p>
            <span className="text-[10px] text-pink-400 font-semibold inline-block mt-1">
              Abrir conversación →
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveToastNotif(null);
            }}
            className="text-slate-400 hover:text-white p-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Webhooks Monitor Modal */}
      <WebhooksMonitorModal
        isOpen={isWebhooksModalOpen}
        onClose={() => setIsWebhooksModalOpen(false)}
        onWebhookTested={async () => {
          const freshThreads = await api.fetchThreads();
          setThreads(freshThreads.data);
        }}
      />
    </div>
  );
}
