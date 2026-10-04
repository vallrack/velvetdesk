import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  UserCheck,
  Send,
  Paperclip,
  Mic,
  CreditCard,
  Clock,
  Sparkles,
  Lock,
  Unlock,
  Eye,
  CheckCheck,
  Check,
  AlertCircle,
  Play,
  RotateCcw,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { ChatThread, Message, FanProfile, VaultItem, BotPersona, BotRule, PaymentGatewayConfig } from '../../types';
import { PlatformBadge } from '../common/PlatformBadge';
import { FanTierBadge } from '../common/FanTierBadge';
import { VoiceNotePlayer } from '../common/VoiceNotePlayer';
import { requestBotReply } from '../../services/geminiService';

interface ChatConversationProps {
  chat: ChatThread;
  messages: Message[];
  fanProfile?: FanProfile;
  vaultItems: VaultItem[];
  persona: BotPersona;
  rules: BotRule[];
  gateways: PaymentGatewayConfig[];
  onSendMessage: (text: string, media?: any) => void;
  onToggleAttendedBy: (newMode: 'bot' | 'creator') => void;
  onOpenVaultModal: () => void;
  onOpenPaymentModal: () => void;
  onOpenScheduleModal: () => void;
  onToggleFanDrawer: () => void;
  onUnlockPpv: (messageId: string, itemTitle: string, price: number) => void;
  onConfirmPaymentAndRelease: (messageId: string, amount: number) => void;
}

export const ChatConversation: React.FC<ChatConversationProps> = ({
  chat,
  messages,
  fanProfile,
  vaultItems,
  persona,
  rules,
  gateways,
  onSendMessage,
  onToggleAttendedBy,
  onOpenVaultModal,
  onOpenPaymentModal,
  onOpenScheduleModal,
  onToggleFanDrawer,
  onUnlockPpv,
  onConfirmPaymentAndRelease,
}) => {
  const [inputText, setInputText] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [viewOnceOpened, setViewOnceOpened] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    // Send creator message
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleSuggestAiReply = async () => {
    setIsGeneratingAi(true);
    try {
      const res = await requestBotReply({
        fanName: chat.fanName,
        fanTier: chat.fanTier,
        platform: chat.platform,
        persona,
        rules,
        messages,
        vaultMenu: vaultItems,
      });

      if (res.reply) {
        setInputText(res.reply);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleSendVoiceNote = () => {
    onSendMessage('🎙️ Nota de voz de Velvet (00:45)', {
      type: 'audio',
      url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80',
      isVoiceNote: true,
      duration: '00:45',
      title: 'Nota de voz íntima',
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden relative">
      {/* Top Header */}
      <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div
            onClick={onToggleFanDrawer}
            className="relative cursor-pointer group flex items-center gap-3"
            title="Ver perfil CRM"
          >
            <div className="relative">
              <img
                src={chat.fanAvatar}
                alt={chat.fanName}
                className="w-10 h-10 rounded-full object-cover border border-slate-700 group-hover:border-pink-500 transition-colors"
              />
              <span
                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 ${
                  chat.isOnline ? 'bg-emerald-500' : 'bg-slate-500'
                }`}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white text-sm group-hover:text-pink-400 transition-colors">
                  {chat.fanName}
                </h3>
                <PlatformBadge platform={chat.platform} size="sm" />
                <FanTierBadge tier={chat.fanTier} size="sm" />
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                {chat.fanHandle} • <span className="text-emerald-400 font-semibold">${chat.totalSpent} LTV</span>
              </p>
            </div>
          </div>
        </div>

        {/* State of Attention Toggle (RF1.4) */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-950 border border-slate-800 p-1 rounded-xl flex items-center gap-1">
            <button
              onClick={() => onToggleAttendedBy('bot')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                chat.attendedBy === 'bot'
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Atendido por Bot</span>
              {chat.attendedBy === 'bot' && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
              )}
            </button>

            <button
              onClick={() => onToggleAttendedBy('creator')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                chat.attendedBy === 'creator'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Atendido por Creadora</span>
            </button>
          </div>

          <button
            onClick={onToggleFanDrawer}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs border border-slate-700/60 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>CRM</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Auto-pause Warning Banner if creator intervened (RF1.4) */}
      {chat.attendedBy === 'creator' && chat.botPausedReason && (
        <div className="px-5 py-2 bg-purple-950/40 border-b border-purple-500/30 flex items-center justify-between text-xs text-purple-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-purple-400 shrink-0" />
            <span>
              <strong>Modo Manual Activo:</strong> {chat.botPausedReason}. El bot no responderá en este chat para evitar colisiones.
            </span>
          </div>
          <button
            onClick={() => onToggleAttendedBy('bot')}
            className="px-2.5 py-1 rounded bg-purple-600/60 hover:bg-purple-600 text-white font-medium flex items-center gap-1 text-[11px] cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3 h-3" /> Reactivar Bot
          </button>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <div className="text-center my-2">
          <span className="text-[10px] uppercase font-mono px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-500">
            Canal Centralizado • {chat.platform.toUpperCase()}
          </span>
        </div>

        {messages.map((m) => {
          const isFan = m.sender === 'fan';
          const isBot = m.sender === 'bot';
          const isCreator = m.sender === 'creator';

          return (
            <div
              key={m.id}
              className={`flex flex-col ${isFan ? 'items-start' : 'items-end'}`}
            >
              {/* Sender label */}
              <div className="flex items-center gap-1.5 mb-1 px-1">
                <span className="text-[10px] text-slate-400">
                  {isFan ? chat.fanName : isBot ? '🤖 VelvetBot (Automático)' : '👩‍🎤 Velvet (Creadora)'}
                </span>
                <span className="text-[10px] text-slate-600">• {m.timestamp}</span>
              </div>

              {/* Message Bubble Container */}
              <div
                className={`max-w-md sm:max-w-lg rounded-2xl p-3.5 text-sm shadow-md transition-all ${
                  isFan
                    ? 'bg-slate-900 border border-slate-800 text-slate-100 rounded-tl-sm'
                    : isBot
                    ? 'bg-gradient-to-br from-pink-950/80 to-purple-950/80 border border-pink-500/30 text-pink-50 rounded-tr-sm'
                    : 'bg-gradient-to-br from-purple-900/90 to-slate-900 border border-purple-500/40 text-purple-50 rounded-tr-sm'
                }`}
              >
                {/* Text Content */}
                {m.text && <p className="whitespace-pre-line leading-relaxed">{m.text}</p>}

                {/* WhatsApp Voice Note Media (RF3.4) */}
                {m.media?.isVoiceNote && (
                  <div className="mt-2">
                    <VoiceNotePlayer
                      duration={m.media.duration || '00:45'}
                      isWhatsApp={chat.platform === 'whatsapp'}
                    />
                  </div>
                )}

                {/* WhatsApp Ephemeral View Once (RF3.4) */}
                {m.media?.isViewOnce && (
                  <div className="mt-2.5 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                        <Eye className="w-4 h-4" />
                        <span>Foto Efímera (Ver una sola vez)</span>
                      </div>
                      <button
                        onClick={() =>
                          setViewOnceOpened((prev) => ({ ...prev, [m.id]: !prev[m.id] }))
                        }
                        className="text-xs px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold cursor-pointer transition-colors"
                      >
                        {viewOnceOpened[m.id] ? 'Cerrar foto' : 'Abrir (1 vista)'}
                      </button>
                    </div>

                    {viewOnceOpened[m.id] && (
                      <div className="mt-2 rounded-lg overflow-hidden border border-emerald-500/40">
                        <img
                          src={m.media.url}
                          alt="Foto efímera"
                          className="w-full max-h-60 object-cover"
                        />
                        <p className="text-[10px] text-center text-emerald-300 py-1 bg-emerald-950/80">
                          🔒 Contenido efímero visualizado en modo seguro
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Locked PPV Content (RF2.2, RF4.2, RF4.3) */}
                {m.media?.isPpv && !m.media.isViewOnce && (
                  <div className="mt-3 rounded-xl overflow-hidden border border-pink-500/30 bg-slate-950/80">
                    <div className="relative h-44 w-full">
                      <img
                        src={m.media.url}
                        alt="PPV teaser"
                        className={`w-full h-full object-cover transition-all ${
                          m.media.isUnlocked ? '' : 'blur-md brightness-50'
                        }`}
                      />
                      {!m.media.isUnlocked && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                          <div className="w-12 h-12 rounded-full bg-pink-600/90 flex items-center justify-center text-white mb-2 shadow-lg shadow-pink-600/50">
                            <Lock className="w-6 h-6" />
                          </div>
                          <span className="font-bold text-white text-sm">
                            {m.media.title || 'Contenido Exclusivo Bloqueado'}
                          </span>
                          <span className="text-xs text-pink-300 font-mono mt-1 font-bold bg-black/60 px-2 py-0.5 rounded-full">
                            ${m.media.ppvPrice || 45} USD
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="p-3 bg-slate-900 flex items-center justify-between">
                      <div className="text-xs">
                        <p className="font-semibold text-white">{m.media.title || 'PPV Exclusivo'}</p>
                        <p className="text-[10px] text-slate-400">
                          {chat.platform === 'fansly' || chat.platform === 'manyvids'
                            ? `Cobro nativo con billetera ${chat.platform.toUpperCase()}`
                            : 'Pago vía Crypto USDT, Wise o PayPal'}
                        </p>
                      </div>

                      {m.media.isUnlocked ? (
                        <span className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1">
                          <Unlock className="w-3.5 h-3.5" /> Desbloqueado
                        </span>
                      ) : (
                        <button
                          onClick={() =>
                            onUnlockPpv(m.id, m.media?.title || 'Set Exclusivo', m.media?.ppvPrice || 45)
                          }
                          className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-pink-600/30"
                        >
                          <Unlock className="w-3.5 h-3.5" />
                          Desbloquear (${m.media.ppvPrice || 45})
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* External Payment Verification Details (RF4.1, RF4.2) */}
                {m.paymentDetails && (
                  <div className="mt-3 p-3 rounded-xl bg-slate-950 border border-emerald-500/30">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <CreditCard className="w-3.5 h-3.5" />
                        Comprobante de Pago {m.paymentDetails.method.toUpperCase()}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                          m.paymentDetails.status === 'confirmed'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-amber-500/20 text-amber-300 animate-pulse'
                        }`}
                      >
                        {m.paymentDetails.status === 'confirmed' ? 'CONFIRMADO' : 'PENDIENTE VERIFICACIÓN'}
                      </span>
                    </div>

                    <div className="text-xs space-y-1 text-slate-300 font-mono">
                      <p>Monto: ${m.paymentDetails.amount} {m.paymentDetails.currency}</p>
                      {m.paymentDetails.txId && <p className="text-[10px] text-slate-400 truncate">Tx: {m.paymentDetails.txId}</p>}
                    </div>

                    {m.paymentDetails.status !== 'confirmed' && (
                      <button
                        onClick={() =>
                          onConfirmPaymentAndRelease(m.id, m.paymentDetails?.amount || 45)
                        }
                        className="mt-2.5 w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Confirmar Pago y Liberar Contenido (RF4.2)
                      </button>
                    )}
                  </div>
                )}

                {/* Status Indicator */}
                <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400">
                  {m.status === 'read' ? (
                    <CheckCheck className="w-3.5 h-3.5 text-cyan-400" />
                  ) : m.status === 'delivered' ? (
                    <CheckCheck className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <Check className="w-3 h-3 text-slate-500" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion pill if available */}
      {isGeneratingAi && (
        <div className="px-5 py-1.5 bg-pink-950/60 border-t border-pink-500/30 flex items-center gap-2 text-xs text-pink-300">
          <Sparkles className="w-3.5 h-3.5 animate-spin" />
          <span>Gemini IA está redactando la respuesta óptima con personalidad de Velvet...</span>
        </div>
      )}

      {/* Chat Action Toolbar & Input Area */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/90 backdrop-blur-md">
        {/* Quick action bar */}
        <div className="flex items-center gap-2 mb-2.5 overflow-x-auto pb-1 text-xs">
          <button
            type="button"
            onClick={onOpenVaultModal}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-pink-300 hover:text-white flex items-center gap-1.5 border border-slate-700/60 transition-colors cursor-pointer shrink-0"
          >
            <Paperclip className="w-3.5 h-3.5 text-pink-400" />
            <span>Bóveda (Vault)</span>
          </button>

          <button
            type="button"
            onClick={handleSendVoiceNote}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 hover:text-white flex items-center gap-1.5 border border-slate-700/60 transition-colors cursor-pointer shrink-0"
            title="Enviar nota de voz estilo WhatsApp"
          >
            <Mic className="w-3.5 h-3.5 text-emerald-400" />
            <span>Nota de Voz</span>
          </button>

          <button
            type="button"
            onClick={onOpenPaymentModal}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 hover:text-white flex items-center gap-1.5 border border-slate-700/60 transition-colors cursor-pointer shrink-0"
          >
            <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
            <span>Link de Pago</span>
          </button>

          <button
            type="button"
            onClick={onOpenScheduleModal}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 hover:text-white flex items-center gap-1.5 border border-slate-700/60 transition-colors cursor-pointer shrink-0"
          >
            <Clock className="w-3.5 h-3.5 text-purple-400" />
            <span>Programar Envío</span>
          </button>

          <button
            type="button"
            disabled={isGeneratingAi}
            onClick={handleSuggestAiReply}
            className="px-2.5 py-1.5 rounded-lg bg-pink-900/30 hover:bg-pink-900/50 text-pink-300 border border-pink-500/40 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ml-auto"
            title="Sugerir respuesta con Gemini"
          >
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            <span>Sugerencia IA</span>
          </button>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Responder como Creadora a ${chat.fanName} (Pausará el bot automáticamente)...`}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500/70"
          />

          <button
            type="submit"
            disabled={!inputText.trim()}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium flex items-center gap-2 shadow-lg shadow-pink-600/25 cursor-pointer transition-all"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Enviar</span>
          </button>
        </form>
      </div>
    </div>
  );
};
