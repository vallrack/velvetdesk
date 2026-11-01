/**
 * API Service — VelvetDesk
 * Centralized fetch layer that connects the React frontend to the Express backend.
 * All state in App.tsx is loaded/saved through these functions.
 * Auth: Automatically injects the Supabase JWT token from the active session.
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
import { authClient } from './authService';

const BASE = '/api';

// Retrieves the current session token for server-side auth validation
async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await authClient.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
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
    // Redirect to login on 401
    if (res.status === 401) {
      window.location.reload();
    }
    throw new Error(err.error || `API error ${res.status}`);
  }
  return res.json();
}

// ─── Channels ────────────────────────────────────────────────────────────────
export async function fetchChannels(): Promise<ChannelIntegration[]> {
  const raw = await apiFetch<any[]>('/channels');
  return raw.map(c => ({
    id: c.id as PlatformId,
    name: c.name,
    iconName: c.icon_name,
    color: c.color,
    bgColor: c.bg_color,
    status: c.status,
    syncType: c.sync_type,
    activeChatsCount: c.active_chats_count,
    unreadTotal: c.unread_total,
    todayRevenue: c.today_revenue,
    latencyMs: c.latency_ms,
    lastSyncTime: c.last_sync_time,
    credentialInfo: c.credential_info,
    authMethod: c.auth_method,
    accountUsername: c.account_username,
    webhookUrl: c.webhook_url,
    apiKeyOrToken: c.api_key_or_token,
    sessionCookie: c.session_cookie,
  }));
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
  await apiFetch(`/channels/${channelId}/credentials`, {
    method: 'PATCH',
    body: JSON.stringify(credentials),
  });
}

export async function refreshChannel(channelId: PlatformId): Promise<void> {
  await apiFetch(`/channels/${channelId}/refresh`, { method: 'POST' });
}

export async function fetchWhatsAppQR(): Promise<{ status: string; qr: string | null; username?: string }> {
  return apiFetch('/channels/whatsapp/qr');
}

export async function disconnectChannel(channelId: PlatformId): Promise<{ success: boolean; channel?: any }> {
  return apiFetch(`/channels/${channelId}/disconnect`, { method: 'POST' });
}

// ─── Threads ─────────────────────────────────────────────────────────────────
export async function fetchThreads(page = 1, limit = 100): Promise<ChatThread[]> {
  const raw = await apiFetch<{ data: any[]; total: number; page: number; limit: number }>(`/threads?page=${page}&limit=${limit}`);
  return (raw.data || []).map(t => ({
    id: t.id,
    fanId: t.fan_id,
    fanName: t.fan_name,
    fanHandle: t.fan_handle,
    fanAvatar: t.fan_avatar,
    platform: t.platform as PlatformId,
    attendedBy: t.attended_by,
    botPausedReason: t.bot_paused_reason,
    lastMessage: t.last_message,
    lastMessageTime: t.last_message_time,
    unreadCount: t.unread_count,
    fanTier: t.fan_tier,
    totalSpent: t.total_spent,
    isOnline: t.is_online,
  }));
}

export async function updateThread(id: string, updates: Partial<ChatThread>): Promise<void> {
  const payload: Record<string, any> = {};
  if (updates.attendedBy !== undefined) payload.attended_by = updates.attendedBy;
  if (updates.botPausedReason !== undefined) payload.bot_paused_reason = updates.botPausedReason;
  if (updates.unreadCount !== undefined) payload.unread_count = updates.unreadCount;
  if (updates.totalSpent !== undefined) payload.total_spent = updates.totalSpent;
  if (updates.fanTier !== undefined) payload.fan_tier = updates.fanTier;
  await apiFetch(`/threads/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

// ─── Messages ─────────────────────────────────────────────────────────────────
export async function fetchMessages(chatId: string): Promise<Message[]> {
  const raw = await apiFetch<any[]>(`/threads/${chatId}/messages`);
  return raw.map(m => ({
    id: m.id,
    chatId: m.chat_id,
    sender: m.sender,
    text: m.text,
    timestamp: m.timestamp,
    media: m.media || undefined,
    scheduledFor: m.scheduled_for || undefined,
    status: m.status,
    paymentDetails: m.payment_details || undefined,
  }));
}

export async function sendMessage(chatId: string, msg: Partial<Message>): Promise<Message> {
  return apiFetch(`/threads/${chatId}/messages`, {
    method: 'POST',
    body: JSON.stringify({
      sender: msg.sender || 'creator',
      text: msg.text || '',
      timestamp: msg.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      media: msg.media || null,
      status: msg.status || 'delivered',
    }),
  });
}

export async function unlockPpv(
  messageId: string,
  chatId: string,
  price: number,
  itemTitle: string
): Promise<void> {
  await apiFetch(`/messages/${messageId}/unlock`, {
    method: 'PATCH',
    body: JSON.stringify({ chatId, price, itemTitle }),
  });
}

// ─── Fans (CRM) ───────────────────────────────────────────────────────────────
export async function fetchFans(page = 1, limit = 100): Promise<FanProfile[]> {
  const raw = await apiFetch<{ data: FanProfile[]; total: number; page: number; limit: number }>(`/fans?page=${page}&limit=${limit}`);
  return raw.data || [];
}

export async function updateFan(id: string, updates: Partial<FanProfile>): Promise<void> {
  await apiFetch(`/fans/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
}

// ─── Vault ────────────────────────────────────────────────────────────────────
export async function fetchVault(): Promise<VaultItem[]> {
  return apiFetch<VaultItem[]>('/vault');
}

export async function createVaultItem(item: Omit<VaultItem, 'id'>): Promise<VaultItem> {
  const res = await apiFetch<any>('/vault', { method: 'POST', body: JSON.stringify(item) });
  return {
    ...res,
    thumbnailUrl: res.thumbnailUrl || res.thumbnail_url || item.thumbnailUrl || item.url,
    fileSize: res.fileSize || res.file_size || item.fileSize,
  };
}

export async function deleteVaultItem(id: string): Promise<void> {
  await apiFetch(`/vault/${id}`, { method: 'DELETE' });
}

export async function updateVaultItem(id: string, updates: Partial<VaultItem>): Promise<VaultItem> {
  const res = await apiFetch<any>(`/vault/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
  return {
    ...res,
    thumbnailUrl: res.thumbnailUrl || res.thumbnail_url || updates.thumbnailUrl,
    fileSize: res.fileSize || res.file_size || updates.fileSize,
  };
}

// ─── Bot Persona ──────────────────────────────────────────────────────────────
export async function fetchBotPersona(): Promise<BotPersona> {
  return apiFetch<BotPersona>('/bot/persona');
}

export async function saveBotPersona(persona: BotPersona): Promise<void> {
  await apiFetch('/bot/persona', { method: 'PUT', body: JSON.stringify(persona) });
}

// ─── Bot Rules ────────────────────────────────────────────────────────────────
export async function fetchBotRules(): Promise<BotRule[]> {
  return apiFetch<BotRule[]>('/bot/rules');
}

export async function saveBotRules(rules: BotRule[]): Promise<void> {
  await apiFetch('/bot/rules', { method: 'PUT', body: JSON.stringify(rules) });
}

// ─── FAQs ─────────────────────────────────────────────────────────────────────
export async function fetchFaqs(): Promise<FAQItem[]> {
  return apiFetch<FAQItem[]>('/faqs');
}

export async function saveFaqs(faqs: FAQItem[]): Promise<void> {
  await apiFetch('/faqs', { method: 'PUT', body: JSON.stringify(faqs) });
}

// ─── Payment Gateways ─────────────────────────────────────────────────────────
export async function fetchGateways(): Promise<PaymentGatewayConfig[]> {
  return apiFetch<PaymentGatewayConfig[]>('/gateways');
}

export async function saveGateways(gateways: PaymentGatewayConfig[]): Promise<void> {
  await apiFetch('/gateways', { method: 'PUT', body: JSON.stringify(gateways) });
}

// ─── Bot Audit Logs ───────────────────────────────────────────────────────────
export async function fetchBotAuditLogs(): Promise<BotAuditLog[]> {
  return apiFetch<BotAuditLog[]>('/bot/audit-logs');
}

export async function clearBotAuditLogs(): Promise<void> {
  await apiFetch('/bot/audit-logs', { method: 'DELETE' });
}
