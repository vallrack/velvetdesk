/**
 * ManyVids Integration — VelvetDesk
 * Uses session cookie to poll ManyVids inbox (no official API available).
 *
 * Setup:
 *  1. Log in to ManyVids in your browser
 *  2. Open DevTools → Application → Cookies → copy the session cookie value
 *  3. Paste the full cookie string in Channels → ManyVids → Session Cookie field
 */
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import type { DB } from './types.js';

const MV_BASE = 'https://www.manyvids.com';
const POLL_INTERVAL_MS = 60_000;

let pollInterval: NodeJS.Timeout | null = null;

export async function startManyVidsPoller(sessionCookie: string, db: DB) {
  if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }

  console.log('[ManyVids] Starting message poller...');

  const headers = {
    Cookie: sessionCookie,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    Accept: 'application/json, text/plain, */*',
    Referer: 'https://www.manyvids.com',
  };

  const poll = async () => {
    try {
      const { data } = await axios.get(`${MV_BASE}/api/messages/inbox`, { headers, params: { page: 1, limit: 50 } });
      const conversations = data?.data || data?.conversations || [];

      for (const conv of conversations) {
        if (!conv.unread_count || conv.unread_count === 0) continue;

        const { data: msgs } = await axios.get(`${MV_BASE}/api/messages/conversation/${conv.id}`, { headers, params: { limit: 5 } });
        const messages = msgs?.data || msgs?.messages || [];

        for (const m of messages) {
          if (m.is_mine || m.is_creator) continue;

          const text = m.body || m.content || '[Media]';
          const fanId = m.user_id || m.sender_id;
          const fanName = m.username || m.display_name || `MV Fan ${String(fanId).substring(0, 6)}`;
          const messageId = `mv-${m.id}`;

          const { data: existing } = await db.from('messages').select('id').eq('id', messageId).single();
          if (existing) continue;

          let { data: fan } = await db.from('fans').select('*').eq('phone_or_username', String(fanId)).eq('platform', 'manyvids').single();
          if (!fan) {
            const { data: newFan } = await db.from('fans').insert({
              name: fanName, handle: `@${fanName.toLowerCase().replace(/\s+/g, '_')}`,
              avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(fanName)}&background=e91e63&color=fff`,
              platform: 'manyvids', phone_or_username: String(fanId),
            }).select().single();
            fan = newFan;
          }

          const threadId = `mv-conv-${conv.id}`;
          let { data: thread } = await db.from('threads').select('*').eq('id', threadId).single();
          if (!thread) {
            const { data: newThread } = await db.from('threads').insert({
              id: threadId, fan_id: fan.id, fan_name: fanName,
              fan_handle: `@${fanName.toLowerCase().replace(/\s+/g, '_')}`,
              fan_avatar: fan.avatar, platform: 'manyvids', attended_by: 'bot',
              last_message: text, last_message_time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              fan_tier: fan.tier, total_spent: fan.total_spent,
            }).select().single();
            thread = newThread;
          }
          if (!thread) continue;

          await db.from('messages').insert({ id: messageId, chat_id: threadId, sender: 'fan', text, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), status: 'read' });
          await db.from('threads').update({ last_message: text, unread_count: (thread.unread_count || 0) + 1, updated_at: new Date().toISOString() }).eq('id', threadId);
        }
      }

      await db.from('channels').update({ status: 'connected', last_sync_time: 'Hace 1 min', updated_at: new Date().toISOString() }).eq('id', 'manyvids');
    } catch (e: any) {
      console.error('[ManyVids] Poll error:', e.message);
      await db.from('channels').update({ status: 'action_required', last_sync_time: 'Cookie expirada', updated_at: new Date().toISOString() }).eq('id', 'manyvids');
    }
  };

  await poll();
  pollInterval = setInterval(poll, POLL_INTERVAL_MS);
  console.log('[ManyVids] Poller started ✅');
}

export function stopManyVidsPoller() {
  if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
}

export async function disconnectManyVids(db?: DB) {
  stopManyVidsPoller();
  if (db) {
    try {
      await db.from('channels').update({
        status: 'disconnected',
        session_cookie: null,
        credential_info: 'No conectado',
        account_username: null,
        last_sync_time: 'Desconectado',
        updated_at: new Date().toISOString(),
      }).eq('id', 'manyvids');
    } catch {}
  }
  console.log('[ManyVids] Disconnected cleanly ✅');
}

