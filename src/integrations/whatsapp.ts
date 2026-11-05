/**
 * WhatsApp Integration — VelvetDesk
 * Uses Baileys (Multi-Device) — connects like WhatsApp Web via QR code
 *
 * Setup:
 *  1. Go to Channels → WhatsApp → click "Conectar por QR"
 *  2. The QR code will appear — scan with the creator's phone
 *  3. Session is saved to ./wa-session and persists across restarts
 */
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} from '@whiskeysockets/baileys';
import { createClient } from '@supabase/supabase-js';
import QRCode from 'qrcode';
import type { DB } from './types.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { generateBotReply, synthesizeTts } from './botEngine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSION_PATH = path.resolve(__dirname, '../../wa-session');

let currentQR: string | null = null;
let sock: ReturnType<typeof makeWASocket> | null = null;
let isConnected = false;
let isStarting = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

export function getWhatsAppQR(): string | null {
  return currentQR;
}

export function isWhatsAppConnected(): boolean {
  return isConnected && sock !== null;
}

export function isWhatsAppStarting(): boolean {
  return isStarting;
}

export function getWhatsAppUser(): string | null {
  return sock?.user?.id?.split(':')[0] || null;
}

export async function startWhatsAppBot(db: DB, forceFresh = false) {
  if (isConnected && sock) {
    console.log('[WhatsApp] Already connected.');
    return;
  }
  if (isStarting) {
    console.log('[WhatsApp] Connection attempt already in progress...');
    return;
  }
  isStarting = true;

  console.log(`[WhatsApp] Starting Baileys connection (forceFresh=${forceFresh})...`);
  await db.from('channels').update({
    status: 'reconnecting',
    last_sync_time: 'Conectando...',
    updated_at: new Date().toISOString(),
  }).eq('id', 'whatsapp');

  // Pre-auth sanity check: If wa-session has corrupt or unregistered credentials, wipe it
  try {
    if (!fs.existsSync(SESSION_PATH)) {
      fs.mkdirSync(SESSION_PATH, { recursive: true });
    }
    const credsFile = path.join(SESSION_PATH, 'creds.json');
    let shouldWipe = forceFresh;
    if (!shouldWipe && fs.existsSync(credsFile)) {
      try {
        const raw = fs.readFileSync(credsFile, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed.registered === false || (!parsed.me && !parsed.account)) {
          console.log('[WhatsApp] Detected unregistered/dead session in creds.json. Wiping for fresh QR...');
          shouldWipe = true;
        }
      } catch {
        shouldWipe = true;
      }
    }
    if (shouldWipe) {
      if (sock) {
        try { sock.end(undefined); } catch {}
        sock = null;
      }
      fs.rmSync(SESSION_PATH, { recursive: true, force: true });
      fs.mkdirSync(SESSION_PATH, { recursive: true });
      currentQR = null;
    }
  } catch (err: any) {
    console.error('[WhatsApp] Pre-auth cleanup warning:', err.message);
  }

  let state: any;
  let saveCreds: any;
  try {
    const auth = await useMultiFileAuthState(SESSION_PATH);
    state = auth.state;
    saveCreds = auth.saveCreds;
  } catch (err: any) {
    console.error('[WhatsApp] Failed to read auth state:', err.message);
    isStarting = false;
    return;
  }

  const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 1015901307] as any }));

  try {
    if (sock) {
      try { sock.end(undefined); } catch {}
      sock = null;
    }

    sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, console as any),
      },
      printQRInTerminal: true,
      generateHighQualityLinkPreview: false,
    });
  } catch (err: any) {
    console.error('[WhatsApp] Failed to create socket:', err.message);
    isStarting = false;
    return;
  }

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      currentQR = qr;
      isStarting = false;
      console.log('[WhatsApp] QR Code ready — scan it in the app');
      QRCode.toDataURL(qr).then((dataUrl) => {
        db.from('channels').update({
          api_key_or_token: dataUrl,
          last_sync_time: 'QR generado',
          updated_at: new Date().toISOString(),
        }).eq('id', 'whatsapp').then(() => {});
      }).catch(() => {});
    }

    if (connection === 'close') {
      isConnected = false;
      currentQR = null;
      isStarting = false;
      const code = (lastDisconnect?.error as any)?.output?.statusCode;
      const isLoggedOut = code === DisconnectReason.loggedOut || code === 401 || code === 403;
      const shouldReconnect = !isLoggedOut && reconnectAttempts < MAX_RECONNECT_ATTEMPTS;
      console.log(`[WhatsApp] Connection closed. Code: ${code} | Attempt: ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} | Reconnecting: ${shouldReconnect}`);

      if (isLoggedOut) {
        console.log('[WhatsApp] Session unlinked/logged out. Wiping residual session files from disk...');
        reconnectAttempts = 0;
        try {
          if (fs.existsSync(SESSION_PATH)) {
            fs.rmSync(SESSION_PATH, { recursive: true, force: true });
            fs.mkdirSync(SESSION_PATH, { recursive: true });
          }
        } catch {}
      }

      await db.from('channels').update({
        status: shouldReconnect ? 'reconnecting' : 'disconnected',
        api_key_or_token: null,
        updated_at: new Date().toISOString(),
      }).eq('id', 'whatsapp');

      if (shouldReconnect) {
        reconnectAttempts++;
        const delay = Math.min(5000 * reconnectAttempts, 30000); // backoff: 5s, 10s, 15s...
        setTimeout(() => startWhatsAppBot(db), delay);
      } else if (!isLoggedOut) {
        console.warn(`[WhatsApp] Max reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Stopping.`);
        reconnectAttempts = 0;
      }
    }

    if (connection === 'open') {
      isConnected = true;
      currentQR = null;
      isStarting = false;
      reconnectAttempts = 0; // Reset counter on successful connection
      console.log('[WhatsApp] Connected ✅');
      const userPhone = sock?.user?.id?.split(':')[0] || '';
      await db.from('channels').update({
        status: 'connected',
        last_sync_time: 'En tiempo real',
        account_username: userPhone,
        credential_info: userPhone ? `+${userPhone}` : 'Conectado',
        api_key_or_token: null,
        updated_at: new Date().toISOString(),
      }).eq('id', 'whatsapp');
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async ({ messages: newMsgs, type }) => {
    if (type !== 'notify') return;

    for (const msg of newMsgs) {
      if (msg.key.fromMe) continue; // Skip messages sent by us
      const jid = msg.key.remoteJid || '';
      if (jid.includes('@g.us')) continue; // Skip group messages

      const fanPhone = jid.split('@')[0];
      const text = msg.message?.conversation
        || msg.message?.extendedTextMessage?.text
        || msg.message?.imageMessage?.caption
        || '[Media]';

      const pushName = msg.pushName || fanPhone;

      try {
        // Find or create fan
        let { data: fan } = await db.from('fans').select('*').eq('phone_or_username', `+${fanPhone}`).single();
        if (!fan) {
          const { data: newFan } = await db.from('fans').insert({
            name: pushName,
            handle: `+${fanPhone}`,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(pushName)}&background=25d366&color=fff`,
            platform: 'whatsapp',
            phone_or_username: `+${fanPhone}`,
          }).select().single();
          fan = newFan;
        }

        // Find or create thread
        const threadId = `wa-${fanPhone}`;
        let { data: thread } = await db.from('threads').select('*').eq('id', threadId).single();
        if (!thread) {
          const { data: newThread } = await db.from('threads').insert({
            id: threadId,
            fan_id: fan.id,
            fan_name: pushName,
            fan_handle: `+${fanPhone}`,
            fan_avatar: fan.avatar,
            platform: 'whatsapp',
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

        // Save message
        await db.from('messages').insert({
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
          is_online: true,
          updated_at: new Date().toISOString(),
        }).eq('id', threadId);

        // Auto-reply if attended by bot
        if (thread.attended_by === 'bot') {
          const { data: persona } = await db.from('bot_persona').select('*').eq('id', 1).single();
          const { data: rules } = await db.from('bot_rules').select('*').eq('enabled', true);
          const { data: vault } = await db.from('vault_items').select('id, title, type, price');
          const { data: msgs } = await db.from('messages').select('sender, text').eq('chat_id', threadId).order('created_at', { ascending: true }).limit(10);

          const delay = (persona?.human_typing_delay_seconds || 2) * 1000;

          setTimeout(async () => {
            try {
              // ✅ Direct function call — no HTTP loopback, no JWT issues
              const { reply, isVoice } = await generateBotReply({
                fanName: pushName,
                fanTier: fan?.tier || 'curioso',
                platform: 'whatsapp',
                persona: { tone: persona?.tone, customSystemPrompt: persona?.custom_system_prompt },
                rules: (rules || []).map((r: any) => ({
                  id: r.id, name: r.name, enabled: r.enabled, triggers: r.triggers,
                  actionType: r.action_type, replyContent: r.reply_content, targetPpvId: r.target_ppv_id,
                })),
                messages: (msgs || []).map((m: any) => ({ sender: m.sender, text: m.text })),
                vaultMenu: (vault || []).map((v: any) => ({ id: v.id, title: v.title, type: v.type, price: v.price })),
              });

              if (!reply || !sock) return;

              // Send via WhatsApp
              if (isVoice) {
                // ✅ Direct TTS call — reads audio from disk, no extra HTTP fetch
                const tts = await synthesizeTts(reply);
                if (tts.success && tts.audioPath && sock) {
                  const audioBuffer = fs.readFileSync(tts.audioPath);
                  await sock.sendMessage(jid, {
                    audio: audioBuffer,
                    mimetype: 'audio/mp4',
                    ptt: true,
                  });
                  console.log('[WhatsApp] Voice note sent successfully ✅');
                } else {
                  if (sock) await sock.sendMessage(jid, { text: reply });
                }
              } else {
                await sock.sendMessage(jid, { text: reply });
              }

              // Save bot message
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
                updated_at: new Date().toISOString(),
              }).eq('id', threadId);

            } catch (e) { console.error('[WhatsApp] Bot reply error:', e); }
          }, delay);
        }

      } catch (e) { console.error('[WhatsApp] Message handler error:', e); }
    }
  });
}

export async function disconnectWhatsApp(db?: DB) {
  console.log('[WhatsApp] Initiating clean disconnect and session wipe...');
  if (sock) {
    try {
      await sock.logout('User initiated disconnect');
    } catch (e) {}
    try {
      sock.end(undefined);
    } catch (e) {}
    sock = null;
  }
  isConnected = false;
  currentQR = null;
  isStarting = false;

  // Security wipe of wa-session folder on disk
  try {
    if (fs.existsSync(SESSION_PATH)) {
      fs.rmSync(SESSION_PATH, { recursive: true, force: true });
      console.log('[WhatsApp] Residual session folder wa-session deleted completely from disk ✅');
    }
    fs.mkdirSync(SESSION_PATH, { recursive: true });
  } catch (err: any) {
    console.error('[WhatsApp] Error wiping wa-session folder:', err.message);
  }

  // Update Supabase
  if (db) {
    try {
      await db.from('channels').update({
        status: 'disconnected',
        account_username: null,
        credential_info: 'No conectado',
        api_key_or_token: null,
        last_sync_time: 'Desconectado',
        updated_at: new Date().toISOString(),
      }).eq('id', 'whatsapp');
    } catch (err: any) {
      console.error('[WhatsApp] DB update on disconnect failed:', err.message);
    }
  }

  console.log('[WhatsApp] Clean disconnection complete.');
}

export async function stopWhatsAppBot(db?: DB) {
  await disconnectWhatsApp(db);
}

export async function sendWhatsAppMessage(
  jid: string,
  options: { text?: string; media?: any }
): Promise<boolean> {
  if (!sock || !isConnected) {
    console.warn('[WhatsApp] Cannot send outbound message — WhatsApp is not connected');
    return false;
  }

  let targetJid = jid.trim();
  if (!targetJid.includes('@')) {
    targetJid = `${targetJid.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
  }

  try {
    if (options.media?.url) {
      const mediaUrl = options.media.url;
      const isLocal = mediaUrl.startsWith('/vault_media/') || mediaUrl.startsWith('/audio/');
      let localPath = '';
      if (isLocal) {
        localPath = path.resolve(__dirname, '../../public', mediaUrl.replace(/^\//, ''));
      }

      if (options.media.type === 'audio' || options.media.isVoice) {
        const audioBuffer = isLocal && fs.existsSync(localPath)
          ? fs.readFileSync(localPath)
          : Buffer.from(await (await fetch(mediaUrl.startsWith('http') ? mediaUrl : `http://localhost:3000${mediaUrl}`)).arrayBuffer());
        
        await sock.sendMessage(targetJid, {
          audio: audioBuffer,
          mimetype: 'audio/mp4',
          ptt: true,
        });
      } else if (options.media.type === 'video') {
        const videoBuffer = isLocal && fs.existsSync(localPath)
          ? fs.readFileSync(localPath)
          : Buffer.from(await (await fetch(mediaUrl.startsWith('http') ? mediaUrl : `http://localhost:3000${mediaUrl}`)).arrayBuffer());
        
        await sock.sendMessage(targetJid, {
          video: videoBuffer,
          caption: options.text || '',
          mimetype: 'video/mp4',
        });
      } else {
        const imgBuffer = isLocal && fs.existsSync(localPath)
          ? fs.readFileSync(localPath)
          : Buffer.from(await (await fetch(mediaUrl.startsWith('http') ? mediaUrl : `http://localhost:3000${mediaUrl}`)).arrayBuffer());
        
        await sock.sendMessage(targetJid, {
          image: imgBuffer,
          caption: options.text || '',
          mimetype: 'image/jpeg',
          viewOnce: Boolean(options.media.isViewOnce),
        });
      }
    } else {
      await sock.sendMessage(targetJid, { text: options.text || '' });
    }
    console.log(`[WhatsApp] Outbound message sent successfully to ${targetJid}`);
    return true;
  } catch (err: any) {
    console.error(`[WhatsApp] Error sending message to ${targetJid}:`, err);
    return false;
  }
}

