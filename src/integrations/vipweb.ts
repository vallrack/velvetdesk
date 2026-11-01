/**
 * VIPweb Integration — VelvetDesk
 * Polls VIPweb API for new messages using API key or credentials.
 *
 * Setup:
 *  1. Log in to VIPweb → Settings → API Access → copy your API key
 *  2. Paste in Channels → VIPweb → API Token / Credentials field
 */
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import type { DB } from './types.js';

const VIPWEB_API_BASE = 'https://api.vipweb.es/v1';
const POLL_INTERVAL_MS = 30_000;

let pollInterval: NodeJS.Timeout | null = null;

export async function startVIPwebPoller(apiKeyOrToken: string, db: DB) {
  if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }

  console.log('[VIPweb] Starting message poller...');

  const headers = { Authorization: `Bearer ${apiKeyOrToken}`, Accept: 'application/json', 'User-Agent': 'VelvetDesk/1.0' };

  const poll = async () => {
    try {
      const { data } = await axios.get(`${VIPWEB_API_BASE}/messages/inbox`, { headers, params: { unread: true, limit: 50 } });
      const messages = data?.data || data?.messages || [];

      for (const m of messages) {
        const text = m.body || m.content || m.message || '[Media]';
        const fanId = m.sender_id || m.from_id || m.user_id;
        const fanName = m.sender_name || m.username || `VIPweb Fan ${String(fanId).substring(0, 6)}`;
        const messageId = `vipweb-${m.id}`;

        const { data: existing } = await db.from('messages').select('id').eq('id', messageId).single();
        if (existing) continue;

        let { data: fan } = await db.from('fans').select('*').eq('phone_or_username', String(fanId)).eq('platform', 'vipweb').single();
        if (!fan) {
          const { data: newFan } = await db.from('fans').insert({
            name: fanName, handle: `@${fanName.toLowerCase().replace(/\s+/g, '_')}`,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(fanName)}&background=eab308&color=000`,
            platform: 'vipweb', phone_or_username: String(fanId),
          }).select().single();
          fan = newFan;
        }

        const threadId = `vipweb-conv-${m.conversation_id || fanId}`;
        let { data: thread } = await db.from('threads').select('*').eq('id', threadId).single();
        if (!thread) {
          const { data: newThread } = await db.from('threads').insert({
            id: threadId, fan_id: fan.id, fan_name: fanName,
            fan_handle: `@${fanName.toLowerCase().replace(/\s+/g, '_')}`,
            fan_avatar: fan.avatar, platform: 'vipweb', attended_by: 'bot',
            last_message: text, last_message_time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            fan_tier: fan.tier, total_spent: fan.total_spent,
          }).select().single();
          thread = newThread;
        }
        if (!thread) continue;

        await db.from('messages').insert({ id: messageId, chat_id: threadId, sender: 'fan', text, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), status: 'read' });
        await db.from('threads').update({ last_message: text, unread_count: (thread.unread_count || 0) + 1, updated_at: new Date().toISOString() }).eq('id', threadId);
      }

      await db.from('channels').update({ status: 'connected', last_sync_time: 'Hace unos segundos', updated_at: new Date().toISOString() }).eq('id', 'vipweb');
    } catch (e: any) {
      console.error('[VIPweb] Poll error:', e.message);
      await db.from('channels').update({ status: 'action_required', last_sync_time: 'Error de conexión', updated_at: new Date().toISOString() }).eq('id', 'vipweb');
    }
  };

  await poll();
  pollInterval = setInterval(poll, POLL_INTERVAL_MS);
  console.log('[VIPweb] Poller started ✅');
}

export function stopVIPwebPoller() {
  if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
}

export async function disconnectVIPweb(db?: DB) {
  stopVIPwebPoller();
  if (db) {
    try {
      await db.from('channels').update({
        status: 'disconnected',
        api_key_or_token: null,
        credential_info: 'No conectado',
        account_username: null,
        last_sync_time: 'Desconectado',
        updated_at: new Date().toISOString(),
      }).eq('id', 'vipweb');
    } catch {}
  }
  console.log('[VIPweb] Disconnected cleanly ✅');
}

