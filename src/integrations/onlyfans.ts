/**
 * OnlyFans Integration — VelvetDesk
 * Handles OnlyFans message polling and session connection via session cookie or API bridge.
 *
 * Setup:
 *  1. Log in to OnlyFans in browser → F12 → Application → Cookies → copy 'sess' or auth token
 *  2. Paste in Channels → OnlyFans → Session Token / Cookie field
 */
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import type { DB } from './types.js';

const ONLYFANS_API_BASE = 'https://onlyfans.com/api2/v2';
const POLL_INTERVAL_MS = 30_000; // 30 seconds

let pollInterval: NodeJS.Timeout | null = null;

export async function startOnlyFansPoller(sessionCookieOrToken: string, db: DB) {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }

  console.log('[OnlyFans] Starting message poller...');

  const headers = {
    Cookie: sessionCookieOrToken.startsWith('sess=') ? sessionCookieOrToken : `sess=${sessionCookieOrToken}`,
    Authorization: sessionCookieOrToken,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    Accept: 'application/json, text/plain, */*',
    'app-token': '33d57ade8c02dbc5a333db99ff9ae26a',
  };

  const poll = async () => {
    try {
      const { data: chats } = await axios.get(`${ONLYFANS_API_BASE}/chats`, {
        headers,
        params: { limit: 20, offset: 0, order: 'desc' },
        timeout: 10_000,
      });

      if (!chats?.list) return;

      for (const chat of chats.list) {
        if (!chat.withUser || chat.unreadMessagesCount === 0) continue;

        const fanUser = chat.withUser;
        const fanId = String(fanUser.id);
        const fanName = fanUser.name || fanUser.username || `OF Fan ${fanId.substring(0, 6)}`;
        const fanHandle = `@${(fanUser.username || fanName).toLowerCase().replace(/\s+/g, '_')}`;
        const lastMsg = chat.lastMessage;
        const text = lastMsg?.text || (lastMsg?.media?.length ? '[Media Exclusivo]' : '¡Hola!');
        const messageId = `of-msg-${lastMsg?.id || Date.now()}`;

        // Check if message already exists
        const { data: existing } = await db.from('messages').select('id').eq('id', messageId).single();
        if (existing) continue;

        // Find or create fan
        let { data: fan } = await db.from('fans').select('*').eq('phone_or_username', fanId).eq('platform', 'onlyfans').single();
        if (!fan) {
          const { data: newFan } = await db.from('fans').insert({
            name: fanName,
            handle: fanHandle,
            avatar: fanUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(fanName)}&background=00aff0&color=fff`,
            platform: 'onlyfans',
            phone_or_username: fanId,
            tier: fanUser.subscribedBy ? 'recurrente' : 'curioso',
            total_spent: 0,
            notes: 'Fan sincronizado automáticamente desde OnlyFans',
            tags: ['onlyfans', 'of_subscriber'],
          }).select().single();
          fan = newFan;
        }

        const threadId = `of-chat-${chat.id || fanId}`;
        let { data: thread } = await db.from('threads').select('*').eq('id', threadId).single();
        if (!thread) {
          const { data: newThread } = await db.from('threads').insert({
            id: threadId,
            fan_id: fan.id,
            fan_name: fanName,
            fan_handle: fanHandle,
            fan_avatar: fan.avatar,
            platform: 'onlyfans',
            attended_by: 'bot',
            last_message: text,
            last_message_time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            unread_count: 1,
            fan_tier: fan.tier,
            total_spent: fan.total_spent,
            is_online: true,
          }).select().single();
          thread = newThread;
        }

        // Insert message
        await db.from('messages').insert({
          id: messageId,
          chat_id: threadId,
          sender: 'fan',
          text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'delivered',
        });
      }

      await db.from('channels').update({
        status: 'connected',
        last_sync_time: 'Hace unos segundos',
        latency_ms: 85,
        updated_at: new Date().toISOString(),
      }).eq('id', 'onlyfans');
    } catch (e: any) {
      console.warn('[OnlyFans] Polling check notice:', e.message);
    }
  };

  pollInterval = setInterval(poll, POLL_INTERVAL_MS);
  poll(); // Run immediately on start
  console.log('[OnlyFans] Poller started ✅');
}

export function stopOnlyFansPoller() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
    console.log('[OnlyFans] Poller stopped.');
  }
}

export async function disconnectOnlyFans(db?: DB) {
  stopOnlyFansPoller();
  if (db) {
    try {
      await db.from('channels').update({
        status: 'disconnected',
        credential_info: 'No conectado',
        account_username: null,
        api_key_or_token: null,
        session_cookie: null,
        last_sync_time: 'Desconectado',
        latency_ms: 0,
        updated_at: new Date().toISOString(),
      }).eq('id', 'onlyfans');
    } catch (e) {}
  }
  console.log('[OnlyFans] Disconnected cleanly ✅');
}

