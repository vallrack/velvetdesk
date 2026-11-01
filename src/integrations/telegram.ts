/**
 * Telegram Integration — VelvetDesk
 * Uses the official Telegram Bot API via node-telegram-bot-api
 * 
 * Setup:
 *  1. Go to @BotFather on Telegram → /newbot → copy the token
 *  2. Paste the token in Channels → Telegram → API Token field
 *  3. The server will start polling automatically
 */
import * as TelegramBotModule from 'node-telegram-bot-api';
import type { Message as TGMessage } from 'node-telegram-bot-api';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TelegramBot = (TelegramBotModule as any).default ?? TelegramBotModule;
import { createClient } from '@supabase/supabase-js';
import type { DB } from './types.js';
import { generateBotReply, synthesizeTts } from './botEngine.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let botInstance: any | null = null;

export async function startTelegramBot(token: string, db: DB) {
  if (botInstance) {
    try { botInstance.stopPolling(); } catch {}
    botInstance = null;
  }

  console.log('[Telegram] Starting bot...');
  const bot = new TelegramBot(token, { polling: true });
  botInstance = bot;

  bot.on('message', async (msg: TGMessage) => {
    const chatId = String(msg.chat.id);
    const text = msg.text || '';
    const fanName = `${msg.from?.first_name || 'Fan'} ${msg.from?.last_name || ''}`.trim();
    const fanHandle = msg.from?.username ? `@${msg.from.username}` : chatId;

    try {
      // Find or create fan
      let { data: fan } = await db.from('fans').select('*').eq('phone_or_username', fanHandle).single();
      if (!fan) {
        const { data: newFan } = await db.from('fans').insert({
          name: fanName,
          handle: fanHandle,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(fanName)}&background=229ed9&color=fff`,
          platform: 'telegram',
          phone_or_username: fanHandle,
        }).select().single();
        fan = newFan;
      }

      // Find or create thread
      let { data: thread } = await db.from('threads').select('*').eq('fan_id', fan.id).eq('platform', 'telegram').single();
      if (!thread) {
        const { data: newThread } = await db.from('threads').insert({
          id: `tg-${chatId}`,
          fan_id: fan.id,
          fan_name: fanName,
          fan_handle: fanHandle,
          fan_avatar: fan.avatar,
          platform: 'telegram',
          attended_by: 'bot',
          last_message: text,
          last_message_time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          fan_tier: fan.tier,
          total_spent: fan.total_spent,
          is_online: true,
        }).select().single();
        thread = newThread;
      }

      if (!thread) return;
      const threadId = thread.id;

      // Save incoming message
      await db.from('messages').insert({
        id: `tg-msg-${msg.message_id}`,
        chat_id: threadId,
        sender: 'fan',
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'read',
      });

      // Update thread
      await db.from('threads').update({
        last_message: text,
        last_message_time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        unread_count: (thread.unread_count || 0) + 1,
        is_online: true,
        updated_at: new Date().toISOString(),
      }).eq('id', threadId);

        // Auto-reply if attended by bot
      if (thread.attended_by === 'bot') {
        const { data: persona } = await db.from('bot_persona').select('*').eq('id', 1).single();
        const { data: rules } = await db.from('bot_rules').select('*').eq('enabled', true);
        const { data: vault } = await db.from('vault_items').select('*');
        const { data: messages } = await db.from('messages').select('*').eq('chat_id', threadId).order('created_at', { ascending: true }).limit(10);

        const delay = ((persona?.human_typing_delay_seconds || 2) * 1000);

        setTimeout(async () => {
          try {
            // ✅ Direct function call — no HTTP loopback, no JWT issues
            const { reply, isVoice } = await generateBotReply({
              fanName,
              fanTier: fan?.tier || 'curioso',
              platform: 'telegram',
              persona: { tone: persona?.tone, customSystemPrompt: persona?.custom_system_prompt },
              rules: (rules || []).map((r: any) => ({
                id: r.id, name: r.name, enabled: r.enabled, triggers: r.triggers,
                actionType: r.action_type, replyContent: r.reply_content, targetPpvId: r.target_ppv_id,
              })),
              messages: (messages || []).map((m: any) => ({ sender: m.sender, text: m.text })),
              vaultMenu: (vault || []).map((v: any) => ({ id: v.id, title: v.title, type: v.type, price: v.price })),
            });

            if (!reply) return;

            // FIX: Handle isVoice flag — send voice note if requested
            if (isVoice) {
              // ✅ Direct TTS call — returns absolute path on disk
              const tts = await synthesizeTts(reply);
              if (tts.success && tts.audioPath) {
                // Telegram sendVoice accepts a file path directly
                await bot.sendVoice(msg.chat.id, tts.audioPath);
                console.log('[Telegram] Voice note sent successfully ✅');
              } else {
                await bot.sendMessage(msg.chat.id, reply);
              }
            } else {
              // Send reply via Telegram API
              await bot.sendMessage(msg.chat.id, reply);
            }

            // Save bot message to DB
            await db.from('messages').insert({
              chat_id: threadId,
              sender: 'bot',
              text: reply,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              status: 'delivered',
            });

            await db.from('threads').update({
              last_message: reply,
              last_message_time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              unread_count: 0,
              updated_at: new Date().toISOString(),
            }).eq('id', threadId);

          } catch (e) { console.error('[Telegram] Bot reply error:', e); }
        }, delay);
      }

    } catch (e) { console.error('[Telegram] Message handler error:', e); }
  });

  bot.on('polling_error', (err: any) => {
    console.error('[Telegram] Polling error:', err.message);
  });

  // Update channel status
  await db.from('channels').update({ status: 'connected', last_sync_time: 'En tiempo real', updated_at: new Date().toISOString() }).eq('id', 'telegram');
  console.log('[Telegram] Bot started and polling ✅');
}

export function isTelegramConnected(): boolean {
  return botInstance !== null;
}

export async function stopTelegramBot() {
  if (botInstance) {
    try {
      await botInstance.stopPolling();
    } catch {}
    botInstance = null;
    console.log('[Telegram] Bot stopped');
  }
}

export async function disconnectTelegram(db?: DB) {
  console.log('[Telegram] Initiating clean disconnect and token wipe...');
  await stopTelegramBot();
  if (db) {
    try {
      await db.from('channels').update({
        status: 'disconnected',
        api_key_or_token: null,
        account_username: null,
        credential_info: 'No conectado',
        last_sync_time: 'Desconectado',
        updated_at: new Date().toISOString(),
      }).eq('id', 'telegram');
    } catch (e: any) {
      console.error('[Telegram] DB update on disconnect error:', e.message);
    }
  }
  console.log('[Telegram] Disconnection complete ✅');
}

export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  media?: any
): Promise<boolean> {
  if (!botInstance) {
    console.warn('[Telegram] Cannot send outbound message — Telegram bot is not connected');
    return false;
  }

  const rawChatId = String(chatId).replace('tg-', '').trim();
  try {
    if (media?.url) {
      const mediaUrl = media.url.startsWith('http') ? media.url : `http://localhost:3000${media.url}`;
      if (media.type === 'video') {
        await botInstance.sendVideo(rawChatId, mediaUrl, { caption: text || '' });
      } else if (media.type === 'audio' || media.isVoice) {
        await botInstance.sendVoice ? await botInstance.sendVoice(rawChatId, mediaUrl, { caption: text || '' }) : await botInstance.sendAudio(rawChatId, mediaUrl, { caption: text || '' });
      } else {
        await botInstance.sendPhoto(rawChatId, mediaUrl, { caption: text || '' });
      }
    } else {
      await botInstance.sendMessage(rawChatId, text);
    }
    console.log(`[Telegram] Outbound message sent successfully to ${rawChatId}`);
    return true;
  } catch (err: any) {
    console.error(`[Telegram] Error sending message to ${rawChatId}:`, err.message);
    return false;
  }
}

