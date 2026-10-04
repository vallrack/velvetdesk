import { BotPersona, BotRule, Message, VaultItem, FanProfile } from '../types';

export interface GenerateBotReplyParams {
  fanName: string;
  fanTier: string;
  platform: string;
  persona: BotPersona;
  rules: BotRule[];
  messages: Message[];
  vaultMenu: VaultItem[];
  intentDetected?: string;
}

export async function requestBotReply(params: GenerateBotReplyParams): Promise<{
  reply: string;
  suggestedPpvId: string | null;
  intent?: string;
}> {
  try {
    const res = await fetch('/api/gemini/generate-bot-reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

    const data = await res.json();
    return {
      reply: data.reply || getLocalFallbackReply(params),
      suggestedPpvId: data.suggestedPpvId || null,
      intent: data.intent || 'INQUIRY',
    };
  } catch (err) {
    console.warn('Using client-side smart response engine:', err);
    return {
      reply: getLocalFallbackReply(params),
      suggestedPpvId: detectSuggestedPpv(params.messages, params.vaultMenu),
      intent: 'INQUIRY',
    };
  }
}

export async function requestIntentAnalysis(text: string, fan: FanProfile): Promise<{
  intent: string;
  intentScore: number;
  sentiment: string;
  suggestedAction: string;
}> {
  try {
    const res = await fetch('/api/gemini/analyze-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        fanHistory: {
          totalSpent: fan.totalSpent,
          purchasedItems: fan.purchasedItems.map((p) => p.itemTitle),
        },
      }),
    });

    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    // fallback
  }

  const textLower = text.toLowerCase();
  if (textLower.includes('precio') || textLower.includes('cuanto') || textLower.includes('costo') || textLower.includes('menu')) {
    return {
      intent: 'PRICE_INQUIRY',
      intentScore: 0.94,
      sentiment: 'Listo para comprar',
      suggestedAction: 'Ofrecer Set Lencería ($25) o Video Privado Ducha ($45)',
    };
  }
  if (textLower.includes('video') || textLower.includes('pack') || textLower.includes('foto')) {
    return {
      intent: 'BUY_PPV',
      intentScore: 0.91,
      sentiment: 'Deseo activo',
      suggestedAction: 'Enviar teaser con botón de pago PPV',
    };
  }
  if (textLower.includes('gratis') || textLower.includes('prueba')) {
    return {
      intent: 'FREE_RIDER',
      intentScore: 0.89,
      sentiment: 'Tacaño / Curioso sin fondos',
      suggestedAction: 'Mantener postura firme y redirigir a teaser público',
    };
  }

  return {
    intent: 'CASUAL_CHAT',
    intentScore: 0.75,
    sentiment: 'Interesado',
    suggestedAction: 'Construir confianza y sugerir nuevo set exclusivo',
  };
}

function getLocalFallbackReply(params: GenerateBotReplyParams): string {
  const lastMsg = params.messages[params.messages.length - 1]?.text?.toLowerCase() || '';
  const fanName = params.fanName || 'amor';

  // Check matching rules
  for (const rule of params.rules) {
    if (rule.enabled) {
      const matched = rule.triggers.some((trig) => lastMsg.includes(trig.toLowerCase()));
      if (matched) {
        if (rule.actionType === 'send_ppv' && rule.targetPpvId) {
          const item = params.vaultMenu.find((v) => v.id === rule.targetPpvId);
          if (item) {
            return `${rule.replyContent} "${item.title}" por $${item.price} USD. ¿Te lo libero ya mismo? 🔥`;
          }
        }
        return rule.replyContent;
      }
    }
  }

  if (params.persona.tone === 'dominante') {
    return `Hola ${fanName}. Veo que estás ansioso por recibir atención. Si quieres ver de lo que soy capaz hoy, primero demuéstrame tu devoción con el contenido exclusivo... 🖤`;
  }
  if (params.persona.tone === 'dulce') {
    return `¡Hola ${fanName} corazón! 🥰 Qué alegría leerte. Estaba pensando en consentirte hoy con algo muy tierno y sensual. ¿Cómo ha estado tu día? ✨`;
  }
  if (params.persona.tone === 'sofisticada') {
    return `Buenas tardes ${fanName}. Preparé una sesión muy distinguida y sugerente que sé que un hombre de buen gusto sabrá apreciar. ¿Deseas ver los detalles? 🥂`;
  }

  // Default coqueta
  return `¡Hola ${fanName} cariño! 🔥 Qué rico que me escribas justo ahora. ¿Tienes ganas de portarte mal conmigo hoy o qué estabas buscando? 💋`;
}

function detectSuggestedPpv(messages: Message[], vaultMenu: VaultItem[]): string | null {
  const lastMsg = messages[messages.length - 1]?.text?.toLowerCase() || '';
  if (lastMsg.includes('ducha') || lastMsg.includes('video') || lastMsg.includes('largo')) {
    return vaultMenu.find((v) => v.type === 'video')?.id || null;
  }
  if (lastMsg.includes('foto') || lastMsg.includes('pack') || lastMsg.includes('lencer')) {
    return vaultMenu.find((v) => v.type === 'photo')?.id || null;
  }
  if (lastMsg.includes('audio') || lastMsg.includes('voz') || lastMsg.includes('gem')) {
    return vaultMenu.find((v) => v.type === 'audio')?.id || null;
  }
  return vaultMenu[0]?.id || null;
}
