/**
 * API Service — VelvetDesk
 * Centralized fetch layer that connects the React frontend to the backend.
 * All state in App.tsx is loaded/saved through these functions.
 * Auth: Automatically injects the Supabase JWT token from the active session.
 * Resilient: Includes automatic graceful fallback to initial mock data on network errors or Vercel deployments.
 */
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
  BotAuditLog,
} from '../types';
import { authClient, isSupabaseConfigured } from './authService';
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
} from '../mock/initialData';

const BASE = '/api';

// In-memory runtime fallbacks if backend is offline/preview
let memoryVault: VaultItem[] = [...INITIAL_VAULT];
let memoryFans: FanProfile[] = [...INITIAL_FANS];
let memoryThreads: ChatThread[] = [...INITIAL_CHATS];
let memoryMessages: Record<string, Message[]> = { ...INITIAL_MESSAGES };
let memoryPersona: BotPersona = { ...INITIAL_BOT_PERSONA };
let memoryRules: BotRule[] = [...INITIAL_BOT_RULES];
let memoryFaqs: FAQItem[] = [...INITIAL_FAQS];
let memoryGateways: PaymentGatewayConfig[] = [...INITIAL_PAYMENT_GATEWAYS];

// Retrieves the current session token for server-side auth validation
async function getAuthHeaders(): Promise<Record<string, string>> {
  if (!isSupabaseConfigured) return {};
  try {
    const { data } = await authClient.auth.getSession();
    const token = data.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `API error ${res.status}`);
  }
  return res.json();
}

// ─── Channels ────────────────────────────────────────────────────────────────
export async function fetchChannels(): Promise<ChannelIntegration[]> {
  try {
    const raw = await apiFetch<any[]>('/channels');
    if (!raw || !Array.isArray(raw)) return INITIAL_CHANNELS;
    return raw.map((c) => ({
      id: c.id as PlatformId,
      name: c.name,
      iconName: c.icon_name || c.iconName,
      color: c.color,
      bgColor: c.bg_color || c.bgColor,
      status: c.status || 'disconnected',
      syncType: c.sync_type || c.syncType,
      activeChatsCount: c.active_chats_count ?? c.activeChatsCount ?? 0,
      unreadTotal: c.unread_total ?? c.unreadTotal ?? 0,
      todayRevenue: c.today_revenue ?? c.todayRevenue ?? 0,
      latencyMs: c.latency_ms ?? c.latencyMs ?? 100,
      lastSyncTime: c.last_sync_time || c.lastSyncTime || 'Nunca',
      credentialInfo: c.credential_info || c.credentialInfo || '',
      authMethod: c.auth_method || c.authMethod,
      accountUsername: c.account_username || c.accountUsername,
      webhookUrl: c.webhook_url || c.webhookUrl,
      apiKeyOrToken: c.api_key_or_token || c.apiKeyOrToken,
      sessionCookie: c.session_cookie || c.sessionCookie,
    }));
  } catch (err) {
    console.warn('[API] Using fallback channels:', err);
    return INITIAL_CHANNELS;
  }
}

export async function updateChannelCredentials(
  channelId: PlatformId,
  credentials: {
    credentialInfo: string;
    accountUsername?: string;
    status: 'connected' | 'disconnected';
    apiKeyOrToken?: string;
    sessionCookie?: string;
  }
): Promise<void> {
  try {
    await apiFetch(`/channels/${channelId}/credentials`, {
      method: 'PATCH',
      body: JSON.stringify(credentials),
    });
  } catch (e) {
    console.warn('[API] updateChannelCredentials fallback:', e);
  }
}

export async function refreshChannel(channelId: PlatformId): Promise<void> {
  try {
    await apiFetch(`/channels/${channelId}/refresh`, { method: 'POST' });
  } catch (e) {
    console.warn('[API] refreshChannel fallback:', e);
  }
}

export async function fetchWhatsAppQR(): Promise<{ status: string; qr: string | null; username?: string }> {
  try {
    return await apiFetch('/channels/whatsapp/qr');
  } catch {
    return { status: 'disconnected', qr: null };
  }
}

export async function disconnectChannel(channelId: PlatformId): Promise<{ success: boolean; channel?: any }> {
  try {
    return await apiFetch(`/channels/${channelId}/disconnect`, { method: 'POST' });
  } catch {
    return { success: true };
  }
}

// ─── Threads ─────────────────────────────────────────────────────────────────
export async function fetchThreads(page = 1, limit = 100): Promise<ChatThread[]> {
  try {
    const raw = await apiFetch<{ data: any[]; total: number; page: number; limit: number }>(
      `/threads?page=${page}&limit=${limit}`
    );
    // Only fall back to memory if the response itself is invalid (not an empty array)
    if (!raw || !raw.data || !Array.isArray(raw.data)) return memoryThreads;
    if (raw.data.length === 0) return []; // Respect empty result from server
    return raw.data.map((t) => ({
      id: t.id,
      fanId: t.fan_id || t.fanId,
      fanName: t.fan_name || t.fanName,
      fanHandle: t.fan_handle || t.fanHandle,
      fanAvatar: t.fan_avatar || t.fanAvatar,
      platform: (t.platform as PlatformId) || 'fansly',
      attendedBy: t.attended_by || t.attendedBy || 'bot',
      botPausedReason: t.bot_paused_reason || t.botPausedReason,
      lastMessage: t.last_message || t.lastMessage,
      lastMessageTime: t.last_message_time || t.lastMessageTime,
      unreadCount: t.unread_count ?? t.unreadCount ?? 0,
      fanTier: t.fan_tier || t.fanTier || 'curioso',
      totalSpent: t.total_spent ?? t.totalSpent ?? 0,
      isOnline: t.is_online ?? t.isOnline ?? false,
    }));
  } catch (err) {
    console.warn('[API] Using fallback threads:', err);
    return memoryThreads;
  }
}

export async function updateThread(id: string, updates: Partial<ChatThread>): Promise<void> {
  memoryThreads = memoryThreads.map((t) => (t.id === id ? { ...t, ...updates } : t));
  try {
    const payload: Record<string, any> = {};
    if (updates.attendedBy !== undefined) payload.attended_by = updates.attendedBy;
    if (updates.botPausedReason !== undefined) payload.bot_paused_reason = updates.botPausedReason;
    if (updates.unreadCount !== undefined) payload.unread_count = updates.unreadCount;
    if (updates.totalSpent !== undefined) payload.total_spent = updates.totalSpent;
    if (updates.fanTier !== undefined) payload.fan_tier = updates.fanTier;
    await apiFetch(`/threads/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
  } catch (e) {
    console.warn('[API] updateThread fallback:', e);
  }
}

// ─── Messages ─────────────────────────────────────────────────────────────────
export async function fetchMessages(chatId: string): Promise<Message[]> {
  try {
    const raw = await apiFetch<any[]>(`/threads/${chatId}/messages`);
    if (!raw || !Array.isArray(raw) || raw.length === 0) {
      return memoryMessages[chatId] || [];
    }
    return raw.map((m) => ({
      id: m.id,
      chatId: m.chat_id || m.chatId,
      sender: m.sender,
      text: m.text,
      timestamp: m.timestamp,
      media: m.media || undefined,
      scheduledFor: m.scheduled_for || m.scheduledFor || undefined,
      status: m.status,
      paymentDetails: m.payment_details || m.paymentDetails || undefined,
    }));
  } catch (err) {
    return memoryMessages[chatId] || [];
  }
}

export async function sendMessage(chatId: string, msg: Partial<Message>): Promise<Message> {
  const newMsg: Message = {
    id: msg.id || `msg-${Date.now()}`,
    chatId,
    sender: msg.sender || 'creator',
    text: msg.text || '',
    timestamp: msg.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    media: msg.media,
    status: msg.status || 'delivered',
  };

  if (!memoryMessages[chatId]) memoryMessages[chatId] = [];
  memoryMessages[chatId].push(newMsg);

  try {
    return await apiFetch(`/threads/${chatId}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        sender: newMsg.sender,
        text: newMsg.text,
        timestamp: newMsg.timestamp,
        media: newMsg.media || null,
        status: newMsg.status,
      }),
    });
  } catch (e) {
    return newMsg;
  }
}

export async function unlockPpv(
  messageId: string,
  chatId: string,
  price: number,
  itemTitle: string
): Promise<void> {
  try {
    await apiFetch(`/messages/${messageId}/unlock`, {
      method: 'PATCH',
      body: JSON.stringify({ chatId, price, itemTitle }),
    });
  } catch (e) {
    console.warn('[API] unlockPpv fallback:', e);
  }
}

// ─── Fans (CRM) ───────────────────────────────────────────────────────────────
export async function fetchFans(page = 1, limit = 100): Promise<FanProfile[]> {
  try {
    const raw = await apiFetch<{ data: FanProfile[]; total: number; page: number; limit: number }>(
      `/fans?page=${page}&limit=${limit}`
    );
    // Only fall back to memory if the response itself is invalid (not an empty array)
    if (!raw || !raw.data || !Array.isArray(raw.data)) return memoryFans;
    if (raw.data.length === 0) return []; // Respect empty result from server — all fans were deleted
    return raw.data;
  } catch (err) {
    console.warn('[API] Using fallback fans:', err);
    return memoryFans;
  }
}

export async function createFan(fan: Partial<FanProfile>): Promise<FanProfile> {
  const newFan: FanProfile = {
    id: fan.id || `fan-${Date.now()}`,
    name: fan.name || 'Nuevo Fan',
    handle: fan.handle || `@fan_${Date.now().toString().slice(-4)}`,
    avatar: fan.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(fan.name || 'Fan')}&background=8b5cf6&color=fff`,
    platform: fan.platform || 'fansly',
    tier: fan.tier || 'curioso',
    totalSpent: Number(fan.totalSpent) || 0,
    joinDate: fan.joinDate || new Date().toISOString().split('T')[0],
    lastActive: fan.lastActive || 'Reciente',
    notes: fan.notes || '',
    tags: fan.tags || [],
    preferences: fan.preferences || [],
    phoneOrUsername: fan.phoneOrUsername || '',
    purchasedItems: [],
  };

  memoryFans.unshift(newFan);

  try {
    const res = await apiFetch<FanProfile>('/fans', {
      method: 'POST',
      body: JSON.stringify(fan),
    });
    return {
      ...newFan,
      ...res,
    };
  } catch (e) {
    console.warn('[API] createFan fallback:', e);
    return newFan;
  }
}

export async function updateFan(id: string, updates: Partial<FanProfile>): Promise<void> {
  memoryFans = memoryFans.map((f) => (f.id === id ? { ...f, ...updates } : f));
  try {
    await apiFetch(`/fans/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
  } catch (e) {
    console.warn('[API] updateFan fallback:', e);
  }
}

export async function deleteFan(id: string): Promise<void> {
  memoryFans = memoryFans.filter((f) => f.id !== id);
  try {
    await apiFetch(`/fans/${id}`, { method: 'DELETE' });
  } catch (e) {
    console.warn('[API] deleteFan fallback:', e);
  }
}

export async function deleteFansBatch(ids: string[]): Promise<void> {
  const idSet = new Set(ids);
  memoryFans = memoryFans.filter((f) => !idSet.has(f.id));
  try {
    await apiFetch('/fans/batch-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  } catch (e) {
    console.warn('[API] deleteFansBatch fallback:', e);
  }
}

export async function updateFansBatch(ids: string[], updates: Partial<FanProfile>): Promise<void> {
  const idSet = new Set(ids);
  memoryFans = memoryFans.map((f) => (idSet.has(f.id) ? { ...f, ...updates } : f));
  try {
    await apiFetch('/fans/batch-update', {
      method: 'POST',
      body: JSON.stringify({ ids, updates }),
    });
  } catch (e) {
    console.warn('[API] updateFansBatch fallback:', e);
  }
}

// ─── Vault ────────────────────────────────────────────────────────────────────
export async function fetchVault(): Promise<VaultItem[]> {
  try {
    const raw = await apiFetch<VaultItem[]>('/vault');
    if (!raw || !Array.isArray(raw)) return memoryVault;
    return raw;
  } catch (err) {
    console.warn('[API] Using fallback vault:', err);
    return memoryVault;
  }
}

export async function createVaultItem(item: Omit<VaultItem, 'id'>): Promise<VaultItem> {
  const newItem: VaultItem = {
    ...item,
    id: `vault-${Date.now()}`,
    createdDate: 'Hoy',
  };
  memoryVault.unshift(newItem);
  try {
    const res = await apiFetch<any>('/vault', { method: 'POST', body: JSON.stringify(item) });
    return {
      ...res,
      thumbnailUrl: res.thumbnailUrl || res.thumbnail_url || item.thumbnailUrl || item.url,
      fileSize: res.fileSize || res.file_size || item.fileSize,
    };
  } catch {
    return newItem;
  }
}

export async function deleteVaultItem(id: string): Promise<void> {
  memoryVault = memoryVault.filter((v) => v.id !== id);
  try {
    await apiFetch(`/vault/${id}`, { method: 'DELETE' });
  } catch (e) {
    console.warn('[API] deleteVaultItem fallback:', e);
  }
}

export async function updateVaultItem(id: string, updates: Partial<VaultItem>): Promise<VaultItem> {
  memoryVault = memoryVault.map((v) => (v.id === id ? { ...v, ...updates } : v));
  try {
    const res = await apiFetch<any>(`/vault/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
    return {
      ...res,
      thumbnailUrl: res.thumbnailUrl || res.thumbnail_url || updates.thumbnailUrl,
      fileSize: res.fileSize || res.file_size || updates.fileSize,
    };
  } catch {
    return memoryVault.find((v) => v.id === id)!;
  }
}

// ─── Bot Persona ──────────────────────────────────────────────────────────────
export async function fetchBotPersona(): Promise<BotPersona> {
  try {
    const raw = await apiFetch<BotPersona>('/bot/persona');
    return raw || memoryPersona;
  } catch {
    return memoryPersona;
  }
}

export async function saveBotPersona(persona: BotPersona): Promise<void> {
  memoryPersona = persona;
  try {
    await apiFetch('/bot/persona', { method: 'PUT', body: JSON.stringify(persona) });
  } catch (e) {
    console.warn('[API] saveBotPersona fallback:', e);
  }
}

// ─── Bot Rules ────────────────────────────────────────────────────────────────
export async function fetchBotRules(): Promise<BotRule[]> {
  try {
    const raw = await apiFetch<BotRule[]>('/bot/rules');
    if (!raw || !Array.isArray(raw) || raw.length === 0) return memoryRules;
    return raw;
  } catch {
    return memoryRules;
  }
}

export async function saveBotRules(rules: BotRule[]): Promise<void> {
  memoryRules = rules;
  try {
    await apiFetch('/bot/rules', { method: 'PUT', body: JSON.stringify(rules) });
  } catch (e) {
    console.warn('[API] saveBotRules fallback:', e);
  }
}

// ─── FAQs ─────────────────────────────────────────────────────────────────────
export async function fetchFaqs(): Promise<FAQItem[]> {
  try {
    const raw = await apiFetch<FAQItem[]>('/faqs');
    if (!raw || !Array.isArray(raw) || raw.length === 0) return memoryFaqs;
    return raw;
  } catch {
    return memoryFaqs;
  }
}

export async function saveFaqs(faqs: FAQItem[]): Promise<void> {
  memoryFaqs = faqs;
  try {
    await apiFetch('/faqs', { method: 'PUT', body: JSON.stringify(faqs) });
  } catch (e) {
    console.warn('[API] saveFaqs fallback:', e);
  }
}

// ─── Payment Gateways ─────────────────────────────────────────────────────────
export async function fetchGateways(): Promise<PaymentGatewayConfig[]> {
  try {
    const raw = await apiFetch<PaymentGatewayConfig[]>('/gateways');
    if (!raw || !Array.isArray(raw) || raw.length === 0) return memoryGateways;
    return raw;
  } catch {
    return memoryGateways;
  }
}

export async function saveGateways(gateways: PaymentGatewayConfig[]): Promise<void> {
  memoryGateways = gateways;
  try {
    await apiFetch('/gateways', { method: 'PUT', body: JSON.stringify(gateways) });
  } catch (e) {
    console.warn('[API] saveGateways fallback:', e);
  }
}

// ─── Bot Audit Logs ───────────────────────────────────────────────────────────
export async function fetchBotAuditLogs(): Promise<BotAuditLog[]> {
  try {
    return await apiFetch<BotAuditLog[]>('/bot/audit-logs');
  } catch {
    return [];
  }
}

export async function clearBotAuditLogs(): Promise<void> {
  try {
    await apiFetch('/bot/audit-logs', { method: 'DELETE' });
  } catch (e) {
    console.warn('[API] clearBotAuditLogs fallback:', e);
  }
}

// ─── Webhooks API ─────────────────────────────────────────────────────────────
export interface WebhookLogItem {
  id: string;
  platform: string;
  timestamp: string;
  sender: string;
  textSnippet: string;
  status: 'received' | 'processed' | 'error';
  latencyMs: number;
}

export async function fetchWebhookLogs(): Promise<{ totalLogs: number; recent: WebhookLogItem[]; supportedPlatforms: string[] }> {
  try {
    return await apiFetch('/webhooks/logs');
  } catch {
    return {
      totalLogs: 0,
      recent: [],
      supportedPlatforms: ['fansly', 'telegram', 'whatsapp', 'manyvids', 'pornhub', 'scatbook', 'vipweb'],
    };
  }
}

export async function sendTestWebhook(platform: string, payload: any): Promise<any> {
  return await apiFetch(`/webhooks/${platform}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ─── Payments & Transactions ──────────────────────────────────────────────────
export interface PaymentTransactionItem {
  id: string;
  fanName: string;
  platform: string;
  method: string;
  amount: number;
  item: string;
  status: string;
  time: string;
  unlocked: boolean;
}

export async function fetchPaymentsTransactions(): Promise<PaymentTransactionItem[]> {
  try {
    return await apiFetch<PaymentTransactionItem[]>('/payments/transactions');
  } catch {
    return [];
  }
}


