import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
app.use(express.json({ limit: '10mb' }));

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
  // Fallback demo channels
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
    if (!error && data) {
      return res.json({ data, total: count || data.length, page, limit });
    }
  }
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
    const { data, error } = await db.from('messages').select('*').eq('chat_id', id).order('timestamp', { ascending: true });
    if (!error && data) return res.json(data);
  }
  res.json([
    { id: 'm-1', chat_id: id, sender: 'fan', text: 'Hola hermosa, qué tienes nuevo hoy?', timestamp: '14:30', status: 'read' },
    { id: 'm-2', chat_id: id, sender: 'bot', text: '¡Hola amor! 💕 Acabo de subir un set en la ducha espectacular por $35 USD 🔥', timestamp: '14:31', status: 'delivered' },
  ]);
});

app.post(['/api/threads/:id/messages', '/threads/:id/messages'], (req: Request, res: Response) => {
  const msg = {
    id: `msg-${Date.now()}`,
    chat_id: req.params.id,
    ...req.body,
    timestamp: req.body.timestamp || 'Ahora',
  };
  res.json(msg);
});

// ── Fans ─────────────────────────────────────────────────────────────────────
app.get(['/api/fans', '/fans'], async (_req: Request, res: Response) => {
  if (db) {
    const { data, error } = await db.from('fans').select('*, purchase_records(*)');
    if (!error && data) {
      const mapped = data.map((f: any) => ({
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

app.patch(['/api/fans/:id', '/fans/:id'], (req: Request, res: Response) => {
  res.json({ success: true, id: req.params.id, ...req.body });
});

// ── Vault ────────────────────────────────────────────────────────────────────
app.get(['/api/vault', '/vault'], async (_req: Request, res: Response) => {
  if (db) {
    const { data, error } = await db.from('vault_items').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      const mapped = data.map((v: any) => ({
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
        createdDate: v.created_date,
      }));
      return res.json(mapped);
    }
  }
  res.json([
    { id: 'vault-1', title: 'Set Ducha & Seda Roja 4K', description: 'Video exclusivo grabado en alta definición con lencería de seda.', type: 'video', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&auto=format&fit=crop&q=80', thumbnailUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80', tags: ['Lencería', 'Video Largo', 'Exclusivo'], price: 35, duration: '08:42', createdDate: '28 Oct 2026' },
    { id: 'vault-2', title: 'Audio Buenas Noches Personalizado', description: 'Nota de voz sugerente susurrada con voz clonada.', type: 'audio', url: '/audio/demo.mp3', thumbnailUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80', tags: ['Audio Personalizado'], price: 20, duration: '02:15', createdDate: '29 Oct 2026' },
  ]);
});

// ── Bot Persona, Rules, FAQs, Gateways ────────────────────────────────────────
app.get(['/api/bot/persona', '/bot/persona'], (_req: Request, res: Response) => {
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

app.put(['/api/bot/persona', '/bot/persona'], (req: Request, res: Response) => {
  res.json({ success: true, ...req.body });
});

app.get(['/api/bot/rules', '/bot/rules'], (_req: Request, res: Response) => {
  res.json([
    { id: 'r-1', name: 'Trigger Pregunta de Precio', enabled: true, triggers: ['cuanto', 'precio', 'costo', 'vale'], actionType: 'reply_text', replyContent: 'Mis contenidos van desde $20 en audios hasta $45 en videos largos 4K. ¿Cuál te gustaría ver hoy? 💕' },
    { id: 'r-2', name: 'Trigger Saludo VIP', enabled: true, triggers: ['hola', 'buenas'], actionType: 'reply_text', replyContent: '¡Hola corazón! Qué rico que me escribas hoy ✨ ¿Qué te provoca?' },
  ]);
});

app.put(['/api/bot/rules', '/bot/rules'], (_req: Request, res: Response) => {
  res.json({ success: true });
});

app.get(['/api/faqs', '/faqs'], (_req: Request, res: Response) => {
  res.json([
    { id: 'faq-1', question: '¿Haces contenido personalizado?', triggers: ['custom', 'personalizado'], answer: 'Sí cariño, hago videos y audios con tu nombre a partir de 3 minutos. Cuéntame tu fantasía y te doy cotización 💋', category: 'customs', enabled: true },
    { id: 'faq-2', question: '¿Qué medios de pago aceptas?', triggers: ['pago', 'paypal', 'crypto', 'wise'], answer: 'Acepto PayPal, Wise, Binance/USDT y transferencia directa ✨', category: 'pagos', enabled: true },
  ]);
});

app.put(['/api/faqs', '/faqs'], (_req: Request, res: Response) => {
  res.json({ success: true });
});

app.get(['/api/gateways', '/gateways'], (_req: Request, res: Response) => {
  res.json([
    { id: 'gw-1', name: 'PayPal Direct', type: 'paypal', enabled: true, walletOrAccount: 'pagos@velvetdesk.com', instructions: 'Enviar como amigos/familiares', currency: 'USD', autoUnlockOnConfirm: true },
    { id: 'gw-2', name: 'USDT (TRC-20)', type: 'crypto', enabled: true, walletOrAccount: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', instructions: 'Enviar red TRON (TRC20)', currency: 'USDT', autoUnlockOnConfirm: true },
  ]);
});

app.put(['/api/gateways', '/gateways'], (_req: Request, res: Response) => {
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
      modelUsed: 'gemini-1.5-flash + VoiceStudio',
      status: 'replied',
    },
  ]);
});

app.get(['/api/analytics/summary', '/analytics/summary'], (_req: Request, res: Response) => {
  res.json({
    todayRevenue: 2160,
    activeFans: 195,
    unreadMessages: 19,
    connectedChannels: 7,
    ppvUnlockedCount: 48,
    conversionRate: 34.2,
  });
});

// ── Gemini AI Routes ──────────────────────────────────────────────────────────
app.post(['/api/gemini/generate-bot-reply', '/gemini/generate-bot-reply'], async (req: Request, res: Response) => {
  try {
    const { fanName, platform, fanTier, persona, customPrompt, rules, messages, vaultMenu } = req.body;

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
      model: 'gemini-1.5-flash',
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

export default app;
