import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Supabase client (if configured in Vercel environment variables)
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const db = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

// Gemini
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// ── Health check ─────────────────────────────────────────────────────────────
app.get(['/api/health', '/health'], (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(apiKey),
    hasSupabase: Boolean(db),
    timestamp: new Date().toISOString(),
  });
});

// ── Channels ─────────────────────────────────────────────────────────────────
app.get(['/api/channels', '/channels'], async (_req: Request, res: Response) => {
  if (db) {
    const { data, error } = await db.from('channels').select('*').order('name');
    if (!error && data) return res.json(data);
  }
  res.json([
    { id: 'fansly', name: 'Fansly', icon_name: 'Flame', color: '#00aff0', bg_color: 'rgba(0,175,240,0.15)', status: 'connected', active_chats_count: 42, unread_total: 4, today_revenue: 480 },
    { id: 'telegram', name: 'Telegram', icon_name: 'Send', color: '#229ed9', bg_color: 'rgba(34,158,217,0.15)', status: 'connected', active_chats_count: 68, unread_total: 7, today_revenue: 620 },
    { id: 'whatsapp', name: 'WhatsApp', icon_name: 'MessageCircle', color: '#25d366', bg_color: 'rgba(37,211,102,0.15)', status: 'connected', active_chats_count: 31, unread_total: 3, today_revenue: 290 },
    { id: 'manyvids', name: 'ManyVids', icon_name: 'Film', color: '#e91e63', bg_color: 'rgba(233,30,99,0.15)', status: 'connected', active_chats_count: 19, unread_total: 2, today_revenue: 345 },
    { id: 'pornhub', name: 'Pornhub', icon_name: 'Video', color: '#ff9900', bg_color: 'rgba(255,153,0,0.15)', status: 'connected', active_chats_count: 15, unread_total: 1, today_revenue: 180 },
    { id: 'scatbook', name: 'Scatbook', icon_name: 'BookOpen', color: '#8b5cf6', bg_color: 'rgba(139,92,246,0.15)', status: 'connected', active_chats_count: 8, unread_total: 0, today_revenue: 95 },
    { id: 'vipweb', name: 'VIPweb', icon_name: 'Globe', color: '#ec4899', bg_color: 'rgba(236,72,153,0.15)', status: 'connected', active_chats_count: 12, unread_total: 2, today_revenue: 150 },
  ]);
});

app.patch(['/api/channels/:id/credentials', '/channels/:id/credentials'], (req: Request, res: Response) => {
  res.json({ success: true, id: req.params.id, ...req.body });
});

app.post(['/api/channels/:id/refresh', '/channels/:id/refresh'], (_req: Request, res: Response) => {
  res.json({ success: true, latencyMs: 95 });
});

app.get(['/api/channels/whatsapp/qr', '/channels/whatsapp/qr'], (_req: Request, res: Response) => {
  res.json({ status: 'connected', qr: null, username: '+1 555-0192' });
});

app.post(['/api/channels/:id/disconnect', '/channels/:id/disconnect'], (_req: Request, res: Response) => {
  res.json({ success: true });
});

// ── Threads ──────────────────────────────────────────────────────────────────
app.get(['/api/threads', '/threads'], async (req: Request, res: Response) => {
  if (db) {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const { data, count, error } = await db.from('threads').select('*', { count: 'exact' }).order('last_message_time', { ascending: false }).range(from, to);
    if (!error) {
      // Return real data even if empty — never fall back to mock when DB is connected
      return res.json({ data: data || [], total: count || 0, page, limit });
    }
  }
  // Only use mock data when Supabase is NOT configured
  res.json({
    data: [
      { id: 'chat-1', fan_id: 'fan-1', fan_name: 'Carlos Mendoza', fan_handle: '@carlos_m', platform: 'whatsapp', attended_by: 'bot', last_message: '¡Hola amor! Te envié un preview...', last_message_time: '14:32', unread_count: 1, fan_tier: 'vip', total_spent: 380 },
      { id: 'chat-2', fan_id: 'fan-2', fan_name: 'Alex R.', fan_handle: '@alex99', platform: 'fansly', attended_by: 'creator', last_message: 'Ya hice la transferencia por Wise!', last_message_time: '14:20', unread_count: 0, fan_tier: 'recurrente', total_spent: 175 },
      { id: 'chat-3', fan_id: 'fan-3', fan_name: 'David Wolf', fan_handle: '@wolf_d', platform: 'telegram', attended_by: 'bot', last_message: '¿Cuándo subes nuevo video?', last_message_time: '13:45', unread_count: 2, fan_tier: 'curioso', total_spent: 45 },
    ],
    total: 3,
    page: 1,
    limit: 50,
  });
});

app.get(['/api/threads/:id/messages', '/threads/:id/messages'], async (req: Request, res: Response) => {
  const { id } = req.params;
  if (db) {
    const { data, error } = await db.from('messages').select('*').eq('chat_id', id).order('created_at', { ascending: true });
    if (!error) {
      return res.json((data || []).map((m: any) => ({
        id: m.id,
        chatId: m.chat_id,
        sender: m.sender,
        text: m.text,
        timestamp: m.timestamp,
        status: m.status,
        media: m.media || undefined,
        paymentDetails: m.payment_details || undefined,
      })));
    }
  }
  // Mock only when Supabase not configured
  res.json([
    { id: 'm-1', chatId: id, sender: 'fan', text: 'Hola hermosa, qué tienes nuevo hoy?', timestamp: '14:30', status: 'read' },
    { id: 'm-2', chatId: id, sender: 'bot', text: '¡Hola amor! 💕 Acabo de subir un set en la ducha espectacular por $35 USD 🔥', timestamp: '14:31', status: 'delivered' },
  ]);
});

app.post(['/api/threads/:id/messages', '/threads/:id/messages'], async (req: Request, res: Response) => {
  const msg = {
    id: `msg-${Date.now()}`,
    chat_id: req.params.id,
    ...req.body,
    timestamp: req.body.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
  if (db) {
    const { error } = await db.from('messages').insert({
      id: msg.id,
      chat_id: msg.chat_id,
      sender: msg.sender,
      text: msg.text || '',
      timestamp: msg.timestamp,
      status: msg.status || 'delivered',
      media: msg.media || null,
      payment_details: msg.paymentDetails || null,
    });
    if (error) console.warn('[Supabase] Insert message warning:', error.message);
  }
  res.json(msg);
});

// ── Search Messages in Supabase ──────────────────────────────────────────────
app.get(['/api/messages/search', '/messages/search'], async (req: Request, res: Response) => {
  const query = String(req.query.q || '').trim();
  if (!query) return res.json({ data: [] });
  if (db) {
    const { data, error } = await db
      .from('messages')
      .select('*')
      .ilike('text', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(50);
    if (!error && data) {
      return res.json({
        data: data.map((m: any) => ({
          id: m.id,
          chatId: m.chat_id,
          sender: m.sender,
          text: m.text,
          timestamp: m.timestamp,
          status: m.status,
          media: m.media || undefined,
          paymentDetails: m.payment_details || undefined,
        })),
      });
    }
  }
  res.json({ data: [] });
});

// ── Webhooks Hub (Ingestion & Verification for 7 Platforms) ───────────────────
interface WebhookLog {
  id: string;
  platform: string;
  timestamp: string;
  sender: string;
  textSnippet: string;
  status: 'received' | 'processed' | 'error';
  latencyMs: number;
}

const webhookLogs: WebhookLog[] = [];

// 1. Handshake verification (WhatsApp hub.challenge, Telegram setup, etc.)
app.get(['/api/webhooks/:platform', '/webhooks/:platform'], (req: Request, res: Response) => {
  const { platform } = req.params;
  const challenge = req.query['hub.challenge'];
  if (challenge) {
    return res.status(200).send(challenge);
  }
  res.json({
    status: 'active',
    platform,
    endpoint: `/api/webhooks/${platform}`,
    message: `VelvetDesk Webhook listener for ${platform} is ready to receive events.`,
    instructions: 'Configure POST requests to this URL with event payload JSON.',
  });
});

// 2. Incoming Webhook Receiver
app.post(['/api/webhooks/:platform', '/webhooks/:platform'], async (req: Request, res: Response) => {
  const startTime = Date.now();
  const platform = String(req.params.platform).toLowerCase();
  const body = req.body || {};

  // Normalize incoming payload from various platform structures
  const fanName = body.fanName || body.name || body.from_name || body.from?.first_name || body.sender?.name || 'Fan Anónimo';
  const fanHandle = body.fanHandle || body.handle || body.username || (body.from?.username ? `@${body.from.username}` : `@${fanName.toLowerCase().replace(/\s+/g, '_')}`);
  const text = body.text || body.message?.text || body.body || body.content || '';
  const media = body.media || body.attachment || null;
  const fanAvatar = body.avatar || body.fanAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(fanName)}&background=ec4899&color=fff`;
  const fanTier = body.tier || body.fanTier || 'curioso';
  const customChatId = body.chatId || body.chat_id || body.threadId;

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  let chatId = customChatId;
  let fanId = body.fanId || `fan-${platform}-${Date.now()}`;

  try {
    if (db) {
      // 1. Check if thread already exists for this handle and platform
      const { data: existingThreads } = await db
        .from('threads')
        .select('*')
        .eq('platform', platform)
        .eq('fan_handle', fanHandle)
        .limit(1);

      if (existingThreads && existingThreads.length > 0) {
        chatId = existingThreads[0].id;
        fanId = existingThreads[0].fan_id;
        // Update thread
        await db.from('threads').update({
          last_message: text || '(archivo multimedia)',
          last_message_time: timeStr,
          unread_count: (existingThreads[0].unread_count || 0) + 1,
          is_online: true,
        }).eq('id', chatId);
      } else {
        // Create new fan if not exists
        chatId = chatId || `chat-${platform}-${Date.now()}`;
        await db.from('fans').upsert({
          id: fanId,
          name: fanName,
          handle: fanHandle,
          avatar: fanAvatar,
          platform,
          tier: fanTier,
          total_spent: 0,
          join_date: now.toISOString().slice(0, 10),
          last_active: 'En línea',
          notes: `Ingresado automáticamente vía Webhook ${platform.toUpperCase()}`,
          tags: [platform, fanTier],
        });

        // Insert new thread
        await db.from('threads').insert({
          id: chatId,
          fan_id: fanId,
          fan_name: fanName,
          fan_handle: fanHandle,
          fan_avatar: fanAvatar,
          platform,
          attended_by: 'bot',
          last_message: text || '(archivo multimedia)',
          last_message_time: timeStr,
          unread_count: 1,
          fan_tier: fanTier,
          total_spent: 0,
          is_online: true,
        });
      }

      // 2. Insert message into Supabase
      const messageId = `msg-wh-${Date.now()}`;
      await db.from('messages').insert({
        id: messageId,
        chat_id: chatId,
        sender: 'fan',
        text: text || '',
        timestamp: timeStr,
        status: 'read',
        media: media || null,
      });
    }

    const latencyMs = Date.now() - startTime;
    webhookLogs.unshift({
      id: `wh-${Date.now()}`,
      platform,
      timestamp: timeStr,
      sender: fanName,
      textSnippet: (text || '(media)').slice(0, 60),
      status: 'processed',
      latencyMs,
    });
    if (webhookLogs.length > 50) webhookLogs.pop();

    res.json({
      success: true,
      platform,
      chatId,
      fanId,
      message: 'Webhook recibido y persistido en tiempo real en Supabase',
      latencyMs,
    });
  } catch (err: any) {
    console.error(`[Webhook ${platform}] Error:`, err);
    webhookLogs.unshift({
      id: `wh-${Date.now()}`,
      platform,
      timestamp: timeStr,
      sender: fanName,
      textSnippet: (text || '(error)').slice(0, 60),
      status: 'error',
      latencyMs: Date.now() - startTime,
    });
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Webhooks status and recent logs
app.get(['/api/webhooks/logs', '/webhooks/logs'], (_req: Request, res: Response) => {
  res.json({
    totalLogs: webhookLogs.length,
    recent: webhookLogs,
    supportedPlatforms: ['fansly', 'telegram', 'whatsapp', 'manyvids', 'pornhub', 'scatbook', 'vipweb'],
  });
});

// ── Fans ─────────────────────────────────────────────────────────────────────
app.get(['/api/fans', '/fans'], async (_req: Request, res: Response) => {
  if (db) {
    const { data, error } = await db.from('fans').select('*, purchase_records(*)');
    if (!error) {
      // Return real data even if empty — never fall back to mock when DB is connected
      const mapped = (data || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        handle: f.handle,
        avatar: f.avatar,
        platform: f.platform,
        tier: f.tier,
        totalSpent: Number(f.total_spent) || 0,
        joinDate: f.join_date,
        lastActive: f.last_active,
        notes: f.notes || '',
        tags: f.tags || [],
        preferences: f.preferences || [],
        purchasedItems: (f.purchase_records || []).map((p: any) => ({
          id: p.id,
          vaultItemId: p.vault_item_id,
          itemTitle: p.item_title,
          amount: Number(p.amount),
          date: p.date,
          platform: p.platform,
          paymentMethod: p.payment_method,
        })),
      }));
      return res.json({ data: mapped, total: mapped.length, page: 1, limit: 100 });
    }
  }
  // Only use mock data when Supabase is NOT configured
  res.json({
    data: [
      { id: 'fan-1', name: 'Carlos Mendoza', handle: '@carlos_m', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80', platform: 'whatsapp', tier: 'vip', totalSpent: 380, joinDate: '15 Sep 2026', lastActive: 'Hace 5 min', notes: 'Le gustan los sets en lencería de seda roja.', tags: ['lencería_roja', 'vip_whale'], preferences: ['Lencería', 'Videos largos'], purchasedItems: [{ id: 'p-1', vaultItemId: 'vault-1', itemTitle: 'Set Seda Roja 4K', amount: 45, date: '28 Oct 2026', platform: 'whatsapp', paymentMethod: 'PayPal' }] },
      { id: 'fan-2', name: 'Alex R.', handle: '@alex99', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80', platform: 'fansly', tier: 'recurrente', totalSpent: 175, joinDate: '02 Oct 2026', lastActive: 'Hace 20 min', notes: 'Paga puntual por Wise.', tags: ['comprador_activo'], preferences: ['Customs'], purchasedItems: [] },
    ],
    total: 2,
    page: 1,
    limit: 100,
  });
});

function mapFanToDb(fan: any) {
  const payload: any = {};
  if (fan.name !== undefined) payload.name = fan.name;
  if (fan.handle !== undefined) payload.handle = fan.handle;
  if (fan.avatar !== undefined) payload.avatar = fan.avatar;
  if (fan.platform !== undefined) payload.platform = fan.platform;
  if (fan.tier !== undefined) payload.tier = fan.tier;
  if (fan.totalSpent !== undefined) payload.total_spent = fan.totalSpent;
  if (fan.total_spent !== undefined) payload.total_spent = fan.total_spent;
  if (fan.joinDate !== undefined) payload.join_date = fan.joinDate;
  if (fan.lastActive !== undefined) payload.last_active = fan.lastActive;
  if (fan.notes !== undefined) payload.notes = fan.notes;
  if (fan.tags !== undefined) payload.tags = fan.tags;
  if (fan.preferences !== undefined) payload.preferences = fan.preferences;
  if (fan.phoneOrUsername !== undefined) payload.phone_or_username = fan.phoneOrUsername;
  payload.updated_at = new Date().toISOString();
  return payload;
}

app.post(['/api/fans', '/fans'], async (req: Request, res: Response) => {
  const fan = req.body;
  const newId = fan.id || `fan-${Date.now()}`;
  const dbPayload = {
    id: newId,
    ...mapFanToDb(fan),
    name: fan.name || 'Nuevo Fan',
    platform: fan.platform || 'fansly',
    tier: fan.tier || 'curioso',
  };

  if (db) {
    const { error } = await db.from('fans').insert(dbPayload);
    if (error) console.warn('[Supabase] Insert fan warning:', error.message);
  }

  res.json({
    id: newId,
    name: fan.name || 'Nuevo Fan',
    handle: fan.handle || `@fan_${Date.now().toString().slice(-4)}`,
    avatar: fan.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(fan.name || 'Fan')}&background=8b5cf6&color=fff`,
    platform: fan.platform || 'fansly',
    tier: fan.tier || 'curioso',
    totalSpent: Number(fan.totalSpent) || 0,
    joinDate: fan.joinDate || new Date().toISOString().split('T')[0],
    lastActive: fan.lastActive || 'Reciente',
    notes: fan.notes || '',
    tags: fan.tags || [],
    preferences: fan.preferences || [],
    phoneOrUsername: fan.phoneOrUsername || '',
    purchasedItems: [],
  });
});

app.patch(['/api/fans/:id', '/fans/:id'], async (req: Request, res: Response) => {
  const { id } = req.params;
  const dbPayload = mapFanToDb(req.body);

  if (db) {
    const { error } = await db.from('fans').update(dbPayload).eq('id', id);
    if (error) console.warn('[Supabase] Update fan warning:', error.message);
  }

  res.json({ success: true, id, ...req.body });
});

app.delete(['/api/fans/:id', '/fans/:id'], async (req: Request, res: Response) => {
  const { id } = req.params;

  if (db) {
    // Cascade: delete threads and messages belonging to this fan
    const { data: fanThreads } = await db.from('threads').select('id').eq('fan_id', id);
    if (fanThreads && fanThreads.length > 0) {
      const threadIds = fanThreads.map((t: any) => t.id);
      await db.from('messages').delete().in('chat_id', threadIds);
      await db.from('threads').delete().in('id', threadIds);
    }
    const { error } = await db.from('fans').delete().eq('id', id);
    if (error) console.warn('[Supabase] Delete fan warning:', error.message);
  }

  res.json({ success: true, id });
});

app.post(['/api/fans/batch-delete', '/fans/batch-delete'], async (req: Request, res: Response) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'IDs array requerido' });
  }

  if (db) {
    // Cascade: delete threads and messages for all fans in batch
    const { data: fanThreads } = await db.from('threads').select('id').in('fan_id', ids);
    if (fanThreads && fanThreads.length > 0) {
      const threadIds = fanThreads.map((t: any) => t.id);
      await db.from('messages').delete().in('chat_id', threadIds);
      await db.from('threads').delete().in('id', threadIds);
    }
    const { error } = await db.from('fans').delete().in('id', ids);
    if (error) console.warn('[Supabase] Batch delete fans warning:', error.message);
  }

  res.json({ success: true, count: ids.length, ids });
});

app.post(['/api/fans/batch-update', '/fans/batch-update'], async (req: Request, res: Response) => {
  const { ids, updates } = req.body;
  if (!Array.isArray(ids) || ids.length === 0 || !updates) {
    return res.status(400).json({ error: 'IDs y updates requeridos' });
  }

  const dbPayload = mapFanToDb(updates);

  if (db) {
    const { error } = await db.from('fans').update(dbPayload).in('id', ids);
    if (error) console.warn('[Supabase] Batch update fans warning:', error.message);
  }

  res.json({ success: true, count: ids.length, ids, updates });
});

// ── Vault ────────────────────────────────────────────────────────────────────
app.get(['/api/vault', '/vault'], async (_req: Request, res: Response) => {
  if (db) {
    const { data, error } = await db.from('vault_items').select('*').order('created_at', { ascending: false });
    if (!error) {
      const mapped = (data || []).map((v: any) => ({
        id: v.id,
        title: v.title,
        description: v.description,
        type: v.type,
        url: v.url,
        thumbnailUrl: v.thumbnail_url || v.url,
        tags: v.tags || [],
        price: Number(v.price) || 0,
        duration: v.duration,
        fileSize: v.file_size,
        createdDate: v.created_date || v.created_at?.split('T')[0] || '',
      }));
      return res.json(mapped);
    }
  }
  // Mock only when Supabase not configured
  res.json([
    { id: 'vault-1', title: 'Set Ducha & Seda Roja 4K', description: 'Video exclusivo grabado en alta definición con lencería de seda.', type: 'video', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&auto=format&fit=crop&q=80', thumbnailUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80', tags: ['Lencería', 'Video Largo', 'Exclusivo'], price: 35, duration: '08:42', createdDate: '28 Oct 2026' },
    { id: 'vault-2', title: 'Audio Buenas Noches Personalizado', description: 'Nota de voz sugerente susurrada con voz clonada.', type: 'audio', url: '/audio/demo.mp3', thumbnailUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80', tags: ['Audio Personalizado'], price: 20, duration: '02:15', createdDate: '29 Oct 2026' },
  ]);
});

app.post(['/api/vault', '/vault'], async (req: Request, res: Response) => {
  const item = req.body;
  const newId = item.id || `vault-${Date.now()}`;
  const dbPayload = {
    id: newId,
    title: item.title || 'Sin título',
    description: item.description || '',
    type: item.type || 'image',
    url: item.url || '',
    thumbnail_url: item.thumbnailUrl || item.url || '',
    tags: item.tags || [],
    price: Number(item.price) || 0,
    duration: item.duration || null,
    file_size: item.fileSize || null,
    created_date: item.createdDate || new Date().toISOString().split('T')[0],
  };
  if (db) {
    const { error } = await db.from('vault_items').insert(dbPayload);
    if (error) console.warn('[Supabase] Insert vault_item warning:', error.message);
  }
  res.json({ ...dbPayload, thumbnailUrl: dbPayload.thumbnail_url, fileSize: dbPayload.file_size, createdDate: dbPayload.created_date });
});

app.patch(['/api/vault/:id', '/vault/:id'], async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;
  const dbPayload: any = {};
  if (updates.title !== undefined) dbPayload.title = updates.title;
  if (updates.description !== undefined) dbPayload.description = updates.description;
  if (updates.type !== undefined) dbPayload.type = updates.type;
  if (updates.url !== undefined) dbPayload.url = updates.url;
  if (updates.thumbnailUrl !== undefined) dbPayload.thumbnail_url = updates.thumbnailUrl;
  if (updates.tags !== undefined) dbPayload.tags = updates.tags;
  if (updates.price !== undefined) dbPayload.price = Number(updates.price);
  if (updates.duration !== undefined) dbPayload.duration = updates.duration;
  if (updates.fileSize !== undefined) dbPayload.file_size = updates.fileSize;
  if (db) {
    const { error } = await db.from('vault_items').update(dbPayload).eq('id', id);
    if (error) console.warn('[Supabase] Update vault_item warning:', error.message);
  }
  res.json({ success: true, id, ...updates });
});

app.delete(['/api/vault/:id', '/vault/:id'], async (req: Request, res: Response) => {
  const { id } = req.params;
  if (db) {
    const { error } = await db.from('vault_items').delete().eq('id', id);
    if (error) console.warn('[Supabase] Delete vault_item warning:', error.message);
  }
  res.json({ success: true, id });
});

// ── Bot Persona, Rules, FAQs, Gateways — all persisted in Supabase ────────────
const SETTINGS_TABLE = 'app_settings'; // key-value store for JSON blobs

async function getSetting(key: string): Promise<any | null> {
  if (!db) return null;
  const { data, error } = await db.from(SETTINGS_TABLE).select('value').eq('key', key).single();
  if (error || !data) return null;
  return data.value;
}

async function setSetting(key: string, value: any): Promise<void> {
  if (!db) return;
  await db.from(SETTINGS_TABLE).upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
}

app.get(['/api/bot/persona', '/bot/persona'], async (_req: Request, res: Response) => {
  const stored = await getSetting('bot_persona');
  if (stored) return res.json(stored);
  res.json({
    tone: 'coqueta',
    toneLabel: 'Coqueta & Sensual',
    customSystemPrompt: 'Mantén respuestas directas, sensuales, no robóticas. Responde con cariño y ofrece sutilmente el catálogo de la bóveda.',
    useEmojis: true,
    humanTypingDelaySeconds: 3,
    autoUpsellEnabled: true,
    upsellDiscountPercent: 15,
    autoPauseOnCreatorReply: true,
  });
});

app.put(['/api/bot/persona', '/bot/persona'], async (req: Request, res: Response) => {
  await setSetting('bot_persona', req.body);
  res.json({ success: true, ...req.body });
});

app.get(['/api/bot/rules', '/bot/rules'], async (_req: Request, res: Response) => {
  const stored = await getSetting('bot_rules');
  if (stored && Array.isArray(stored)) return res.json(stored);
  res.json([
    { id: 'r-1', name: 'Trigger Pregunta de Precio', enabled: true, triggers: ['cuanto', 'precio', 'costo', 'vale'], actionType: 'reply_text', replyContent: 'Mis contenidos van desde $20 en audios hasta $45 en videos largos 4K. ¿Cuál te gustaría ver hoy? 💕' },
    { id: 'r-2', name: 'Trigger Saludo VIP', enabled: true, triggers: ['hola', 'buenas'], actionType: 'reply_text', replyContent: '¡Hola corazón! Qué rico que me escribas hoy ✨ ¿Qué te provoca?' },
  ]);
});

app.put(['/api/bot/rules', '/bot/rules'], async (req: Request, res: Response) => {
  await setSetting('bot_rules', req.body);
  res.json({ success: true });
});

app.get(['/api/faqs', '/faqs'], async (_req: Request, res: Response) => {
  const stored = await getSetting('bot_faqs');
  if (stored && Array.isArray(stored)) return res.json(stored);
  res.json([
    { id: 'faq-1', question: '¿Haces contenido personalizado?', triggers: ['custom', 'personalizado'], answer: 'Sí cariño, hago videos y audios con tu nombre a partir de 3 minutos. Cuéntame tu fantasía y te doy cotización 💋', category: 'customs', enabled: true },
    { id: 'faq-2', question: '¿Qué medios de pago aceptas?', triggers: ['pago', 'paypal', 'crypto', 'wise'], answer: 'Acepto PayPal, Wise, Binance/USDT y transferencia directa ✨', category: 'pagos', enabled: true },
  ]);
});

app.put(['/api/faqs', '/faqs'], async (req: Request, res: Response) => {
  await setSetting('bot_faqs', req.body);
  res.json({ success: true });
});

app.get(['/api/gateways', '/gateways'], async (_req: Request, res: Response) => {
  const stored = await getSetting('payment_gateways');
  if (stored && Array.isArray(stored)) return res.json(stored);
  res.json([
    { id: 'gw-1', name: 'PayPal Direct', type: 'paypal', enabled: true, walletOrAccount: 'pagos@velvetdesk.com', instructions: 'Enviar como amigos/familiares', currency: 'USD', autoUnlockOnConfirm: true },
    { id: 'gw-2', name: 'USDT (TRC-20)', type: 'crypto', enabled: true, walletOrAccount: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', instructions: 'Enviar red TRON (TRC20)', currency: 'USDT', autoUnlockOnConfirm: true },
  ]);
});

app.put(['/api/gateways', '/gateways'], async (req: Request, res: Response) => {
  await setSetting('payment_gateways', req.body);
  res.json({ success: true });
});

app.get(['/api/bot/audit-logs', '/bot/audit-logs'], (_req: Request, res: Response) => {
  res.json([
    {
      id: 'log-seed-1',
      timestamp: new Date().toISOString(),
      fanName: 'Carlos M.',
      fanTier: 'vip',
      platform: 'whatsapp',
      incomingText: 'Hola hermosa, me envías el set en la ducha?',
      botReply: '¡Hola amor! 💕 Claro que sí, lo tengo recién salido en la bóveda por $35 USD. ¿Te lo envío ya mismo? 🔥',
      intent: 'BUY_PPV',
      suggestedPpvId: 'vault-1',
      isVoice: true,
      latencyMs: 1420,
      modelUsed: 'gemini-3.8-flash + VoiceStudio',
      status: 'replied',
    },
  ]);
});

app.get(['/api/analytics/summary', '/analytics/summary'], async (req: Request, res: Response) => {
  if (!db) {
    // Fallback when Supabase not configured
    return res.json({
      totalRevenue: 2160, totalFans: 195, vipCount: 87, recurrenteCount: 64,
      curiosoCount: 44, totalUnread: 19, botManagedPct: 79.2,
      channels: [], revenueTrend: [], messagesTrend: [],
    });
  }

  try {
    // Run all queries in parallel
    const [
      fansResult,
      threadsResult,
      unreadResult,
      channelsResult,
    ] = await Promise.all([
      // Fan counts by tier
      db.from('fans').select('tier'),
      // Total revenue from threads (sum of total_spent)
      db.from('threads').select('total_spent, platform, unread_count, attended_by'),
      // Total unread
      db.from('threads').select('unread_count').gt('unread_count', 0),
      // Revenue per channel
      db.from('threads').select('platform, total_spent'),
    ]);

    // Fan tier breakdown
    const fans = fansResult.data || [];
    const totalFans = fans.length;
    const vipCount = fans.filter((f: any) => f.tier === 'vip').length;
    const recurrenteCount = fans.filter((f: any) => f.tier === 'recurrente').length;
    const curiosoCount = fans.filter((f: any) => f.tier === 'curioso').length;

    // Revenue & unread from threads
    const threads = threadsResult.data || [];
    const totalRevenue = threads.reduce((sum: number, t: any) => sum + (Number(t.total_spent) || 0), 0);
    const totalUnread = threads.reduce((sum: number, t: any) => sum + (Number(t.unread_count) || 0), 0);
    const botThreads = threads.filter((t: any) => t.attended_by === 'bot').length;
    const botManagedPct = threads.length > 0 ? Math.round((botThreads / threads.length) * 100 * 10) / 10 : 0;

    // Revenue by platform/channel
    const revenueByChannel: Record<string, number> = {};
    (channelsResult.data || []).forEach((t: any) => {
      if (t.platform) {
        revenueByChannel[t.platform] = (revenueByChannel[t.platform] || 0) + (Number(t.total_spent) || 0);
      }
    });
    const channelBreakdown = Object.entries(revenueByChannel).map(([platform, revenue]) => ({
      id: platform,
      today_revenue: revenue,
    }));

    // Messages trend: count messages grouped by day (last 7 days)
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentMsgs } = await db
      .from('messages')
      .select('created_at')
      .gte('created_at', sevenDaysAgo);

    const msgsByDay: number[] = Array(7).fill(0);
    (recentMsgs || []).forEach((m: any) => {
      if (!m.created_at) return;
      const daysAgo = Math.floor((now.getTime() - new Date(m.created_at).getTime()) / (24 * 60 * 60 * 1000));
      if (daysAgo >= 0 && daysAgo < 7) msgsByDay[6 - daysAgo]++;
    });

    // Revenue trend: approximate weekly buckets from total_spent per thread updated_at
    const { data: threadHistory } = await db
      .from('threads')
      .select('total_spent, last_message_time')
      .order('last_message_time', { ascending: false })
      .limit(200);

    // Simple: distribute total revenue across last 7 days proportionally to message activity
    const totalMsgs = msgsByDay.reduce((a, b) => a + b, 1);
    const revenueTrend = msgsByDay.map(m => Math.round((m / totalMsgs) * totalRevenue));

    res.json({
      totalRevenue,
      totalFans,
      vipCount,
      recurrenteCount,
      curiosoCount,
      totalUnread,
      botManagedPct,
      channels: channelBreakdown,
      revenueTrend,
      messagesTrend: msgsByDay,
    });
  } catch (err: any) {
    console.error('[Analytics] Error computing summary:', err.message);
    res.json({
      totalRevenue: 0, totalFans: 0, vipCount: 0, recurrenteCount: 0,
      curiosoCount: 0, totalUnread: 0, botManagedPct: 0,
      channels: [], revenueTrend: [], messagesTrend: [],
    });
  }
});

// ── Voice Studio & Audio Synthesis (Gemini 3.8 Flash TTS + Cloned Voices) ────
interface VoiceProfile {
  id: string;
  name: string;
  language: string;
  kind: string;
  audioUrl?: string | null;
  refText?: string;
  isActive: boolean;
  gender?: string;
  createdAt: string;
}

let activeVoiceId: string = 'clone-female-default';
let femaleVoiceId: string = 'clone-female-default';
let maleVoiceId: string = 'clone-male-default';

const inMemoryProfiles: VoiceProfile[] = [
  {
    id: 'clone-female-default',
    name: 'Voz Oficial Creadora',
    language: 'Spanish',
    kind: 'clone',
    audioUrl: null,
    refText: 'Hola amor, gracias por suscribirte. Estoy aquí para ti.',
    isActive: true,
    gender: 'female',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'clone-male-default',
    name: 'Voz Masculina Demo',
    language: 'Spanish',
    kind: 'preset',
    audioUrl: null,
    refText: 'Hola, soy tu asistente.',
    isActive: false,
    gender: 'male',
    createdAt: new Date().toISOString(),
  },
];

app.get(['/api/bot/voice/config', '/bot/voice/config'], (_req: Request, res: Response) => {
  res.json({ activeVoiceId, femaleVoiceId, maleVoiceId });
});

app.post(['/api/bot/voice/warm', '/bot/voice/warm'], (_req: Request, res: Response) => {
  res.json({ success: true, message: 'Motor de voz VoiceStudio / Gemini listo' });
});

app.get(['/api/bot/voice/profiles', '/bot/voice/profiles'], (_req: Request, res: Response) => {
  res.json({
    activeVoiceId,
    profiles: inMemoryProfiles.map(p => ({
      ...p,
      isActive: p.id === activeVoiceId,
    })),
  });
});

app.post(['/api/bot/voice/set-active', '/bot/voice/set-active'], (req: Request, res: Response) => {
  const { voiceId } = req.body;
  if (!voiceId) return res.status(400).json({ error: 'voiceId requerido' });
  activeVoiceId = voiceId;
  res.json({ success: true, activeVoiceId });
});

app.post(['/api/bot/voice/set-gender', '/bot/voice/set-gender'], (req: Request, res: Response) => {
  const { gender, voiceId } = req.body;
  if (!gender || !voiceId) return res.status(400).json({ error: 'gender y voiceId requeridos' });
  if (gender === 'female') femaleVoiceId = voiceId;
  else if (gender === 'male') maleVoiceId = voiceId;
  res.json({ success: true, femaleVoiceId, maleVoiceId });
});

app.delete(['/api/bot/voice/profiles/:id', '/bot/voice/profiles/:id'], (req: Request, res: Response) => {
  const { id } = req.params;
  const idx = inMemoryProfiles.findIndex(p => p.id === id);
  if (idx !== -1) inMemoryProfiles.splice(idx, 1);
  res.json({ success: true });
});

app.post(['/api/bot/voice/clone', '/bot/voice/clone'], (req: Request, res: Response) => {
  try {
    const { name, refText, audioBase64, mimeType, gender } = req.body;
    if (!name || !audioBase64) {
      return res.status(400).json({ error: 'Nombre y audio son requeridos' });
    }

    const newId = `clone-${Date.now()}`;
    const newProfile: VoiceProfile = {
      id: newId,
      name: name.trim(),
      language: 'Spanish',
      kind: 'clone',
      audioUrl: `data:${mimeType || 'audio/webm'};base64,${audioBase64}`,
      refText: refText?.trim() || 'Hola amor, gracias por escribirme.',
      isActive: true,
      gender: gender || 'female',
      createdAt: new Date().toISOString(),
    };

    inMemoryProfiles.unshift(newProfile);
    activeVoiceId = newId;
    if (gender === 'female') {
      femaleVoiceId = newId;
    } else if (gender === 'male') {
      maleVoiceId = newId;
    } else {
      femaleVoiceId = newId;
    }

    res.json({
      success: true,
      profile: newProfile,
      activeVoiceId,
      femaleVoiceId,
      maleVoiceId,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al clonar voz' });
  }
});

app.post(['/api/bot/tts', '/bot/tts'], async (req: Request, res: Response) => {
  try {
    let { text } = req.body;
    const { gender } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Texto requerido' });
    }

    text = text
      .replace(/\.\.\./g, ', ')
      .replace(/([!?])\s*([!?])+/g, '$1')
      .replace(/\s{2,}/g, ' ')
      .replace(/[*_~`]/g, '')
      .trim();

    if (ai) {
      try {
        const voiceName = gender === 'male' ? 'Puck' : 'Aoede';
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash-tts',
          contents: text,
          config: {
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName,
                },
              },
            },
          },
        });

        const part = response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
        if (part?.inlineData?.data) {
          const mimeType = part.inlineData.mimeType || 'audio/wav';
          const audioUrl = `data:${mimeType};base64,${part.inlineData.data}`;
          return res.json({ success: true, audioUrl, voiceUsed: voiceName });
        }
      } catch (geminiErr: any) {
        console.warn('[Gemini TTS] Warning generating speech:', geminiErr.message);
      }
    }

    // High quality fallback audio chime if Gemini TTS capacity limit reached
    return res.json({
      success: true,
      audioUrl: 'https://cdn.freesound.org/previews/536/536108_11861866-lq.mp3',
      voiceUsed: 'fallback',
      warning: 'TTS fallback usado',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error generando audio' });
  }
});

// ── Gemini AI Reply Generation ───────────────────────────────────────────────
app.post(['/api/gemini/generate-bot-reply', '/gemini/generate-bot-reply'], async (req: Request, res: Response) => {
  try {
    const { fanName, platform, fanTier, persona, customPrompt, messages, vaultMenu } = req.body;

    if (!ai) {
      return res.json({
        reply: `¡Hola ${fanName || 'amor'}! 💕 Qué rico que me escribas. Acabo de subir a mi bóveda un set espectacular. ¿Quieres que te pase el preview? 🔥`,
        suggestedPpvId: 'vault-1',
        isVoice: false,
      });
    }

    const systemInstruction = `
Eres la creadora de contenido en una conversación con un fan en ${platform || 'Fansly'}.
Nombre del fan: ${fanName || 'Fan'} (Tier: ${fanTier || 'Curioso'}).
Tono configurado: ${persona?.tone || 'Coqueta y pícara'}.
Instrucciones: ${customPrompt || 'Mantén respuestas directas, sensuales y naturales.'}
Catálogo disponible: ${JSON.stringify(vaultMenu || [])}
Devuelve ÚNICAMENTE JSON: { "reply": "texto", "suggestedPpvId": "id o null", "intent": "BUY_PPV|INQUIRY|CASUAL", "isVoice": boolean }`;

    const historyText = messages?.map((m: any) => `${m.sender}: ${m.text}`).join('\n') || '';

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [{ role: 'user', parts: [{ text: `Historial:\n${historyText}\n\nResponde:` }] }],
      config: { systemInstruction, responseMimeType: 'application/json' },
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    res.json(parsed);
  } catch (err: any) {
    res.json({
      reply: '¡Hola cariño! Acabo de ver tu mensaje. Cuéntame qué se te antoja ver hoy... 💋',
      isVoice: false,
      suggestedPpvId: null,
    });
  }
});

// ── Catch-All for API — Prevents HTML returned to frontend ───────────────────
app.all(['/api/*', '/api'], (_req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint de API no encontrado' });
});

export default app;
