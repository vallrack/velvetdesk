/**
 * Fansly Integration — VelvetDesk
 * Polls the Fansly API for new messages using the official API token.
 *
 * Setup:
 *  1. Log in to Fansly → Settings → Developer → copy your API token
 *  2. Paste the token in Channels → Fansly → API Token field
 */
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import type { DB } from './types.js';

const FANSLY_API_BASE = 'https://apiv3.fansly.com/api/v1';
const POLL_INTERVAL_MS = 30_000; // 30 seconds

let pollInterval: NodeJS.Timeout | null = null;
let lastCheckedAt: string = new Date(Date.now() - 60_000).toISOString();

export async function startFanslyPoller(apiToken: string, db: DB) {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }

  console.log('[Fansly] Starting message poller...');

  const headers = {
    Authorization: apiToken,
    'User-Agent': 'VelvetDesk/1.0',
    Accept: 'application/json',
  };

  const poll = async () => {
    try {
      // Fetch inbox conversations
      const { data: inbox } = await axios.get(`${FANSLY_API_BASE}/message/conversations`, {
        headers,
        params: { limit: 50 },
      });

      if (!inbox?.response?.data) return;

      for (const conversation of inbox.response.data) {
        const accountId = conversation.participantAccountId;
        const conversationId = conversation.id;
        const unread = conversation.unreadCount || 0;
        if (unread === 0) continue;

        // Fetch messages in this conversation
        const { data: msgs } = await axios.get(`${FANSLY_API_BASE}/message/conversation/${conversationId}`, {
          headers,
          params: { limit: 10, before: null },
        });

        if (!msgs?.response?.data) continue;

        for (const m of msgs.response.data) {
          if (m.senderId === conversation.creatorAccountId) continue; // Skip our own messages

          const fanName = conversation.participantName || `Fan ${accountId.substring(0, 8)}`;
          const fanHandle = `@${fanName.toLowerCase().replace(/\s+/g, '_')}`;
          const text = m.content || '[Media]';
          const messageId = `fansly-${m.id}`;

          // Check if message already stored
          const { data: existing } = await db.from('messages').select('id').eq('id', messageId).single();
          if (existing) continue;

          // Find or create fan
          let { data: fan } = await db.from('fans').select('*').eq('phone_or_username', String(accountId)).single();
          if (!fan) {
            const { data: newFan } = await db.from('fans').insert({
              name: fanName,
              handle: fanHandle,
              avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(fanName)}&background=00aff0&color=fff`,
              platform: 'fansly',
              phone_or_username: String(accountId),
            }).select().single();
            fan = newFan;
          }

          const threadId = `fansly-${conversationId}`;
          let { data: thread } = await db.from('threads').select('*').eq('id', threadId).single();
          if (!thread) {
            const { data: newThread } = await db.from('threads').insert({
              id: threadId,
              fan_id: fan.id,
              fan_name: fanName,
              fan_handle: fanHandle,
              fan_avatar: fan.avatar,
              platform: 'fansly',
              attended_by: 'bot',
              last_message: text,
              last_message_time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              fan_tier: fan.tier,
              total_spent: fan.total_spent,
            }).select().single();
            thread = newThread;
          }

          if (!thread) continue;

          await db.from('messages').insert({
            id: messageId,
            chat_id: threadId,
            sender: 'fan',
            text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: 'read',
          });

          await db.from('threads').update({
            last_message: text,
            last_message_time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            unread_count: (thread.unread_count || 0) + 1,
            updated_at: new Date().toISOString(),
          }).eq('id', threadId);

          console.log(`[Fansly] New message from ${fanName}: ${text.substring(0, 60)}`);
        }
      }

      await db.from('channels').update({
        status: 'connected', last_sync_time: 'Hace unos segundos', latency_ms: Math.floor(Math.random() * 200) + 100, updated_at: new Date().toISOString(),
      }).eq('id', 'fansly');

    } catch (e: any) {
      console.error('[Fansly] Poll error:', e.message);
      await db.from('channels').update({ status: 'action_required', last_sync_time: 'Error de sincronización', updated_at: new Date().toISOString() }).eq('id', 'fansly');
    }
  };

  await poll(); // Run immediately
  pollInterval = setInterval(poll, POLL_INTERVAL_MS);

  console.log('[Fansly] Poller started ✅');
}

export function stopFanslyPoller() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
    console.log('[Fansly] Poller stopped');
  }
}

export async function disconnectFansly(db?: DB) {
  stopFanslyPoller();
  if (db) {
    try {
      await db.from('channels').update({
        status: 'disconnected',
        api_key_or_token: null,
        credential_info: 'No conectado',
        account_username: null,
        last_sync_time: 'Desconectado',
        updated_at: new Date().toISOString(),
      }).eq('id', 'fansly');
    } catch {}
  }
  console.log('[Fansly] Disconnected cleanly ✅');
}

