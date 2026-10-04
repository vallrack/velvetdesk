import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '10mb' }));

  // Shared Gemini client
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

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', hasGeminiKey: Boolean(apiKey) });
  });

  // API Route: Generate Bot Reply
  app.post('/api/gemini/generate-bot-reply', async (req, res) => {
    try {
      const {
        fanName,
        platform,
        fanTier,
        persona,
        customPrompt,
        rules,
        messages,
        vaultMenu,
        intentDetected,
      } = req.body;

      if (!ai) {
        // Fallback intelligent simulated reply matching persona
        const fallback = generateFallbackReply({
          fanName,
          platform,
          persona,
          lastMessage: messages?.[messages.length - 1]?.text || '',
          intentDetected,
          vaultMenu,
        });
        return res.json({ reply: fallback.text, suggestedPpvId: fallback.suggestedPpvId, confidence: 0.92 });
      }

      const systemInstruction = `
Eres la creadora de contenido en una conversación directa con un fan en ${platform || 'Fansly'}.
Nombre del fan: ${fanName || 'Fan'} (Nivel: ${fanTier || 'Curioso'}).
Tu tono/personalidad configurada: ${persona?.tone || 'Coqueta, pícara y dulce, usando emojis sugestivos'}.
Reglas activadas:
${JSON.stringify(rules || [], null, 2)}
Instrucciones personalizadas de la creadora:
${customPrompt || 'Mantén respuestas directas, sensuales, no robóticas. Si preguntan precios o contenido, ofréceles los PPV disponibles.'}

Catálogo PPV disponible para ofrecer (con precios en USD):
${JSON.stringify(vaultMenu || [], null, 2)}

Reglas de negocio:
1. Responde de forma muy natural, en primera persona, breve (1 a 3 oraciones como en un chat real de mensajería).
2. Si detectas interés en fotos, videos exclusivos o paquetes, menciona sutilmente uno de los contenidos del catálogo y su precio.
3. Si la plataforma es WhatsApp o Telegram, menciona que pueden pagar con PayPal, Wise, Crypto o transferencia.
4. Si la plataforma es Fansly o ManyVids, menciona que se desbloquea directamente en el chat.
5. Devuelve ÚNICAMENTE un JSON con:
{
  "reply": "texto de respuesta como creadora",
  "suggestedPpvId": "id del PPV si aplica o null",
  "intent": "INQUIRY | BUY_PPV | CASUAL | CUSTOM_REQUEST | FAQ"
}
`;

      const contents = messages?.slice(-8).map((m: any) => ({
        role: m.sender === 'fan' ? 'user' : 'model',
        parts: [{ text: m.text || '' }],
      })) || [{ role: 'user', parts: [{ text: 'Hola hermosa, qué tienes disponible hoy?' }] }];

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          { role: 'user', parts: [{ text: `Historial de chat reciente:\n${messages?.map((m: any) => `${m.sender}: ${m.text}`).join('\n')}\n\nResponde al último mensaje.` }] },
        ],
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          temperature: 0.85,
        },
      });

      const responseText = response.text?.trim() || '{}';
      let parsed = {};
      try {
        parsed = JSON.parse(responseText);
      } catch {
        parsed = { reply: responseText.replace(/```json|```/g, '').trim() };
      }

      return res.json(parsed);
    } catch (err: any) {
      console.error('Error in /api/gemini/generate-bot-reply:', err);
      return res.status(500).json({
        error: 'Failed to generate bot reply',
        message: err.message,
      });
    }
  });

  // API Route: Intent & Lead Analysis
  app.post('/api/gemini/analyze-intent', async (req, res) => {
    try {
      const { text, fanHistory } = req.body;
      if (!ai) {
        return res.json({
          intent: 'BUY_PPV',
          intentScore: 0.88,
          sentiment: 'Interested',
          suggestedAction: 'Offer VIP video preview',
        });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Analiza el siguiente mensaje de un fan: "${text}".
Historial de gasto del fan: $${fanHistory?.totalSpent || 0}. Compras previas: ${fanHistory?.purchasedItems?.join(', ') || 'ninguna'}.
Devuelve un JSON con:
{
  "intent": "BUY_PPV" | "CUSTOM_REQUEST" | "PRICE_INQUIRY" | "CASUAL_CHAT" | "FREE_RIDER",
  "intentScore": number entre 0 y 1,
  "sentiment": "Caliente/Listo para comprar" | "Preguntón" | "Tacaño" | "Fan Leal",
  "suggestedAction": "texto con acción recomendada para cerrar venta"
}`,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const parsed = JSON.parse(response.text?.trim() || '{}');
      return res.json(parsed);
    } catch (err: any) {
      console.error('Error analyzing intent:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  // Vite development middleware or static serving
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[VelvetDesk] Server running on http://0.0.0.0:${PORT}`);
  });
}

function generateFallbackReply(params: any) {
  const { fanName, lastMessage, vaultMenu } = params;
  const msgLower = (lastMessage || '').toLowerCase();

  if (msgLower.includes('precio') || msgLower.includes('cuanto') || msgLower.includes('costo') || msgLower.includes('menu')) {
    const item = vaultMenu?.[0] || { title: 'Set VIP Completo', price: 25 };
    return {
      text: `Hola corazón ❤️ Justo tengo disponible el "${item.title}" por solo $${item.price} USD. ¿Te lo envío ya mismo para que lo disfrutes? 🔥`,
      suggestedPpvId: item.id || 'ppv-1',
    };
  }

  if (msgLower.includes('video') || msgLower.includes('foto') || msgLower.includes('pack')) {
    const item = vaultMenu?.[1] || { title: 'Video Exclusivo 4K (12 min)', price: 35 };
    return {
      text: `Uff amor, acabo de grabar uno súper íntimo hoy... "${item.title}" por $${item.price} USD. Te va a encantar, ¿quieres desbloquearlo ahora? 💋`,
      suggestedPpvId: item.id || 'ppv-2',
    };
  }

  if (msgLower.includes('custom') || msgLower.includes('personalizado') || msgLower.includes('audio')) {
    return {
      text: `¡Claro que sí, cielo! Hago audios y videos personalizados con tu nombre y lo que me pidas desde $40 USD. Cuéntame tu fantasía... 😏✨`,
      suggestedPpvId: 'ppv-custom',
    };
  }

  return {
    text: `Hola ${fanName || 'amor'} 💕 Qué rico que me escribas hoy. ¿Cómo va tu día? ¿Te gustaría ver lo que preparé anoche para ti? ✨`,
    suggestedPpvId: null,
  };
}

startServer();
