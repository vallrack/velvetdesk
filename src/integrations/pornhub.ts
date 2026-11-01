/**
 * Pornhub Integration — VelvetDesk
 * Uses session cookie to poll Pornhub Model Messages inbox.
 *
 * Setup:
 *  1. Log in to Pornhub with your model account
 *  2. Open DevTools → Application → Cookies → copy the full cookie string
 *  3. Paste in Channels → Pornhub → Session Cookie field
 */
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import type { DB } from './types.js';

const PH_BASE = 'https://www.pornhub.com';
const POLL_INTERVAL_MS = 90_000; // 90s to reduce rate-limit risk

let pollInterval: NodeJS.Timeout | null = null;

export async function startPornhubPoller(sessionCookie: string, db: DB) {
  if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }

  console.log('[Pornhub] Starting message poller...');

  const headers = {
    Cookie: sessionCookie,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    Accept: 'application/json, */*',
    Referer: 'https://www.pornhub.com/user/messages',
  };

  const poll = async () => {
    try {
      const { data } = await axios.get(`${PH_BASE}/user/messages/ajax`, {
        headers,
        params: { type: 'inbox', page: 1 },
      });

      const messages = data?.messages || data?.data || [];

      for (const m of messages) {
        if (m.isMine || m.mine) continue;

        const text = m.message || m.body || m.content || '[Media]';
        const fanId = m.userId || m.from_id || m.sender?.id;
        const fanName = m.username || m.from || m.sender?.username || `PH Fan ${String(fanId).substring(0, 6)}`;
        const messageId = `ph-${m.id || m.messageId}`;

        const { data: existing } = await db.from('messages').select('id').eq('id', messageId).single();
        if (existing) continue;

        let { data: fan } = await db.from('fans').select('*').eq('phone_or_username', String(fanId)).eq('platform', 'pornhub').single();
        if (!fan) {
          const { data: newFan } = await db.from('fans').insert({
            name: fanName, handle: `@${fanName}`,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(fanName)}&background=ff9900&color=fff`,
            platform: 'pornhub', phone_or_username: String(fanId),
          }).select().single();
          fan = newFan;
        }

        const threadId = `ph-conv-${m.conversationId || m.thread_id || fanId}`;
        let { data: thread } = await db.from('threads').select('*').eq('id', threadId).single();
        if (!thread) {
          const { data: newThread } = await db.from('threads').insert({
            id: threadId, fan_id: fan.id, fan_name: fanName, fan_handle: `@${fanName}`,
            fan_avatar: fan.avatar, platform: 'pornhub', attended_by: 'bot',
            last_message: text, last_message_time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            fan_tier: fan.tier, total_spent: fan.total_spent,
          }).select().single();
          thread = newThread;
        }
        if (!thread) continue;

        await db.from('messages').insert({ id: messageId, chat_id: threadId, sender: 'fan', text, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), status: 'read' });
        await db.from('threads').update({ last_message: text, unread_count: (thread.unread_count || 0) + 1, updated_at: new Date().toISOString() }).eq('id', threadId);
      }

      await db.from('channels').update({ status: 'connected', last_sync_time: 'Hace 1-2 min', updated_at: new Date().toISOString() }).eq('id', 'pornhub');
    } catch (e: any) {
      console.error('[Pornhub] Poll error:', e.message);
      await db.from('channels').update({ status: 'action_required', last_sync_time: 'Cookie expirada o bloqueada', updated_at: new Date().toISOString() }).eq('id', 'pornhub');
    }
  };

  await poll();
  pollInterval = setInterval(poll, POLL_INTERVAL_MS);
  console.log('[Pornhub] Poller started ✅');
}

export function stopPornhubPoller() {
  if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
}

export async function disconnectPornhub(db?: DB) {
  stopPornhubPoller();
  if (db) {
    try {
      await db.from('channels').update({
        status: 'disconnected',
        session_cookie: null,
        api_key_or_token: null,
        credential_info: 'No conectado',
        account_username: null,
        last_sync_time: 'Desconectado',
        updated_at: new Date().toISOString(),
      }).eq('id', 'pornhub');
    } catch {}
  }
  console.log('[Pornhub] Disconnected cleanly ✅');
}

