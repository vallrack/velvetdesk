/**
 * Scatbook Integration — VelvetDesk
 * Polls Scatbook API using the creator's API token.
 *
 * Setup:
 *  1. Log in to Scatbook → Account Settings → API Access → copy token
 *  2. Paste the token in Channels → Scatbook → API Token field
 */
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import type { DB } from './types.js';

const SCATBOOK_API_BASE = 'https://scatbook.com/api/v1';
const POLL_INTERVAL_MS = 45_000;

let pollInterval: NodeJS.Timeout | null = null;

export async function startScatbookPoller(apiToken: string, db: DB) {
  if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }

  console.log('[Scatbook] Starting message poller...');

  const headers = { Authorization: `Bearer ${apiToken}`, Accept: 'application/json', 'User-Agent': 'VelvetDesk/1.0' };

  const poll = async () => {
    try {
      const { data } = await axios.get(`${SCATBOOK_API_BASE}/messages/inbox`, { headers, params: { unread: true, limit: 50 } });
      const messages = data?.data || data?.messages || [];

      for (const m of messages) {
        const text = m.body || m.content || m.message || '[Media]';
        const fanId = m.sender_id || m.from_id;
        const fanName = m.sender_name || m.from_name || `Fan ${String(fanId).substring(0, 8)}`;
        const fanHandle = m.sender_username ? `@${m.sender_username}` : `@sb_${fanId}`;
        const messageId = `sb-${m.id}`;

        const { data: existing } = await db.from('messages').select('id').eq('id', messageId).single();
        if (existing) continue;

        let { data: fan } = await db.from('fans').select('*').eq('phone_or_username', String(fanId)).eq('platform', 'scatbook').single();
        if (!fan) {
          const { data: newFan } = await db.from('fans').insert({
            name: fanName, handle: fanHandle,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(fanName)}&background=8b5cf6&color=fff`,
            platform: 'scatbook', phone_or_username: String(fanId),
          }).select().single();
          fan = newFan;
        }

        const threadId = `sb-conv-${m.conversation_id || fanId}`;
        let { data: thread } = await db.from('threads').select('*').eq('id', threadId).single();
        if (!thread) {
          const { data: newThread } = await db.from('threads').insert({
            id: threadId, fan_id: fan.id, fan_name: fanName, fan_handle: fanHandle,
            fan_avatar: fan.avatar, platform: 'scatbook', attended_by: 'bot',
            last_message: text, last_message_time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            fan_tier: fan.tier, total_spent: fan.total_spent,
          }).select().single();
          thread = newThread;
        }
        if (!thread) continue;

        await db.from('messages').insert({ id: messageId, chat_id: threadId, sender: 'fan', text, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), status: 'read' });
        await db.from('threads').update({ last_message: text, last_message_time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), unread_count: (thread.unread_count || 0) + 1, updated_at: new Date().toISOString() }).eq('id', threadId);
      }

      await db.from('channels').update({ status: 'connected', last_sync_time: 'Hace unos segundos', updated_at: new Date().toISOString() }).eq('id', 'scatbook');
    } catch (e: any) {
      console.error('[Scatbook] Poll error:', e.message);
      await db.from('channels').update({ status: 'action_required', last_sync_time: 'Error', updated_at: new Date().toISOString() }).eq('id', 'scatbook');
    }
  };

  await poll();
  pollInterval = setInterval(poll, POLL_INTERVAL_MS);
  console.log('[Scatbook] Poller started ✅');
}

export function stopScatbookPoller() {
  if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
}

export async function disconnectScatbook(db?: DB) {
  stopScatbookPoller();
  if (db) {
    try {
      await db.from('channels').update({
        status: 'disconnected',
        api_key_or_token: null,
        credential_info: 'No conectado',
        account_username: null,
        last_sync_time: 'Desconectado',
        updated_at: new Date().toISOString(),
      }).eq('id', 'scatbook');
    } catch {}
  }
  console.log('[Scatbook] Disconnected cleanly ✅');
}

