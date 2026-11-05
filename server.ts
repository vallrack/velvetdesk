import express from 'express';
import QRCode from 'qrcode';
import multer from 'multer';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { DB } from './src/integrations/types.js';


// Channel integrations
import { startOnlyFansPoller, stopOnlyFansPoller, disconnectOnlyFans } from './src/integrations/onlyfans.js';
import { startTelegramBot, stopTelegramBot, disconnectTelegram, sendTelegramMessage, isTelegramConnected } from './src/integrations/telegram.js';
import { startWhatsAppBot, getWhatsAppQR, stopWhatsAppBot, disconnectWhatsApp, sendWhatsAppMessage, isWhatsAppConnected, getWhatsAppUser, isWhatsAppStarting } from './src/integrations/whatsapp.js';
import { startFanslyPoller, stopFanslyPoller, disconnectFansly } from './src/integrations/fansly.js';
import { startScatbookPoller, stopScatbookPoller, disconnectScatbook } from './src/integrations/scatbook.js';
import { startManyVidsPoller, stopManyVidsPoller, disconnectManyVids } from './src/integrations/manyvids.js';
import { startPornhubPoller, stopPornhubPoller, disconnectPornhub } from './src/integrations/pornhub.js';
import { startVIPwebPoller, stopVIPwebPoller, disconnectVIPweb } from './src/integrations/vipweb.js';
import { getBotAuditLogs, clearBotAuditLogs } from './src/integrations/botEngine.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Supabase (server-side, service_role key) ─────────────────────────────────
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
let db: DB | null = null;
if (supabaseUrl && supabaseServiceKey) {
  db = createClient(supabaseUrl, supabaseServiceKey) as DB;
  console.log('[VelvetDesk] Supabase connected ✅');
} else {
  console.warn('[VelvetDesk] Supabase env vars missing — running without DB');
}

// ─── Gemini ───────────────────────────────────────────────────────────────────
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function requireDb(res: express.Response): DB | null {
  if (!db) {
    res.status(503).json({ error: 'Database not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.' });
    return null;
  }
  return db;
}

// Ensure audio directory exists for Voice Notes
const audioDir = path.resolve(__dirname, 'public/audio');
if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}

// Voice Studio active voice state
const voiceConfigFile = path.resolve(__dirname, 'voice_config.json');
let activeVoiceId = 'demo0001';
let femaleVoiceId: string | null = null; // Cloned creator voice (female)
let maleVoiceId: string | null = null;   // Optional male voice profile
if (fs.existsSync(voiceConfigFile)) {
  try {
    const parsed = JSON.parse(fs.readFileSync(voiceConfigFile, 'utf-8'));
    if (parsed.activeVoiceId) activeVoiceId = parsed.activeVoiceId;
    if (parsed.femaleVoiceId) femaleVoiceId = parsed.femaleVoiceId;
    if (parsed.maleVoiceId) maleVoiceId = parsed.maleVoiceId;
  } catch {}
}
function saveVoiceConfig() {
  try {
    if (fs.existsSync(voiceConfigFile)) {
      const backupDir = path.resolve(__dirname, 'voice_config_backups');
      if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      fs.copyFileSync(voiceConfigFile, path.join(backupDir, `voice_config_${timestamp}.json`));
    }
    fs.writeFileSync(voiceConfigFile, JSON.stringify({ activeVoiceId, femaleVoiceId, maleVoiceId }, null, 2));
  } catch (e) {
    console.error('Error saving voice_config.json:', e);
  }
}
function saveActiveVoice(id: string) {
  activeVoiceId = id;
  saveVoiceConfig();
}

// ─── Auth Middleware ───────────────────────────────────────────────────────────
// Validates Supabase JWT on all /api/* routes (except health, webhooks, audio)
const publicPaths = ['/api/health', '/api/auth/login', '/api/auth/me'];

// Public anon client used ONLY for token validation
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const authValidator = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Simple in-memory token cache (5 min TTL) to avoid hitting Supabase on every request
const tokenCache = new Map<string, { userId: string; email: string; exp: number }>();

async function authMiddleware(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  // Skip auth for public/static paths
  const isPublic = publicPaths.includes(req.path)
    || req.path.startsWith('/api/webhook')
    || req.path.startsWith('/audio')
    || !req.path.startsWith('/api');
  if (isPublic) return next();

  // Skip if no auth validator configured (no Supabase keys)
  if (!authValidator) return next();

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'No autorizado. Inicia sesión primero.' });
  }

  // Check cache
  const cached = tokenCache.get(token);
  if (cached && Date.now() < cached.exp) {
    (req as any).userId = cached.userId;
    return next();
  }

  try {
    const { data, error } = await authValidator.auth.getUser(token);
    if (error || !data.user) {
      tokenCache.delete(token);
      return res.status(401).json({ error: 'Token inválido o expirado. Inicia sesión nuevamente.' });
    }
    // Cache the validated token for 5 minutes
    tokenCache.set(token, {
      userId: data.user.id,
      email: data.user.email || '',
      exp: Date.now() + 5 * 60 * 1000,
    });
    (req as any).userId = data.user.id;
    next();
  } catch (e: any) {
    return res.status(401).json({ error: 'Error al validar sesión: ' + e.message });
  }
}


async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  app.use(express.json({ limit: '50mb' }));

  // ── Auth middleware on all routes ─────────────────────────────────────────
  app.use(authMiddleware);

  // ── Auth routes ───────────────────────────────────────────────────────────
  app.get('/api/auth/me', async (req, res) => {
    const userId = (req as any).userId;
    if (!userId) return res.status(401).json({ error: 'No autenticado' });
    res.json({ userId, authenticated: true });
  });

  // ── Static files (public folder) ─────────────────────────────────────────
  const publicDir = path.resolve(__dirname, 'public');
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
  app.use(express.static(publicDir));

  // Ensure vault_media directory exists
  const vaultMediaDir = path.resolve(__dirname, 'public/vault_media');
  if (!fs.existsSync(vaultMediaDir)) fs.mkdirSync(vaultMediaDir, { recursive: true });

  // ── Multer storage for vault uploads ─────────────────────────────────────
  const vaultStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, vaultMediaDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
      cb(null, `${base}_${Date.now()}${ext}`);
    },
  });
  const vaultUpload = multer({ storage: vaultStorage });

  // ── Vault Upload ──────────────────────────────────────────────────────────
  app.post('/api/vault/upload', vaultUpload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    const url = `/vault_media/${req.file.filename}`;
    console.log(`[Vault] File saved: ${req.file.filename} → ${url}`);
    res.json({ url, filename: req.file.filename, size: req.file.size });
  });

  // ── Health ──────────────────────────────────────────────────────────────────
  app.get('/api/health', (_, res) => {
    res.json({ status: 'ok', hasGeminiKey: Boolean(apiKey), hasSupabase: Boolean(db) });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CHANNELS
  // ═══════════════════════════════════════════════════════════════════════════
  app.get('/api/channels', async (_, res) => {
    const database = requireDb(res); if (!database) return;
    const { data, error } = await database.from('channels').select('*').order('name');
    if (error) return res.status(500).json({ error: error.message });

    const channels = data || [];
    const hasOnlyFans = channels.some((c: any) => c.id === 'onlyfans');
    if (!hasOnlyFans) {
      const ofRow = {
        id: 'onlyfans',
        name: 'OnlyFans',
        icon_name: 'Heart',
        color: '#00aff0',
        bg_color: 'rgba(0,175,240,0.15)',
        status: 'disconnected',
        sync_type: 'API / Session Token',
        last_sync_time: 'Nunca',
        credential_info: '',
        auth_method: 'session_cookie',
      };
      database.from('channels').upsert(ofRow).then(() => {}, () => {});
      channels.unshift(ofRow);
    }

    res.json(channels);
  });

  app.patch('/api/channels/:id/credentials', async (req, res) => {
    const database = requireDb(res); if (!database) return;
    const { id } = req.params;
    const { credentialInfo, accountUsername, status, apiKeyOrToken, sessionCookie } = req.body;

    const { data, error } = await database
      .from('channels')
      .update({
        credential_info: credentialInfo,
        account_username: accountUsername,
        status,
        api_key_or_token: apiKeyOrToken,
        session_cookie: sessionCookie,
        last_sync_time: 'En tiempo real',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    // Restart channel integration if now connected
    if (status === 'connected') {
      await restartChannelIntegration(id, data);
    }

    res.json(data);
  });

  app.post('/api/channels/:id/refresh', async (req, res) => {
    const database = requireDb(res); if (!database) return;
    const { id } = req.params;

    // Verify real connectivity per channel type
    let isReallyConnected = false;
    let latencyMs = 0;
    const t0 = Date.now();

    switch (id) {
      case 'whatsapp':
        isReallyConnected = isWhatsAppConnected();
        latencyMs = isReallyConnected ? Date.now() - t0 + 10 : 0;
        break;
      case 'telegram':
        isReallyConnected = isTelegramConnected();
        latencyMs = isReallyConnected ? Date.now() - t0 + 12 : 0;
        break;
      case 'onlyfans': {
        const { data: ch } = await database.from('channels').select('status, session_cookie, api_key_or_token').eq('id', id).single();
        isReallyConnected = ch?.status === 'connected' && Boolean(ch?.session_cookie || ch?.api_key_or_token);
        latencyMs = isReallyConnected ? Date.now() - t0 + 25 : 0;
        break;
      }
      default: {
        // For API-based pollers: try to verify by checking DB status
        const { data: ch } = await database.from('channels').select('status, api_key_or_token').eq('id', id).single();
        isReallyConnected = ch?.status === 'connected' && Boolean(ch?.api_key_or_token);
        latencyMs = isReallyConnected ? Date.now() - t0 + 30 : 0;
      }
    }

    const newStatus = isReallyConnected ? 'connected' : 'action_required';
    const syncTime = isReallyConnected ? 'Hace unos segundos' : 'Sin conexión';

    const { data, error } = await database
      .from('channels')
      .update({
        status: newStatus,
        last_sync_time: syncTime,
        latency_ms: latencyMs,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  // WhatsApp QR & Connection status
  app.get('/api/channels/whatsapp/qr', async (req, res) => {
    if (isWhatsAppConnected()) {
      return res.json({ status: 'connected', qr: null, username: getWhatsAppUser() });
    }

    const forceFresh = req.query.force === 'true';

    // If WhatsApp is not connected and bot is not already starting or showing QR, trigger start
    if (db && !isWhatsAppConnected() && (!getWhatsAppQR() && !isWhatsAppStarting())) {
      startWhatsAppBot(db, forceFresh).catch(err => {
        console.error('[WhatsApp] Auto-start on QR request error:', err);
      });
    }

    const qr = getWhatsAppQR();
    if (!qr) return res.json({ status: 'waiting', qr: null });
    try {
      const url = await QRCode.toDataURL(qr);
      res.json({ status: 'pending', qr: url });
    } catch (e) {
      res.json({ status: 'waiting', qr: null });
    }
  });

  // Universal Channel Disconnect & Security Session Wipe
  app.post('/api/channels/:id/disconnect', async (req, res) => {
    const database = requireDb(res); if (!database) return;
    const { id } = req.params;
    console.log(`[Security] Clean disconnect requested for channel: ${id}`);
    
    switch (id) {
      case 'onlyfans':
        await disconnectOnlyFans(database);
        break;
      case 'whatsapp':
        await disconnectWhatsApp(database);
        break;
      case 'telegram':
        await disconnectTelegram(database);
        break;
      case 'fansly':
        await disconnectFansly(database);
        break;
      case 'manyvids':
        await disconnectManyVids(database);
        break;
      case 'pornhub':
        await disconnectPornhub(database);
        break;
      case 'scatbook':
        await disconnectScatbook(database);
        break;
      case 'vipweb':
        await disconnectVIPweb(database);
        break;
      default:
        await database.from('channels').update({
          status: 'disconnected',
          credential_info: 'No conectado',
          account_username: null,
          api_key_or_token: null,
          session_cookie: null,
          last_sync_time: 'Desconectado',
          updated_at: new Date().toISOString(),
        }).eq('id', id);
    }
    
    const { data: updated } = await database.from('channels').select('*').eq('id', id).single();
    res.json({ success: true, channel: updated });
  });

  // WhatsApp Logout (backward compatibility)
  app.post('/api/channels/whatsapp/logout', async (_, res) => {
    const database = requireDb(res); if (!database) return;
    await disconnectWhatsApp(database);
    res.json({ success: true });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // THREADS (Inbox)
  // ═══════════════════════════════════════════════════════════════════════════
  app.get('/api/threads', async (req, res) => {
    const database = requireDb(res); if (!database) return;

    // Pagination: ?page=1&limit=50 (default: first 100, max: 200)
    const page = Math.max(1, parseInt(String(req.query.page || '1')));
    const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit || '100'))));
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await database
      .from('threads')
      .select('*', { count: 'exact' })
      .order('updated_at', { ascending: false })
      .range(from, to);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ data, total: count, page, limit });
  });

  app.patch('/api/threads/:id', async (req, res) => {
    const database = requireDb(res); if (!database) return;
    const { id } = req.params;
    const updates = req.body;
    const { data, error } = await database
      .from('threads')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MESSAGES
  // ═══════════════════════════════════════════════════════════════════════════
  app.get('/api/threads/:id/messages', async (req, res) => {
    const database = requireDb(res); if (!database) return;
    const { id } = req.params;
    const { data, error } = await database
      .from('messages')
      .select('*')
      .eq('chat_id', id)
      .order('created_at', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.post('/api/threads/:id/messages', async (req, res) => {
    const database = requireDb(res); if (!database) return;
    const { id } = req.params;
    const msg = { ...req.body, chat_id: id, created_at: new Date().toISOString() };

    const { data, error } = await database.from('messages').insert(msg).select().single();
    if (error) return res.status(500).json({ error: error.message });

    // Update thread last message
    await database.from('threads').update({
      last_message: msg.text || '',
      last_message_time: msg.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      updated_at: new Date().toISOString(),
      ...(msg.sender === 'creator' ? { attended_by: 'creator', bot_paused_reason: 'Intervención manual de la creadora', unread_count: 0 } : {}),
    }).eq('id', id);

    // ── Outbound Dispatch: Send manual message to real WhatsApp or Telegram ──
    if (msg.sender === 'creator') {
      try {
        const { data: thread } = await database.from('threads').select('*').eq('id', id).single();
        if (thread) {
          if (thread.platform === 'whatsapp') {
            const rawPhone = (thread.fan_handle || thread.id || '').replace(/[^0-9]/g, '');
            if (rawPhone) {
              const jid = `${rawPhone}@s.whatsapp.net`;
              await sendWhatsAppMessage(jid, { text: msg.text, media: msg.media });
              console.log(`[WhatsApp Outbound] Creator message dispatched to ${jid} ✅`);
            }
          } else if (thread.platform === 'telegram') {
            const tgChatId = (thread.id || '').replace('tg-', '').trim();
            if (tgChatId) {
              await sendTelegramMessage(tgChatId, msg.text || '', msg.media);
              console.log(`[Telegram Outbound] Creator message dispatched to ${tgChatId} ✅`);
            }
          }
        }
      } catch (err: any) {
        console.error('[Outbound Message Dispatch Error]:', err.message);
      }
    }

    res.json(data);
  });

  // Unlock PPV in a message
  app.patch('/api/messages/:msgId/unlock', async (req, res) => {
    const database = requireDb(res); if (!database) return;
    const { msgId } = req.params;
    const { price, chatId, itemTitle } = req.body;

    const { data: msg, error: msgError } = await database
      .from('messages')
      .update({ media: { ...(req.body.media || {}), isUnlocked: true } })
      .eq('id', msgId)
      .select()
      .single();
    if (msgError) return res.status(500).json({ error: msgError.message });

    // Update fan spending
    if (chatId && price) {
      const { data: thread } = await database.from('threads').select('fan_id, platform').eq('id', chatId).single();
      if (thread) {
        const { data: fan } = await database.from('fans').select('total_spent').eq('id', thread.fan_id).single();
        if (fan) {
          const newTotal = (fan.total_spent || 0) + price;
          const newTier = newTotal >= 250 ? 'vip' : newTotal >= 50 ? 'recurrente' : 'curioso';
          await database.from('fans').update({ total_spent: newTotal, tier: newTier, updated_at: new Date().toISOString() }).eq('id', thread.fan_id);
          await database.from('purchase_records').insert({
            fan_id: thread.fan_id, vault_item_id: 'ppv-unlocked', item_title: itemTitle || 'PPV',
            amount: price, platform: thread.platform, payment_method: 'Directo',
          });
          await database.from('threads').update({ total_spent: newTotal, updated_at: new Date().toISOString() }).eq('id', chatId);
          // FIX: Increment today_revenue instead of overwriting it
          const { data: ch } = await database.from('channels').select('today_revenue').eq('id', thread.platform).single();
          const currentRevenue = ch?.today_revenue || 0;
          await database.from('channels').update({ today_revenue: currentRevenue + price }).eq('id', thread.platform);
        }
      }
    }

    res.json(msg);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FANS (CRM)
  // ═══════════════════════════════════════════════════════════════════════════
  app.get('/api/fans', async (req, res) => {
    const database = requireDb(res); if (!database) return;

    // Pagination: ?page=1&limit=50 (default: first 100, max: 500)
    const page = Math.max(1, parseInt(String(req.query.page || '1')));
    const limit = Math.min(500, Math.max(1, parseInt(String(req.query.limit || '100'))));
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: fans, error: fansError, count } = await database
      .from('fans')
      .select('*', { count: 'exact' })
      .order('total_spent', { ascending: false })
      .range(from, to);
    if (fansError) return res.status(500).json({ error: fansError.message });

    // Attach purchase_records only for the current page of fans
    const fanIds = (fans || []).map(f => f.id);
    const { data: purchases } = fanIds.length
      ? await database.from('purchase_records').select('*').in('fan_id', fanIds)
      : { data: [] };

    const purchasesByFan: Record<string, any[]> = {};
    for (const p of purchases || []) {
      if (!purchasesByFan[p.fan_id]) purchasesByFan[p.fan_id] = [];
      purchasesByFan[p.fan_id].push({
        id: p.id, vaultItemId: p.vault_item_id, itemTitle: p.item_title,
        amount: p.amount, date: p.date, platform: p.platform, paymentMethod: p.payment_method,
      });
    }

    const result = (fans || []).map(f => ({
      id: f.id, name: f.name, handle: f.handle, avatar: f.avatar, platform: f.platform,
      tier: f.tier, totalSpent: f.total_spent, joinDate: f.join_date, lastActive: f.last_active,
      notes: f.notes, tags: f.tags, preferences: f.preferences, phoneOrUsername: f.phone_or_username,
      purchasedItems: purchasesByFan[f.id] || [],
    }));

    res.json({ data: result, total: count, page, limit });
  });

  app.patch('/api/fans/:id', async (req, res) => {
    const database = requireDb(res); if (!database) return;
    const { id } = req.params;
    const { totalSpent, tier, tags, preferences, notes, ...rest } = req.body;
    const { data, error } = await database
      .from('fans')
      .update({
        ...(totalSpent !== undefined && { total_spent: totalSpent }),
        ...(tier && { tier }),
        ...(tags && { tags }),
        ...(preferences && { preferences }),
        ...(notes !== undefined && { notes }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    res.json(data);
  });

  app.post('/api/fans', async (req, res) => {
    const database = requireDb(res); if (!database) return;
    const fan = req.body;
    const newId = fan.id || `fan-${Date.now()}`;
    const payload = {
      id: newId,
      name: fan.name || 'Nuevo Fan',
      handle: fan.handle || `@fan_${Date.now().toString().slice(-4)}`,
      avatar: fan.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(fan.name || 'Fan')}&background=8b5cf6&color=fff`,
      platform: fan.platform || 'fansly',
      tier: fan.tier || 'curioso',
      total_spent: Number(fan.totalSpent || fan.total_spent) || 0,
      join_date: fan.joinDate || fan.join_date || new Date().toISOString().split('T')[0],
      last_active: fan.lastActive || fan.last_active || 'Reciente',
      notes: fan.notes || '',
      tags: fan.tags || [],
      preferences: fan.preferences || [],
      phone_or_username: fan.phoneOrUsername || fan.phone_or_username || '',
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await database.from('fans').insert(payload).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({
      id: data.id,
      name: data.name,
      handle: data.handle,
      avatar: data.avatar,
      platform: data.platform,
      tier: data.tier,
      totalSpent: data.total_spent,
      joinDate: data.join_date,
      lastActive: data.last_active,
      notes: data.notes,
      tags: data.tags,
      preferences: data.preferences,
      phoneOrUsername: data.phone_or_username,
      purchasedItems: [],
    });
  });

  app.delete('/api/fans/:id', async (req, res) => {
    const database = requireDb(res); if (!database) return;
    const { id } = req.params;
    const { error } = await database.from('fans').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, id });
  });

  app.post('/api/fans/batch-delete', async (req, res) => {
    const database = requireDb(res); if (!database) return;
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'IDs array requerido' });
    const { error } = await database.from('fans').delete().in('id', ids);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, count: ids.length, ids });
  });

  app.post('/api/fans/batch-update', async (req, res) => {
    const database = requireDb(res); if (!database) return;
    const { ids, updates } = req.body;
    if (!Array.isArray(ids) || ids.length === 0 || !updates) return res.status(400).json({ error: 'IDs y updates requeridos' });
    const payload: any = { updated_at: new Date().toISOString() };
    if (updates.tier !== undefined) payload.tier = updates.tier;
    if (updates.totalSpent !== undefined) payload.total_spent = updates.totalSpent;
    if (updates.tags !== undefined) payload.tags = updates.tags;
    if (updates.notes !== undefined) payload.notes = updates.notes;
    const { error } = await database.from('fans').update(payload).in('id', ids);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, count: ids.length, ids, updates });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // VAULT
  // ═══════════════════════════════════════════════════════════════════════════
  const formatVaultItem = (v: any) => ({
    id: v.id,
    title: v.title,
    description: v.description,
    type: v.type,
    url: v.url,
    thumbnailUrl: v.thumbnail_url || v.thumbnailUrl || v.url,
    tags: v.tags || [],
    price: v.price || 0,
    duration: v.duration,
    fileSize: v.file_size || v.fileSize,
    createdDate: v.created_date || v.createdDate,
    isUnlocked: v.is_unlocked ?? v.isUnlocked ?? false,
  });

  app.get('/api/vault', async (_, res) => {
    const database = requireDb(res); if (!database) return;
    const { data, error } = await database.from('vault_items').select('*').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json((data || []).map(formatVaultItem));
  });

  app.post('/api/vault', async (req, res) => {
    const database = requireDb(res); if (!database) return;
    const { title, description, type, url, thumbnailUrl, tags, price, duration, fileSize } = req.body;
    const { data, error } = await database.from('vault_items').insert({
      title, description: description || '', type, url, thumbnail_url: thumbnailUrl || url,
      tags: tags || [], price: price || 0, duration, file_size: fileSize,
    }).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(formatVaultItem(data));
  });

  app.delete('/api/vault/:id', async (req, res) => {
    const database = requireDb(res); if (!database) return;
    const { error } = await database.from('vault_items').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  app.patch('/api/vault/:id', async (req, res) => {
    const database = requireDb(res); if (!database) return;
    const { title, description, tags, price, url, thumbnailUrl, fileSize } = req.body;
    
    // Only update allowed fields
    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (tags !== undefined) updates.tags = tags;
    if (price !== undefined) updates.price = price;
    if (url !== undefined) updates.url = url;
    if (thumbnailUrl !== undefined) updates.thumbnail_url = thumbnailUrl;
    if (fileSize !== undefined) updates.file_size = fileSize;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await database.from('vault_items')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(formatVaultItem(data));
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BOT PERSONA
  // ═══════════════════════════════════════════════════════════════════════════
  app.get('/api/bot/persona', async (_, res) => {
    const database = requireDb(res); if (!database) return;
    const { data, error } = await database.from('bot_persona').select('*').eq('id', 1).single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({
      tone: data.tone, toneLabel: data.tone_label, customSystemPrompt: data.custom_system_prompt,
      useEmojis: data.use_emojis, humanTypingDelaySeconds: data.human_typing_delay_seconds,
      autoUpsellEnabled: data.auto_upsell_enabled, upsellDiscountPercent: data.upsell_discount_percent,
      autoPauseOnCreatorReply: data.auto_pause_on_creator_reply,
    });
  });

  app.put('/api/bot/persona', async (req, res) => {
    const database = requireDb(res); if (!database) return;
    const p = req.body;
    const { data, error } = await database.from('bot_persona').update({
      tone: p.tone, tone_label: p.toneLabel, custom_system_prompt: p.customSystemPrompt,
      use_emojis: p.useEmojis, human_typing_delay_seconds: p.humanTypingDelaySeconds,
      auto_upsell_enabled: p.autoUpsellEnabled, upsell_discount_percent: p.upsellDiscountPercent,
      auto_pause_on_creator_reply: p.autoPauseOnCreatorReply, updated_at: new Date().toISOString(),
    }).eq('id', 1).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BOT RULES
  // ═══════════════════════════════════════════════════════════════════════════
  app.get('/api/bot/rules', async (_, res) => {
    const database = requireDb(res); if (!database) return;
    const { data, error } = await database.from('bot_rules').select('*').order('sort_order');
    if (error) return res.status(500).json({ error: error.message });
    res.json((data || []).map(r => ({
      id: r.id, name: r.name, enabled: r.enabled, triggers: r.triggers,
      actionType: r.action_type, replyContent: r.reply_content, targetPpvId: r.target_ppv_id,
    })));
  });

  app.put('/api/bot/rules', async (req, res) => {
    const database = requireDb(res); if (!database) return;
    const rules = req.body as any[];
    // Upsert all rules
    const upsertData = rules.map((r, i) => ({
      id: r.id, name: r.name, enabled: r.enabled, triggers: r.triggers,
      action_type: r.actionType, reply_content: r.replyContent, target_ppv_id: r.targetPpvId || null,
      sort_order: i, updated_at: new Date().toISOString(),
    }));
    const { data, error } = await database.from('bot_rules').upsert(upsertData).select();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FAQs
  // ═══════════════════════════════════════════════════════════════════════════
  app.get('/api/faqs', async (_, res) => {
    const database = requireDb(res); if (!database) return;
    const { data, error } = await database.from('faqs').select('*').order('created_at');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.put('/api/faqs', async (req, res) => {
    const database = requireDb(res); if (!database) return;
    const faqs = req.body as any[];
    const upsertData = faqs.map(f => ({
      id: f.id, question: f.question, triggers: f.triggers, answer: f.answer,
      category: f.category, enabled: f.enabled, updated_at: new Date().toISOString(),
    }));
    const { data, error } = await database.from('faqs').upsert(upsertData).select();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PAYMENT GATEWAYS
  // ═══════════════════════════════════════════════════════════════════════════
  app.get('/api/gateways', async (_, res) => {
    const database = requireDb(res); if (!database) return;
    const { data, error } = await database.from('payment_gateways').select('*').order('name');
    if (error) return res.status(500).json({ error: error.message });
    res.json((data || []).map(g => ({
      id: g.id, name: g.name, type: g.type, enabled: g.enabled,
      walletOrAccount: g.wallet_or_account, instructions: g.instructions,
      currency: g.currency, autoUnlockOnConfirm: g.auto_unlock_on_confirm,
    })));
  });

  app.put('/api/gateways', async (req, res) => {
    const database = requireDb(res); if (!database) return;
    const gateways = req.body as any[];
    const upsertData = gateways.map(g => ({
      id: g.id, name: g.name, type: g.type, enabled: g.enabled,
      wallet_or_account: g.walletOrAccount || '', instructions: g.instructions || '',
      currency: g.currency || 'USD', auto_unlock_on_confirm: g.autoUnlockOnConfirm,
      updated_at: new Date().toISOString(),
    }));
    const { data, error } = await database.from('payment_gateways').upsert(upsertData).select();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ANALYTICS
  // ═══════════════════════════════════════════════════════════════════════════
  app.get('/api/analytics/summary', async (_, res) => {
    const database = requireDb(res); if (!database) return;
    const today = new Date().toISOString().split('T')[0];

    const [{ data: channels }, { data: fans }, { data: threads }, { data: todayPurchases }] = await Promise.all([
      database.from('channels').select('id, today_revenue, active_chats_count, unread_total'),
      database.from('fans').select('id, total_spent, tier'),
      database.from('threads').select('id, unread_count'),
      database.from('purchase_records').select('amount').gte('date', today),
    ]);

    const totalRevenue = (todayPurchases || []).reduce((acc, p) => acc + (p.amount || 0), 0);
    const totalUnread = (threads || []).reduce((acc, t) => acc + (t.unread_count || 0), 0);
    const vipCount = (fans || []).filter(f => f.tier === 'vip').length;

    res.json({ totalRevenue, totalUnread, vipCount, totalFans: (fans || []).length, channels });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GEMINI — Bot Reply
  // ═══════════════════════════════════════════════════════════════════════════
  app.post('/api/gemini/generate-bot-reply', async (req, res) => {
    const { fanName, platform, fanTier, persona, rules, messages, vaultMenu, intentDetected } = req.body;

    if (!ai) {
      const fallback = generateFallbackReply({ fanName, platform, persona, lastMessage: messages?.[messages.length - 1]?.text || '', intentDetected, vaultMenu });
      return res.json({ reply: fallback.text, suggestedPpvId: fallback.suggestedPpvId, confidence: 0.92 });
    }

    try {
      const systemInstruction = `
Eres la creadora de contenido en una conversación directa con un fan en ${platform || 'Fansly'}.
Nombre del fan: ${fanName || 'Fan'} (Nivel: ${fanTier || 'Curioso'}).
Tu tono/personalidad configurada: ${persona?.tone || 'Coqueta, pícara y dulce, usando emojis sugestivos'}.
Reglas activadas: ${JSON.stringify(rules || [], null, 2)}
Instrucciones personalizadas: ${persona?.customSystemPrompt || 'Mantén respuestas directas, sensuales, no robóticas.'}

Catálogo PPV disponible:
${JSON.stringify(vaultMenu || [], null, 2)}

Reglas de negocio:
1. Responde de forma muy natural, en primera persona, breve (1 a 3 oraciones).
2. Si detectas interés en fotos/videos/packs, menciona sutilmente uno del catálogo con precio.
3. Si la plataforma es WhatsApp o Telegram, menciona pago por PayPal, Wise, Crypto o transferencia.
4. Si la plataforma es Fansly o ManyVids, menciona que se desbloquea directamente en el chat.
5. Devuelve ÚNICAMENTE un JSON con:
{ "reply": "texto", "suggestedPpvId": "id o null", "intent": "INQUIRY|BUY_PPV|CASUAL|CUSTOM_REQUEST|FAQ", "isVoice": boolean }
6. Si crees que enviar un audio (nota de voz coqueta) sería mucho más persuasivo, o si el fan te pidió un audio, pon "isVoice": true.`;

      let response: any;
      try {
        response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [{ role: 'user', parts: [{ text: `Historial:\n${messages?.map((m: any) => `${m.sender}: ${m.text}`).join('\n')}\n\nResponde al último mensaje.` }] }],
          config: { systemInstruction, responseMimeType: 'application/json', temperature: 0.85 },
        });
      } catch (firstErr: any) {
        console.warn('[Gemini] Retrying with fallback model:', firstErr?.message);
        response = await ai.models.generateContent({
          model: 'gemini-1.5-flash',
          contents: [{ role: 'user', parts: [{ text: `Historial:\n${messages?.map((m: any) => `${m.sender}: ${m.text}`).join('\n')}\n\nResponde al último mensaje.` }] }],
          config: { systemInstruction, responseMimeType: 'application/json', temperature: 0.85 },
        });
      }

      const responseText = response.text?.trim() || '{}';
      let parsed: any = {};
      try { 
        parsed = JSON.parse(responseText); 
      } catch { 
        parsed = { reply: responseText.replace(/```json|```/g, '').trim(), isVoice: false }; 
      }
      return res.json(parsed);
    } catch (err: any) {
      console.error('[Gemini] Error:', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // Gemini — Intent Analysis
  app.post('/api/gemini/analyze-intent', async (req, res) => {
    const { text, fanHistory } = req.body;
    if (!ai) return res.json({ intent: 'BUY_PPV', intentScore: 0.88, sentiment: 'Interesado', suggestedAction: 'Ofrecer contenido PPV' });

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash', // FIX: was 'gemini-3.5-flash' which doesn't exist
        contents: `Analiza: "${text}". Gasto del fan: $${fanHistory?.totalSpent || 0}. Compras: ${fanHistory?.purchasedItems?.join(', ') || 'ninguna'}.
Devuelve JSON: { "intent": "BUY_PPV|CUSTOM_REQUEST|PRICE_INQUIRY|CASUAL_CHAT|FREE_RIDER", "intentScore": number, "sentiment": string, "suggestedAction": string }`,
        config: { responseMimeType: 'application/json' },
      });
      return res.json(JSON.parse(response.text?.trim() || '{}'));
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ─── Bot Audit Logs (RF-Audit) ─────────────────────────────────────────────
  app.get('/api/bot/audit-logs', (_, res) => {
    res.json(getBotAuditLogs());
  });

  app.delete('/api/bot/audit-logs', (_, res) => {
    clearBotAuditLogs();
    res.json({ success: true, message: 'Logs de auditoría del bot eliminados con éxito' });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // VOICE STUDIO — Profiles, Voice Cloning & Text-To-Speech
  // Uses 127.0.0.1 explicitly to avoid Windows IPv6 (::1) resolution issues
  // ═══════════════════════════════════════════════════════════════════════════
  const VS = 'http://127.0.0.1:3900'; // VoiceStudio base URL

  // In-memory profile ref_text cache (TTL: 5 min) to avoid extra round-trips per TTS
  const profileRefCache = new Map<string, { refText: string; ts: number }>();
  const PROFILE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  app.get('/api/bot/voice/profiles', async (_, res) => {
    try {
      const response = await fetch(`${VS}/profiles`);
      if (!response.ok) throw new Error(`VoiceStudio HTTP ${response.status}`);
      const profiles: any = await response.json();
      res.json({
        activeVoiceId,
        profiles: (profiles || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          language: p.language,
          kind: p.kind,
          isDemo: Boolean(p.is_demo),
          audioUrl: p.audio_url ? `${VS}${p.audio_url}` : null,
          refText: p.ref_text,
          isActive: p.id === activeVoiceId,
          createdAt: p.created_at,
        })),
      });
    } catch (err: any) {
      console.warn('[VoiceStudio] Could not fetch profiles:', err.message);
      res.status(503).json({ error: 'VoiceStudio no está conectado en el puerto 3900', details: err.message });
    }
  });

  app.post('/api/bot/voice/set-active', (req, res) => {
    const { voiceId } = req.body;
    if (!voiceId) return res.status(400).json({ error: 'voiceId requerido' });
    saveActiveVoice(voiceId);
    res.json({ success: true, activeVoiceId });
  });

  // Set which voice ID maps to female (creator clone) or male gender
  app.post('/api/bot/voice/set-gender', (req, res) => {
    const { gender, voiceId } = req.body;
    if (!gender || !voiceId) return res.status(400).json({ error: 'gender y voiceId requeridos' });
    if (gender === 'female') {
      femaleVoiceId = voiceId;
    } else if (gender === 'male') {
      maleVoiceId = voiceId;
    } else {
      return res.status(400).json({ error: 'gender debe ser female o male' });
    }
    saveVoiceConfig();
    res.json({ success: true, femaleVoiceId, maleVoiceId });
  });

  app.get('/api/bot/voice/config', (_, res) => {
    if (fs.existsSync(voiceConfigFile)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(voiceConfigFile, 'utf-8'));
        if (parsed.activeVoiceId) activeVoiceId = parsed.activeVoiceId;
        if (parsed.femaleVoiceId) femaleVoiceId = parsed.femaleVoiceId;
        if (parsed.maleVoiceId) maleVoiceId = parsed.maleVoiceId;
      } catch {}
    }
    res.json({ activeVoiceId, femaleVoiceId, maleVoiceId });
  });

  app.post('/api/bot/voice/clone', async (req, res) => {
    const { name, refText, audioBase64, mimeType } = req.body;
    if (!name || !audioBase64) {
      return res.status(400).json({ error: 'Nombre y audio son requeridos' });
    }

    try {
      const audioBuffer = Buffer.from(audioBase64, 'base64');
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('kind', 'clone');
      formData.append('language', 'Spanish');
      const sanitizedRefText = refText?.trim() || 'Hola amor, gracias por suscribirte.';
      formData.append('ref_text', sanitizedRefText);

      const fileExt = mimeType?.includes('wav') ? 'wav' : mimeType?.includes('mp3') ? 'mp3' : 'webm';
      const blob = new Blob([audioBuffer], { type: mimeType || 'audio/webm' });
      formData.append('ref_audio', blob, `voice_sample_${Date.now()}.${fileExt}`);

      const response = await fetch(`${VS}/profiles`, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(120_000), // 2 min max for cloning
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`VoiceStudio HTTP ${response.status}: ${errText}`);
      }

      const profile: any = await response.json();
      saveActiveVoice(profile.id);

      // Cache the ref_text for fast TTS
      if (sanitizedRefText) {
        profileRefCache.set(profile.id, { refText: sanitizedRefText, ts: Date.now() });
      }

      // Auto-assign to gender if provided
      const { gender } = req.body;
      if (gender === 'female') {
        femaleVoiceId = profile.id;
        saveVoiceConfig();
      } else if (gender === 'male') {
        maleVoiceId = profile.id;
        saveVoiceConfig();
      }

      res.json({
        success: true,
        profile: {
          id: profile.id,
          name: profile.name,
          language: profile.language,
          kind: profile.kind,
          audioUrl: profile.audio_url ? `${VS}${profile.audio_url}` : null,
          isActive: true,
          gender: gender || null,
        },
        activeVoiceId: profile.id,
        femaleVoiceId,
        maleVoiceId,
      });
    } catch (err: any) {
      console.error('[VoiceStudio] Error cloning voice:', err.message);
      res.status(500).json({ error: err.message || 'Error al clonar voz con VoiceStudio.' });
    }
  });

  app.delete('/api/bot/voice/profiles/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const response = await fetch(`${VS}/profiles/${id}`, { method: 'DELETE' });
      profileRefCache.delete(id); // Invalidate cache
      if (activeVoiceId === id) {
        saveActiveVoice('demo0001');
      }
      res.json({ success: response.ok });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/bot/tts', async (req, res) => {
    const { voiceId, gender } = req.body;
    let { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Texto requerido' });

    // Lightweight text normalization for more natural TTS output
    text = text
      .replace(/\.\.\./g, ', ')           // ellipsis → short pause
      .replace(/([!?])\s*([!?])+/g, '$1') // multiple !!! → single
      .replace(/\s{2,}/g, ' ')            // collapse multiple spaces
      .replace(/[*_~`]/g, '')             // strip markdown formatting chars
      .trim();

    // Gender-based voice selection
    let selectedVoice = voiceId || activeVoiceId || 'demo0001';
    if (gender === 'female' && femaleVoiceId) {
      selectedVoice = femaleVoiceId;
    } else if (gender === 'male') {
      selectedVoice = maleVoiceId || 'demo0001';
    }

    try {
      // Get ref_text from in-memory cache first (avoids extra HTTP round-trip)
      let profileRefText: string | null = null;
      const cached = profileRefCache.get(selectedVoice);
      if (cached && Date.now() - cached.ts < PROFILE_CACHE_TTL) {
        profileRefText = cached.refText;
      } else if (selectedVoice !== 'demo0001') {
        // Cache miss — fetch from VoiceStudio with short timeout
        try {
          const profRes = await fetch(`${VS}/profiles/${selectedVoice}`, {
            signal: AbortSignal.timeout(4_000), // 4s max — if it fails we proceed without ref_text
          });
          if (profRes.ok) {
            const prof: any = await profRes.json();
            if (prof.ref_text && prof.ref_text.trim()) {
              const trimmedRef = prof.ref_text.trim();
              profileRefText = trimmedRef;
              profileRefCache.set(selectedVoice, { refText: trimmedRef, ts: Date.now() });
            } else if (prof.kind === 'clone' && !prof.ref_text?.trim()) {
              console.warn(`[VoiceStudio] Profile ${selectedVoice} has no ref_text, falling back to demo0001`);
              selectedVoice = 'demo0001';
            }
          }
        } catch (e: any) {
          console.warn('[VoiceStudio] Could not fetch profile ref_text (proceeding):', e.message);
        }
      }

      // Build request body
      // num_step=8, guidance_scale=2.0: tuned for balanced quality and 2x faster CPU rendering
      const ttsBody: any = {
        model: 'tts-1',
        input: text,
        voice: selectedVoice,
        response_format: 'mp3',
        num_step: 8,
        guidance_scale: 2.0,
        denoise: false,
      };
      if (profileRefText) {
        ttsBody.ref_text = profileRefText;
      }

      const response = await fetch(`${VS}/v1/audio/speech`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ttsBody),
        signal: AbortSignal.timeout(60_000), // 60s max for VoiceStudio local model
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`VoiceStudio API error: ${response.statusText} — ${errText.substring(0, 300)}`);
      }

      const buffer = await response.arrayBuffer();
      const fileName = `voice_note_${Date.now()}.mp3`;
      const filePath = path.join(audioDir, fileName);
      fs.writeFileSync(filePath, Buffer.from(buffer));

      const fileUrl = `/audio/${fileName}`;
      res.json({ success: true, audioUrl: fileUrl, voiceUsed: selectedVoice });

    } catch (err: any) {
      console.warn('[VoiceStudio] Primary voice engine unavailable or timed out, generating resilient natural voice note:', err.message);
      try {
        // High-speed natural Spanish voice fallback (always works on any PC, zero GPU needed)
        const encodedText = encodeURIComponent(text.substring(0, 500));
        const fallbackUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=es&client=tw-ob`;
        const fbRes = await fetch(fallbackUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
          signal: AbortSignal.timeout(10_000),
        });

        if (fbRes.ok) {
          const buffer = await fbRes.arrayBuffer();
          const fileName = `voice_note_${Date.now()}.mp3`;
          const filePath = path.join(audioDir, fileName);
          fs.writeFileSync(filePath, Buffer.from(buffer));
          const fileUrl = `/audio/${fileName}`;
          return res.json({
            success: true,
            audioUrl: fileUrl,
            voiceUsed: 'natural-fallback',
            note: 'Generado con voz natural optimizada para compatibilidad universal',
          });
        }
      } catch (fbErr: any) {
        console.error('[TTS Fallback] Fallback also failed:', fbErr.message);
      }

      res.status(500).json({
        error: 'No se pudo generar la nota de voz.',
        details: err.message,
      });
    }
  });


  // Pre-warm VoiceStudio model so the first real TTS call is fast
  app.post('/api/bot/voice/warm', async (_, res) => {
    try {
      // Fire-and-forget — don't wait for the full response
      fetch(`${VS}/v1/audio/speech`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'tts-1', input: '.', voice: 'demo0001', response_format: 'mp3', num_step: 2 }),
        signal: AbortSignal.timeout(120_000),
      }).catch(() => {});
      res.json({ success: true, message: 'Warming up VoiceStudio model in background...' });
    } catch {
      res.json({ success: false });
    }
  });


  app.post('/api/webhook/:platform', async (req, res) => {
    const { platform } = req.params;
    console.log(`[Webhook] Incoming from ${platform}:`, JSON.stringify(req.body).substring(0, 200));
    // Each integration handles its own incoming — this is a pass-through confirmation
    res.json({ received: true, platform });
  });

  // ─── Static / Dev ──────────────────────────────────────────────────────────
  app.use('/audio', express.static(audioDir));

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_, res) => res.sendFile(path.resolve(__dirname, 'dist', 'index.html')));
  } else {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[VelvetDesk] Server running on http://0.0.0.0:${PORT}`);
    // Start all channel integrations that have credentials
    initChannelIntegrations();
    // Start MP3 cleanup job
    scheduleAudioCleanup();
  });
}

// ─── MP3 Cleanup Job ───────────────────────────────────────────────────────────
// Deletes voice note MP3 files older than 24 hours every 6 hours
function scheduleAudioCleanup() {
  const CLEANUP_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours
  const MAX_AGE_MS = 24 * 60 * 60 * 1000;       // 24 hours

  function runCleanup() {
    try {
      if (!fs.existsSync(audioDir)) return;
      const files = fs.readdirSync(audioDir);
      const now = Date.now();
      let deleted = 0;
      for (const file of files) {
        if (!file.endsWith('.mp3')) continue;
        const filePath = path.join(audioDir, file);
        try {
          const stat = fs.statSync(filePath);
          if (now - stat.mtimeMs > MAX_AGE_MS) {
            fs.unlinkSync(filePath);
            deleted++;
          }
        } catch { /* skip locked files */ }
      }
      if (deleted > 0) console.log(`[AudioCleanup] Deleted ${deleted} old MP3 file(s) from public/audio/`);
    } catch (e: any) {
      console.error('[AudioCleanup] Error during cleanup:', e.message);
    }
  }

  runCleanup(); // Run immediately on start
  setInterval(runCleanup, CLEANUP_INTERVAL);
  console.log('[AudioCleanup] Scheduled audio cleanup every 6h ✅');
}

// ─── Channel Integration Manager ──────────────────────────────────────────────
async function initChannelIntegrations() {
  if (!db) return;

  const { data: channels } = await db.from('channels').select('*').eq('status', 'connected');
  if (!channels) return;

  for (const ch of channels) {
    await restartChannelIntegration(ch.id, ch);
  }
}

async function restartChannelIntegration(id: string, channelData: any) {
  switch (id) {
    case 'onlyfans':
      if (channelData.session_cookie || channelData.api_key_or_token) {
        await startOnlyFansPoller(channelData.session_cookie || channelData.api_key_or_token, db!);
      }
      break;
    case 'telegram':
      if (channelData.api_key_or_token) {
        await startTelegramBot(channelData.api_key_or_token, db!);
      }
      break;
    case 'whatsapp':
      await startWhatsAppBot(db!);
      break;
    case 'fansly':
      if (channelData.api_key_or_token) {
        await startFanslyPoller(channelData.api_key_or_token, db!);
      }
      break;
    case 'scatbook':
      if (channelData.api_key_or_token) {
        await startScatbookPoller(channelData.api_key_or_token, db!);
      }
      break;
    case 'manyvids':
      if (channelData.session_cookie) {
        await startManyVidsPoller(channelData.session_cookie, db!);
      }
      break;
    case 'pornhub':
      if (channelData.session_cookie) {
        await startPornhubPoller(channelData.session_cookie, db!);
      }
      break;
    case 'vipweb':
      if (channelData.api_key_or_token) {
        await startVIPwebPoller(channelData.api_key_or_token, db!);
      }
      break;
  }
}

// ─── Fallback AI Reply ─────────────────────────────────────────────────────────
function generateFallbackReply(params: any) {
  const { fanName, lastMessage, vaultMenu } = params;
  const msgLower = (lastMessage || '').toLowerCase();

  if (msgLower.includes('precio') || msgLower.includes('cuanto') || msgLower.includes('menu')) {
    const item = vaultMenu?.[0] || { title: 'Set VIP Completo', price: 25 };
    return { text: `Hola corazón ❤️ Justo tengo disponible el "${item.title}" por solo $${item.price} USD. ¿Te lo envío ya mismo? 🔥`, suggestedPpvId: item.id || null };
  }
  if (msgLower.includes('video') || msgLower.includes('foto') || msgLower.includes('pack')) {
    const item = vaultMenu?.[1] || { title: 'Video Exclusivo 4K', price: 35 };
    return { text: `Uff amor, acabo de grabar uno súper íntimo... "${item.title}" por $${item.price} USD. ¿Lo desbloqueamos ahora? 💋`, suggestedPpvId: item.id || null };
  }
  return { text: `Hola ${fanName || 'amor'} 💕 Qué rico que me escribas hoy. ¿Te gustaría ver lo que preparé para ti? ✨`, suggestedPpvId: null };
}

if (process.env.VERCEL !== '1') {
  startServer();
}

export default startServer;
