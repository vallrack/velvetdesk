/**
 * Bot Engine — VelvetDesk (Server-Side Internal Module)
 *
 * Centralizes Gemini AI reply generation and TTS synthesis for use
 * inside Node.js integrations (WhatsApp, Telegram) WITHOUT going through
 * the Express HTTP layer. This avoids the auth middleware 401 issue and
 * eliminates unnecessary localhost loopback overhead.
 *
 * Used by: whatsapp.ts, telegram.ts
 * NOT for use on the frontend (browser).
 */
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const audioDir = path.resolve(__dirname, '../../public/audio');

// Ensure audio dir exists
if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}

// Shared Gemini AI instance
const apiKey = process.env.GEMINI_API_KEY;
let _ai: GoogleGenAI | null = null;
function getAI(): GoogleGenAI | null {
  if (!_ai && apiKey) {
    _ai = new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
  }
  return _ai;
}

// VoiceStudio base URL (local)
const VS = 'http://127.0.0.1:3900';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface BotReplyParams {
  fanName: string;
  fanTier: string;
  platform: string;
  persona: { tone?: string; customSystemPrompt?: string };
  rules: Array<{ id: string; name: string; enabled: boolean; triggers: string[]; actionType: string; replyContent: string; targetPpvId?: string | null }>;
  messages: Array<{ sender: string; text: string }>;
  vaultMenu: Array<{ id: string; title: string; type: string; price: number }>;
}

export interface BotReplyResult {
  reply: string;
  isVoice: boolean;
  suggestedPpvId: string | null;
  intent?: string;
}

export interface TtsResult {
  success: boolean;
  audioPath: string | null;   // Absolute path on disk (for WhatsApp readFileSync)
  audioUrl: string | null;    // Relative URL for HTTP serving (for Telegram sendVoice)
  voiceUsed: string;
}

export interface BotAuditLog {
  id: string;
  timestamp: string;
  fanName: string;
  fanTier: string;
  platform: string;
  incomingText: string;
  botReply: string;
  intent?: string;
  suggestedPpvId?: string | null;
  isVoice: boolean;
  latencyMs: number;
  modelUsed: string;
  status: 'replied' | 'fallback' | 'rule_triggered' | 'error';
  ruleMatched?: string;
}

const auditLogs: BotAuditLog[] = [];
const MAX_AUDIT_LOGS = 200;

export function addBotAuditLog(log: Omit<BotAuditLog, 'id' | 'timestamp'>): BotAuditLog {
  const entry: BotAuditLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    ...log,
  };
  auditLogs.unshift(entry);
  if (auditLogs.length > MAX_AUDIT_LOGS) {
    auditLogs.pop();
  }
  return entry;
}

export function getBotAuditLogs(): BotAuditLog[] {
  return [...auditLogs];
}

export function clearBotAuditLogs(): void {
  auditLogs.length = 0;
}

// ─── Gemini Bot Reply (direct function — no HTTP) ─────────────────────────────
export async function generateBotReply(params: BotReplyParams): Promise<BotReplyResult> {
  const startTime = Date.now();
  const lastUserMsg = params.messages[params.messages.length - 1]?.text || '';
  const ai = getAI();

  if (!ai) {
    // Fallback without AI key
    const fallbackReply = buildFallbackReply(params);
    addBotAuditLog({
      fanName: params.fanName || 'Fan',
      fanTier: params.fanTier || 'curioso',
      platform: params.platform || 'fansly',
      incomingText: lastUserMsg,
      botReply: fallbackReply,
      intent: 'FALLBACK',
      suggestedPpvId: null,
      isVoice: false,
      latencyMs: Date.now() - startTime,
      modelUsed: 'offline-rule-engine',
      status: 'fallback',
    });
    return { reply: fallbackReply, isVoice: false, suggestedPpvId: null };
  }

  const systemInstruction = `
Eres la creadora de contenido en una conversación directa con un fan en ${params.platform || 'Fansly'}.
Nombre del fan: ${params.fanName || 'Fan'} (Nivel: ${params.fanTier || 'Curioso'}).
Tu tono/personalidad configurada: ${params.persona?.tone || 'Coqueta, pícara y dulce, usando emojis sugestivos'}.
Reglas activadas: ${JSON.stringify(params.rules || [], null, 2)}
Instrucciones personalizadas: ${params.persona?.customSystemPrompt || 'Mantén respuestas directas, sensuales, no robóticas.'}

Catálogo PPV disponible:
${JSON.stringify(params.vaultMenu || [], null, 2)}

Reglas de negocio:
1. Responde de forma muy natural, en primera persona, breve (1 a 3 oraciones).
2. Si detectas interés en fotos/videos/packs, menciona sutilmente uno del catálogo con precio.
3. Si la plataforma es WhatsApp o Telegram, menciona pago por PayPal, Wise, Crypto o transferencia.
4. Si la plataforma es Fansly o ManyVids, menciona que se desbloquea directamente en el chat.
5. Devuelve ÚNICAMENTE un JSON con:
{ "reply": "texto", "suggestedPpvId": "id o null", "intent": "INQUIRY|BUY_PPV|CASUAL|CUSTOM_REQUEST|FAQ", "isVoice": boolean }
6. Si crees que enviar un audio (nota de voz coqueta) sería mucho más persuasivo, o si el fan te pidió un audio, pon "isVoice": true.`;

  const historyText = params.messages
    .map((m) => `${m.sender}: ${m.text}`)
    .join('\n');

  let modelUsed = 'gemini-2.5-flash';

  try {
    let response: any;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: `Historial:\n${historyText}\n\nResponde al último mensaje.` }] }],
        config: { systemInstruction, responseMimeType: 'application/json', temperature: 0.85 },
      });
    } catch {
      // Fallback to stable model
      modelUsed = 'gemini-1.5-flash';
      response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: [{ role: 'user', parts: [{ text: `Historial:\n${historyText}\n\nResponde al último mensaje.` }] }],
        config: { systemInstruction, responseMimeType: 'application/json', temperature: 0.85 },
      });
    }

    const text = response.text?.trim() || '{}';
    let parsed: any = {};
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { reply: text.replace(/```json|```/g, '').trim(), isVoice: false };
    }

    const result: BotReplyResult = {
      reply: parsed.reply || buildFallbackReply(params),
      isVoice: Boolean(parsed.isVoice),
      suggestedPpvId: parsed.suggestedPpvId || null,
      intent: parsed.intent || 'INQUIRY',
    };

    addBotAuditLog({
      fanName: params.fanName || 'Fan',
      fanTier: params.fanTier || 'curioso',
      platform: params.platform || 'fansly',
      incomingText: lastUserMsg,
      botReply: result.reply,
      intent: result.intent,
      suggestedPpvId: result.suggestedPpvId,
      isVoice: result.isVoice,
      latencyMs: Date.now() - startTime,
      modelUsed: result.isVoice ? `${modelUsed} + TTS` : modelUsed,
      status: 'replied',
    });

    return result;
  } catch (err: any) {
    console.error('[BotEngine] Gemini error:', err.message);
    const fallbackReply = buildFallbackReply(params);
    addBotAuditLog({
      fanName: params.fanName || 'Fan',
      fanTier: params.fanTier || 'curioso',
      platform: params.platform || 'fansly',
      incomingText: lastUserMsg,
      botReply: fallbackReply,
      intent: 'ERROR_FALLBACK',
      suggestedPpvId: null,
      isVoice: false,
      latencyMs: Date.now() - startTime,
      modelUsed: 'fallback',
      status: 'error',
    });
    return { reply: fallbackReply, isVoice: false, suggestedPpvId: null };
  }
}

// ─── TTS Synthesis (direct function — no HTTP) ────────────────────────────────
export async function synthesizeTts(
  text: string,
  voiceId = 'demo0001',
  profileRefText?: string | null
): Promise<TtsResult> {
  // Normalize text for TTS
  const cleanText = text
    .replace(/\.\.\./g, ', ')
    .replace(/([!?])\s*([!?])+/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .replace(/[*_~`]/g, '')
    .trim()
    .substring(0, 500);

  const ttsBody: any = {
    model: 'tts-1',
    input: cleanText,
    voice: voiceId,
    response_format: 'mp3',
    num_step: 8,
    guidance_scale: 2.0,
    denoise: false,
  };
  if (profileRefText) ttsBody.ref_text = profileRefText;

  try {
    const response = await fetch(`${VS}/v1/audio/speech`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ttsBody),
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      throw new Error(`VoiceStudio HTTP ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    const fileName = `voice_note_${Date.now()}.mp3`;
    const filePath = path.join(audioDir, fileName);
    fs.writeFileSync(filePath, Buffer.from(buffer));

    return {
      success: true,
      audioPath: filePath,
      audioUrl: `/audio/${fileName}`,
      voiceUsed: voiceId,
    };
  } catch (primaryErr: any) {
    console.warn('[BotEngine/TTS] VoiceStudio unavailable, trying Google TTS fallback:', primaryErr.message);

    // Google TTS fallback
    try {
      const encoded = encodeURIComponent(cleanText);
      const fallbackUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=es&client=tw-ob`;
      const fbRes = await fetch(fallbackUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(10_000),
      });

      if (fbRes.ok) {
        const buffer = await fbRes.arrayBuffer();
        const fileName = `voice_note_${Date.now()}.mp3`;
        const filePath = path.join(audioDir, fileName);
        fs.writeFileSync(filePath, Buffer.from(buffer));
        return {
          success: true,
          audioPath: filePath,
          audioUrl: `/audio/${fileName}`,
          voiceUsed: 'google-tts-fallback',
        };
      }
    } catch (fbErr: any) {
      console.error('[BotEngine/TTS] Google fallback also failed:', fbErr.message);
    }

    return { success: false, audioPath: null, audioUrl: null, voiceUsed: voiceId };
  }
}

// ─── Internal fallback reply (no AI needed) ───────────────────────────────────
function buildFallbackReply(params: BotReplyParams): string {
  const lastMsg = (params.messages[params.messages.length - 1]?.text || '').toLowerCase();
  const fanName = params.fanName || 'amor';

  for (const rule of params.rules || []) {
    if (!rule.enabled) continue;
    const matched = rule.triggers?.some((t) => lastMsg.includes(t.toLowerCase()));
    if (matched) {
      if (rule.actionType === 'send_ppv' && rule.targetPpvId) {
        const item = params.vaultMenu?.find((v) => v.id === rule.targetPpvId);
        if (item) return `${rule.replyContent} "${item.title}" por $${item.price} USD. ¿Te lo libero ya mismo? 🔥`;
      }
      return rule.replyContent;
    }
  }

  if (lastMsg.includes('precio') || lastMsg.includes('cuanto') || lastMsg.includes('menu')) {
    const item = params.vaultMenu?.[0];
    return item
      ? `Hola corazón ❤️ Justo tengo disponible el "${item.title}" por solo $${item.price} USD. ¿Te lo envío ya mismo? 🔥`
      : `Hola ${fanName} 💕 Tengo contenido exclusivo esperándote. ¿Quieres ver el menú? ✨`;
  }

  return `¡Hola ${fanName} cariño! 🔥 Qué rico que me escribas. ¿Tienes ganas de portarte mal conmigo hoy? 💋`;
}
