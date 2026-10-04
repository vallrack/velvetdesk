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
  ArrowLeft,
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
  onBackToList?: () => void;
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
  onBackToList,
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
      <div className="px-3 sm:px-5 py-3 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md flex items-center justify-between z-10 gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Back button for mobile */}
          {onBackToList && (
            <button
              onClick={onBackToList}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 shrink-0"
              title="Volver a la lista de chats"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div
            onClick={onToggleFanDrawer}
            className="relative cursor-pointer group flex items-center gap-2 sm:gap-3 min-w-0"
            title="Ver perfil CRM"
          >
            <div className="relative shrink-0">
              <img
                src={chat.fanAvatar}
                alt={chat.fanName}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border border-slate-700 group-hover:border-pink-500 transition-colors"
              />
              <span
                className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${
                  chat.isOnline ? 'bg-emerald-500' : 'bg-slate-500'
                }`}
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 truncate">
                <h3 className="font-semibold text-white text-xs sm:text-sm group-hover:text-pink-400 transition-colors truncate">
                  {chat.fanName}
                </h3>
                <PlatformBadge platform={chat.platform} size="sm" showLabel={false} />
              </div>
              <p className="text-[10px] sm:text-xs text-slate-400 flex items-center gap-1 font-mono truncate">
                <span className="truncate">{chat.fanHandle}</span> • <span className="text-emerald-400 font-semibold shrink-0">${chat.totalSpent}</span>
              </p>
            </div>
          </div>
        </div>

        {/* State of Attention Toggle (RF1.4) */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <div className="bg-slate-950 border border-slate-800 p-0.5 sm:p-1 rounded-xl flex items-center gap-0.5 sm:gap-1">
            <button
              onClick={() => onToggleAttendedBy('bot')}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-medium flex items-center gap-1 transition-all cursor-pointer ${
                chat.attendedBy === 'bot'
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Bot className="w-3 sm:w-3.5 h-3 sm:h-3.5 shrink-0" />
              <span className="hidden sm:inline">Bot</span>
              {chat.attendedBy === 'bot' && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
              )}
            </button>

            <button
              onClick={() => onToggleAttendedBy('creator')}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-medium flex items-center gap-1 transition-all cursor-pointer ${
                chat.attendedBy === 'creator'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserCheck className="w-3 sm:w-3.5 h-3 sm:h-3.5 shrink-0" />
              <span className="hidden sm:inline">Creadora</span>
            </button>
          </div>

          <button
            onClick={onToggleFanDrawer}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs border border-slate-700/60 flex items-center gap-1 cursor-pointer transition-colors shrink-0"
          >
            <span className="text-[11px] sm:text-xs font-medium">CRM</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Auto-pause Warning Banner if creator intervened (RF1.4) */}
      {chat.attendedBy === 'creator' && chat.botPausedReason && (
        <div className="px-3 sm:px-5 py-2 bg-purple-950/40 border-b border-purple-500/30 flex items-center justify-between text-xs text-purple-200 gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 truncate">
            <AlertCircle className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span className="text-[11px] truncate">
              <strong>Manual:</strong> Bot pausado para evitar colisiones.
            </span>
          </div>
          <button
            onClick={() => onToggleAttendedBy('bot')}
            className="px-2 py-0.5 rounded bg-purple-600/60 hover:bg-purple-600 text-white font-medium flex items-center gap-1 text-[10px] cursor-pointer transition-colors shrink-0"
          >
            <RotateCcw className="w-2.5 h-2.5" /> Reactivar
          </button>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 sm:space-y-4">
        <div className="text-center my-1 sm:my-2">
          <span className="text-[9px] sm:text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-500">
            {chat.platform.toUpperCase()} Centralizado
          </span>
        </div>

        {messages.map((m) => {
          const isFan = m.sender === 'fan';
          const isBot = m.sender === 'bot';

          return (
            <div
              key={m.id}
              className={`flex flex-col ${isFan ? 'items-start' : 'items-end'}`}
            >
              {/* Sender label */}
              <div className="flex items-center gap-1.5 mb-1 px-1">
                <span className="text-[10px] text-slate-400">
                  {isFan ? chat.fanName : isBot ? '🤖 VelvetBot' : '👩‍🎤 Creadora'}
                </span>
                <span className="text-[10px] text-slate-600">• {m.timestamp}</span>
              </div>

              {/* Message Bubble Container */}
              <div
                className={`max-w-[88%] sm:max-w-md rounded-2xl p-3 text-xs sm:text-sm shadow-md transition-all ${
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
                  <div className="mt-2 p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
                        <Eye className="w-3.5 h-3.5" />
                        <span>Foto Efímera</span>
                      </div>
                      <button
                        onClick={() =>
                          setViewOnceOpened((prev) => ({ ...prev, [m.id]: !prev[m.id] }))
                        }
                        className="text-[11px] px-2 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold cursor-pointer transition-colors"
                      >
                        {viewOnceOpened[m.id] ? 'Cerrar' : 'Ver (1 sola vez)'}
                      </button>
                    </div>

                    {viewOnceOpened[m.id] && (
                      <div className="mt-2 rounded-lg overflow-hidden border border-emerald-500/40">
                        <img
                          src={m.media.url}
                          alt="Foto efímera"
                          className="w-full max-h-52 object-cover"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Locked PPV Content (RF2.2, RF4.2, RF4.3) */}
                {m.media?.isPpv && !m.media.isViewOnce && (
                  <div className="mt-2.5 rounded-xl overflow-hidden border border-pink-500/30 bg-slate-950/80">
                    <div className="relative h-36 sm:h-44 w-full">
                      <img
                        src={m.media.url}
                        alt="PPV teaser"
                        className={`w-full h-full object-cover transition-all ${
                          m.media.isUnlocked ? '' : 'blur-md brightness-50'
                        }`}
                      />
                      {!m.media.isUnlocked && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center">
                          <div className="w-10 h-10 rounded-full bg-pink-600/90 flex items-center justify-center text-white mb-1.5 shadow-lg shadow-pink-600/50">
                            <Lock className="w-5 h-5" />
                          </div>
                          <span className="font-bold text-white text-xs truncate max-w-full">
                            {m.media.title || 'PPV Bloqueado'}
                          </span>
                          <span className="text-[11px] text-pink-300 font-mono mt-1 font-bold bg-black/60 px-2 py-0.5 rounded-full">
                            ${m.media.ppvPrice || 45} USD
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="p-2.5 sm:p-3 bg-slate-900 flex items-center justify-between gap-2">
                      <div className="text-xs truncate min-w-0">
                        <p className="font-semibold text-white truncate">{m.media.title || 'PPV Exclusivo'}</p>
                      </div>

                      {m.media.isUnlocked ? (
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold flex items-center gap-1 shrink-0">
                          <Unlock className="w-3 h-3" /> Desbloqueado
                        </span>
                      ) : (
                        <button
                          onClick={() =>
                            onUnlockPpv(m.id, m.media?.title || 'Set Exclusivo', m.media?.ppvPrice || 45)
                          }
                          className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer shrink-0 shadow-sm"
                        >
                          <Unlock className="w-3 h-3" />
                          Desbloquear (${m.media.ppvPrice || 45})
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* External Payment Verification Details (RF4.1, RF4.2) */}
                {m.paymentDetails && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-slate-950 border border-emerald-500/30">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-emerald-400 font-semibold flex items-center gap-1 text-[11px]">
                        <CreditCard className="w-3 h-3" />
                        Pago {m.paymentDetails.method.toUpperCase()}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                          m.paymentDetails.status === 'confirmed'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-amber-500/20 text-amber-300 animate-pulse'
                        }`}
                      >
                        {m.paymentDetails.status === 'confirmed' ? 'CONFIRMADO' : 'PENDIENTE'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-300 font-mono">
                      <p>Monto: ${m.paymentDetails.amount} {m.paymentDetails.currency}</p>
                    </div>

                    {m.paymentDetails.status !== 'confirmed' && (
                      <button
                        onClick={() =>
                          onConfirmPaymentAndRelease(m.id, m.paymentDetails?.amount || 45)
                        }
                        className="mt-2 w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-sm"
                      >
                        <ShieldCheck className="w-3 h-3" />
                        Confirmar y Liberar Contenido (RF4.2)
                      </button>
                    )}
                  </div>
                )}

                {/* Status Indicator */}
                <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-slate-400">
                  {m.status === 'read' ? (
                    <CheckCheck className="w-3 h-3 text-cyan-400" />
                  ) : (
                    <Check className="w-2.5 h-2.5 text-slate-500" />
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
        <div className="px-3 sm:px-5 py-1 bg-pink-950/60 border-t border-pink-500/30 flex items-center gap-1.5 text-xs text-pink-300">
          <Sparkles className="w-3 h-3 animate-spin shrink-0" />
          <span className="truncate">Redactando respuesta sugerida con Gemini...</span>
        </div>
      )}

      {/* Chat Action Toolbar & Input Area */}
      <div className="p-2.5 sm:p-4 border-t border-slate-800 bg-slate-900/90 backdrop-blur-md">
        {/* Quick action bar */}
        <div className="flex items-center gap-1.5 sm:gap-2 mb-2 overflow-x-auto pb-1 text-xs scrollbar-none">
          <button
            type="button"
            onClick={onOpenVaultModal}
            className="px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-pink-300 hover:text-white flex items-center gap-1 border border-slate-700/60 transition-colors cursor-pointer shrink-0 text-[11px] sm:text-xs"
          >
            <Paperclip className="w-3 h-3 text-pink-400 shrink-0" />
            <span>Bóveda</span>
          </button>

          <button
            type="button"
            onClick={handleSendVoiceNote}
            className="px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 hover:text-white flex items-center gap-1 border border-slate-700/60 transition-colors cursor-pointer shrink-0 text-[11px] sm:text-xs"
          >
            <Mic className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>Voz</span>
          </button>

          <button
            type="button"
            onClick={onOpenPaymentModal}
            className="px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 hover:text-white flex items-center gap-1 border border-slate-700/60 transition-colors cursor-pointer shrink-0 text-[11px] sm:text-xs"
          >
            <CreditCard className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>Cobro</span>
          </button>

          <button
            type="button"
            onClick={onOpenScheduleModal}
            className="px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 hover:text-white flex items-center gap-1 border border-slate-700/60 transition-colors cursor-pointer shrink-0 text-[11px] sm:text-xs"
          >
            <Clock className="w-3 h-3 text-purple-400 shrink-0" />
            <span>Programar</span>
          </button>

          <button
            type="button"
            disabled={isGeneratingAi}
            onClick={handleSuggestAiReply}
            className="px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg bg-pink-900/30 hover:bg-pink-900/50 text-pink-300 border border-pink-500/40 flex items-center gap-1 transition-colors cursor-pointer shrink-0 ml-auto text-[11px] sm:text-xs"
          >
            <Sparkles className="w-3 h-3 text-pink-400 shrink-0" />
            <span className="hidden sm:inline">Sugerencia IA</span>
            <span className="sm:hidden">IA</span>
          </button>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSend} className="flex items-center gap-1.5 sm:gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Responder a ${chat.fanName}...`}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500/70"
          />

          <button
            type="submit"
            disabled={!inputText.trim()}
            className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium flex items-center gap-1.5 shadow-md shadow-pink-600/25 cursor-pointer transition-all"
          >
            <Send className="w-3.5 sm:w-4 h-3.5 sm:h-4 shrink-0" />
            <span className="hidden sm:inline text-xs sm:text-sm">Enviar</span>
          </button>
        </form>
      </div>
    </div>
  );
};
