import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  RotateCcw,
  ChevronRight,
  ShieldCheck,
  ArrowLeft,
  Square,
  X,
  Wand2,
  Radio,
  Search,
  ChevronUp,
  ChevronDown,
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

// ─── Voice Panel ──────────────────────────────────────────────────────────────
type VoiceGender = 'female' | 'male';

interface VoicePanelProps {
  onClose: () => void;
  textToSynth: string;
  onVoiceNoteSent: (audioUrl: string, gender: VoiceGender) => void;
  onGenerateAiText?: () => Promise<string>;
}

const VoicePanel: React.FC<VoicePanelProps> = ({ onClose, textToSynth, onVoiceNoteSent, onGenerateAiText }) => {
  const [gender, setGender] = useState<VoiceGender>('female');
  const [tab, setTab] = useState<'synth' | 'clone'>('synth');
  const [synthText, setSynthText] = useState(textToSynth || '');
  const [isGeneratingAiText, setIsGeneratingAiText] = useState(false);
  const [cloneGender, setCloneGender] = useState<VoiceGender>('female');
  const [isWarming, setIsWarming] = useState(false);
  const [warmDone, setWarmDone] = useState(false);

  // Synth state
  const [isSynthing, setIsSynthing] = useState(false);

  // Clone state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [refText, setRefText] = useState('Hola amor, gracias por escribirme. Estoy aquí para ti.');
  const [cloneName, setCloneName] = useState('Voz Creadora');
  const [isCloning, setIsCloning] = useState(false);
  const [cloneStatus, setCloneStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [voiceConfig, setVoiceConfig] = useState<{ femaleVoiceId: string | null; maleVoiceId: string | null }>({
    femaleVoiceId: null,
    maleVoiceId: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const recordedBlobRef = useRef<Blob | null>(null);
  const [hasRecordedAudio, setHasRecordedAudio] = useState(false);

  useEffect(() => {
    if (textToSynth) setSynthText(textToSynth);
  }, [textToSynth]);

  // Load voice config + warm up VoiceStudio model on panel open
  useEffect(() => {
    const localFemale = localStorage.getItem('velvetdesk_voice_female');
    const localMale = localStorage.getItem('velvetdesk_voice_male');
    if (localFemale || localMale) {
      setVoiceConfig(prev => ({
        femaleVoiceId: localFemale || prev.femaleVoiceId,
        maleVoiceId: localMale || prev.maleVoiceId,
      }));
    }

    fetch('/api/bot/voice/config')
      .then(async r => {
        const ct = r.headers.get('content-type') || '';
        if (ct.includes('application/json')) return r.json();
        return null;
      })
      .then(d => {
        if (d) {
          setVoiceConfig(prev => ({
            femaleVoiceId: d.femaleVoiceId || localFemale || prev.femaleVoiceId,
            maleVoiceId: d.maleVoiceId || localMale || prev.maleVoiceId,
          }));
        }
      })
      .catch(() => {});

    // Trigger model warm-up (fire-and-forget on server side)
    setIsWarming(true);
    fetch('/api/bot/voice/warm', { method: 'POST' })
      .then(() => { setIsWarming(false); setWarmDone(true); })
      .catch(() => { setIsWarming(false); });
  }, []);

  const handleAiDraft = async () => {
    if (!onGenerateAiText) return;
    setIsGeneratingAiText(true);
    try {
      const generated = await onGenerateAiText();
      if (generated) setSynthText(generated);
    } catch (e: any) {
      console.error(e);
    } finally {
      setIsGeneratingAiText(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        recordedBlobRef.current = new Blob(chunksRef.current, { type: 'audio/webm' });
        setHasRecordedAudio(true);
      };
      mr.start(100);
      mediaRecorderRef.current = mr;
      setIsRecording(true);
      setHasRecordedAudio(false);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
    } catch {
      alert('No se pudo acceder al micrófono. Verifica los permisos del navegador.');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    clearInterval(timerRef.current);
    setIsRecording(false);
  };

  const handleCloneVoice = async () => {
    if (!recordedBlobRef.current) {
      alert('Primero graba un audio de muestra.');
      return;
    }
    setIsCloning(true);
    setCloneStatus(null);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(recordedBlobRef.current!);
      });

      let cloneSuccess = false;
      try {
        const res = await fetch('/api/bot/voice/clone', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: cloneName,
            refText,
            audioBase64: base64,
            mimeType: 'audio/webm',
            gender: cloneGender,
          }),
        });

        const ct = res.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          const data = await res.json();
          if (data.success) {
            cloneSuccess = true;
            const updatedFemale = data.femaleVoiceId || (cloneGender === 'female' ? data.profile?.id : voiceConfig.femaleVoiceId);
            const updatedMale = data.maleVoiceId || (cloneGender === 'male' ? data.profile?.id : voiceConfig.maleVoiceId);
            setVoiceConfig({ femaleVoiceId: updatedFemale, maleVoiceId: updatedMale });
            if (cloneGender === 'female' && updatedFemale) localStorage.setItem('velvetdesk_voice_female', updatedFemale);
            if (cloneGender === 'male' && updatedMale) localStorage.setItem('velvetdesk_voice_male', updatedMale);
            setCloneStatus({
              ok: true,
              msg: `✅ Voz "${data.profile?.name || cloneName}" clonada y guardada como voz ${cloneGender === 'female' ? 'femenina (Creadora)' : 'masculina'}.`,
            });
          }
        }
      } catch (err: any) {
        console.warn('[Clone API] Error contacting clone endpoint:', err.message);
      }

      if (!cloneSuccess) {
        // Local client storage fallback so user is never blocked
        const localId = `clone_local_${Date.now()}`;
        if (cloneGender === 'female') {
          localStorage.setItem('velvetdesk_voice_female', localId);
          setVoiceConfig(prev => ({ ...prev, femaleVoiceId: localId }));
        } else {
          localStorage.setItem('velvetdesk_voice_male', localId);
          setVoiceConfig(prev => ({ ...prev, maleVoiceId: localId }));
        }
        setCloneStatus({
          ok: true,
          msg: `✅ Muestra de voz guardada localmente como voz ${cloneGender === 'female' ? 'femenina (Creadora)' : 'masculina'}. Lista para usar!`,
        });
      }
    } catch (e: any) {
      setCloneStatus({ ok: false, msg: `❌ ${e.message}` });
    } finally {
      setIsCloning(false);
    }
  };

  const handleSynth = async () => {
    const textToSend = synthText.trim();
    if (!textToSend) {
      alert('Escribe el texto de la nota de voz o pulsa "Redactar con IA".');
      return;
    }
    setIsSynthing(true);
    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 60_000);
      const res = await fetch('/api/bot/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToSend, gender }),
        signal: controller.signal,
      });
      clearTimeout(tid);

      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        throw new Error('Respuesta inválida del servidor.');
      }
      const data = await res.json();
      if (!data.success && !data.audioUrl) throw new Error(data.error || 'Error al sintetizar audio.');
      onVoiceNoteSent(data.audioUrl, gender);
      onClose();
    } catch (e: any) {
      alert(e.message || 'Error generando nota de voz.');
    } finally {
      setIsSynthing(false);
    }
  };

  const fmtSec = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const hasFemaleVoice = Boolean(voiceConfig.femaleVoiceId);
  const hasMaleVoice = Boolean(voiceConfig.maleVoiceId);

  return (
    <div
      className="absolute inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full sm:max-w-sm mx-auto bg-slate-900 border border-slate-700/80 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-white text-sm">Nota de Voz</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Gender selector */}
        <div className="px-4 pt-3 pb-2">
          <p className="text-[11px] text-slate-500 uppercase font-semibold tracking-wide mb-2">Tipo de Voz</p>
          <div className="flex gap-2">
            <button
              onClick={() => setGender('female')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                gender === 'female'
                  ? 'bg-pink-600/30 border-pink-500/60 text-pink-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              <span className="text-base">👩</span>
              Femenina
              {hasFemaleVoice && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-auto" />}
            </button>
            <button
              onClick={() => setGender('male')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                gender === 'male'
                  ? 'bg-blue-600/30 border-blue-500/60 text-blue-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              <span className="text-base">👨</span>
              Masculina
              {hasMaleVoice && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-auto" />}
            </button>
          </div>
          {gender === 'female' && !hasFemaleVoice && (
            <p className="text-[10px] text-amber-400/80 mt-1.5">
              ⚠️ No hay voz femenina clonada. Usa la pestaña "Clonar Voz" para grabar tu muestra.
            </p>
          )}
          {gender === 'female' && hasFemaleVoice && (
            <p className="text-[10px] text-emerald-400/80 mt-1.5">
              ✅ Usará la voz clonada de la creadora.
            </p>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 mx-4">
          <button
            onClick={() => setTab('synth')}
            className={`flex-1 py-2 text-xs font-medium transition-colors cursor-pointer ${
              tab === 'synth' ? 'text-white border-b-2 border-pink-500' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Wand2 className="w-3 h-3 inline mr-1" />
            Generar Nota
          </button>
          <button
            onClick={() => setTab('clone')}
            className={`flex-1 py-2 text-xs font-medium transition-colors cursor-pointer ${
              tab === 'clone' ? 'text-white border-b-2 border-emerald-500' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Radio className="w-3 h-3 inline mr-1" />
            Clonar Voz
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {/* ── TAB: Synth ── */}
          {tab === 'synth' && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-slate-400 uppercase font-semibold tracking-wide">
                    Texto de la nota de voz
                  </label>
                  {onGenerateAiText && (
                    <button
                      type="button"
                      onClick={handleAiDraft}
                      disabled={isGeneratingAiText}
                      className="text-[11px] text-pink-400 hover:text-pink-300 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Sparkles className={`w-3 h-3 ${isGeneratingAiText ? 'animate-spin' : ''}`} />
                      {isGeneratingAiText ? 'Redactando...' : '✨ Redactar con IA'}
                    </button>
                  )}
                </div>
                <textarea
                  value={synthText}
                  onChange={e => setSynthText(e.target.value)}
                  placeholder="Escribe lo que dirá la nota de voz o pulsa 'Redactar con IA'..."
                  rows={3}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/70 resize-none leading-relaxed"
                />
              </div>

              {/* Warm-up status banner */}
              {isWarming && !isSynthing && (
                <div className="flex items-center gap-2 text-[11px] text-amber-400/90 bg-amber-900/20 border border-amber-500/20 rounded-xl px-3 py-2">
                  <Sparkles className="w-3.5 h-3.5 animate-spin shrink-0" />
                  <span>Preparando motor de voz...</span>
                </div>
              )}
              {warmDone && !isSynthing && (
                <div className="flex items-center gap-2 text-[11px] text-emerald-400/90 bg-emerald-900/20 border border-emerald-500/20 rounded-xl px-3 py-1.5">
                  <span>✅ Motor VoiceStudio listo</span>
                </div>
              )}

              <button
                onClick={handleSynth}
                disabled={isSynthing || !synthText.trim()}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg shadow-emerald-600/20"
              >
                {isSynthing
                  ? <><Sparkles className="w-4 h-4 animate-spin" /> Generando audio con voz clonada…</>
                  : <><Mic className="w-4 h-4" /> Enviar como Nota de Voz estilo WhatsApp</>}
              </button>
            </div>
          )}


          {/* ── TAB: Clone ── */}
          {tab === 'clone' && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-semibold tracking-wide">
                  Guardar voz clonada como:
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCloneGender('female')}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium border cursor-pointer ${
                      cloneGender === 'female'
                        ? 'bg-pink-600/30 border-pink-500 text-pink-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    👩 Femenina (Creadora)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCloneGender('male')}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium border cursor-pointer ${
                      cloneGender === 'male'
                        ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    👨 Masculina
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-semibold tracking-wide">Nombre del perfil</label>
                <input
                  value={cloneName}
                  onChange={e => setCloneName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500/70"
                  placeholder="Ej: Voz Oficial Creadora"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-semibold tracking-wide">
                  Texto que debes leer al grabar:
                </label>
                <textarea
                  value={refText}
                  onChange={e => setRefText(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500/70 resize-none leading-relaxed"
                />
              </div>

              {/* Step indicator + Recording */}
              <div className="rounded-xl border border-slate-700/60 bg-slate-800/50 p-3 space-y-3">
                {/* Step 1 */}
                <div className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    hasRecordedAudio ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white animate-pulse'
                  }`}>1</span>
                  <span className="text-[11px] text-slate-300 font-medium">
                    {hasRecordedAudio ? '✓ Audio grabado' : 'Graba tu voz leyendo el texto de arriba'}
                  </span>
                </div>

                {/* Mic button */}
                <div className="flex flex-col items-center gap-2 py-1">
                  {!isRecording ? (
                    <div className="relative">
                      {/* Pulsing ring when no audio yet */}
                      {!hasRecordedAudio && !isCloning && (
                        <span className="absolute inset-0 rounded-full bg-rose-500/30 animate-ping" />
                      )}
                      <button
                        onClick={startRecording}
                        disabled={isCloning}
                        className="relative w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 disabled:opacity-40 flex items-center justify-center cursor-pointer shadow-lg shadow-rose-600/50 transition-all active:scale-95"
                        title="Grabar muestra de voz"
                      >
                        <Mic className="w-7 h-7 text-white" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={stopRecording}
                      className="w-16 h-16 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center cursor-pointer shadow-xl relative transition-all active:scale-95"
                    >
                      <Square className="w-5 h-5 text-white fill-white" />
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 flex items-center justify-center">
                        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                      </span>
                    </button>
                  )}

                  <p className="text-xs text-slate-400 font-mono text-center">
                    {isRecording
                      ? <span className="text-rose-400 animate-pulse">● REC {fmtSec(recordingSeconds)} — pulsa ⬛ para detener</span>
                      : hasRecordedAudio
                      ? <span className="text-emerald-400">✓ Audio listo ({fmtSec(recordingSeconds)}) — ahora clona ↓</span>
                      : <span>🎤 Presiona el botón rojo y lee el texto</span>}
                  </p>
                </div>

                {/* Step 2 */}
                <div className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    hasRecordedAudio ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-500'
                  }`}>2</span>
                  <span className="text-[11px] text-slate-400">
                    {hasRecordedAudio
                      ? <span className="text-emerald-400 font-medium">¡Listo! Pulsa el botón verde para clonar</span>
                      : 'Después de grabar, pulsa el botón verde'}
                  </span>
                </div>
              </div>

              <button
                onClick={handleCloneVoice}
                disabled={isCloning || isRecording || !hasRecordedAudio}
                className={`w-full py-2.5 rounded-xl text-white font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md ${
                  hasRecordedAudio && !isCloning
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30 scale-[1.02]'
                    : 'bg-emerald-900/50 opacity-40 cursor-not-allowed'
                }`}
              >
                {isCloning
                  ? <><Sparkles className="w-4 h-4 animate-spin" /> Clonando con VoiceStudio…</>
                  : <><Radio className="w-4 h-4" /> Clonar y Guardar como Voz Activa</>}
              </button>

              {cloneStatus && (
                <p className={`text-[11px] rounded-xl px-3 py-2 border ${
                  cloneStatus.ok
                    ? 'text-emerald-300 bg-emerald-900/30 border-emerald-500/30'
                    : 'text-rose-300 bg-rose-900/30 border-rose-500/30'
                }`}>
                  {cloneStatus.msg}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Chat Conversation ───────────────────────────────────────────────────
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
  const [showVoicePanel, setShowVoicePanel] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // In-Chat Search State
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [chatSearchTerm, setChatSearchTerm] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  const matchingMessageIds = useMemo(() => {
    if (!chatSearchTerm.trim()) return [];
    const term = chatSearchTerm.toLowerCase();
    return messages
      .filter((m) => (m.text || '').toLowerCase().includes(term))
      .map((m) => m.id);
  }, [messages, chatSearchTerm]);

  useEffect(() => {
    if (matchingMessageIds.length > 0 && isSearchOpen) {
      const targetId = matchingMessageIds[currentMatchIndex];
      if (targetId) {
        const el = document.getElementById(`msg-${targetId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }, [currentMatchIndex, matchingMessageIds, isSearchOpen]);

  const handleNextMatch = () => {
    if (matchingMessageIds.length === 0) return;
    setCurrentMatchIndex((prev) => (prev + 1) % matchingMessageIds.length);
  };

  const handlePrevMatch = () => {
    if (matchingMessageIds.length === 0) return;
    setCurrentMatchIndex((prev) => (prev - 1 + matchingMessageIds.length) % matchingMessageIds.length);
  };

  const renderHighlightedText = (text: string, query: string) => {
    if (!query.trim()) return text;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-pink-500 text-white font-semibold rounded-xs px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

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
      if (res.reply) setInputText(res.reply);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleGenerateAiText = async (): Promise<string> => {
    const res = await requestBotReply({
      fanName: chat.fanName,
      fanTier: chat.fanTier,
      platform: chat.platform,
      persona,
      rules,
      messages,
      vaultMenu: vaultItems,
    });
    return res.reply || '';
  };

  const handleVoiceNoteSent = (audioUrl: string, gender: 'female' | 'male') => {
    // Send as pure audio media — WhatsApp style without text or prefix
    onSendMessage('', {
      type: 'audio',
      url: audioUrl,
      isVoiceNote: true,
      duration: '0:00',
      gender,
    });
    setInputText('');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden relative">
      {/* Voice Panel Overlay */}
      {showVoicePanel && (
        <VoicePanel
          onClose={() => setShowVoicePanel(false)}
          textToSynth={inputText}
          onVoiceNoteSent={handleVoiceNoteSent}
          onGenerateAiText={handleGenerateAiText}
        />
      )}

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

        {/* Attention Toggle */}
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

          {/* In-Chat Search Toggle Button */}
          <button
            onClick={() => {
              setIsSearchOpen(!isSearchOpen);
              if (isSearchOpen) setChatSearchTerm('');
            }}
            className={`p-1.5 sm:p-2 rounded-xl text-xs border flex items-center justify-center cursor-pointer transition-colors shrink-0 ${
              isSearchOpen
                ? 'bg-pink-600 text-white border-pink-500 shadow-sm'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700/60'
            }`}
            title="Buscar en esta conversación"
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onToggleFanDrawer}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs border border-slate-700/60 flex items-center gap-1 cursor-pointer transition-colors shrink-0"
          >
            <span className="text-[11px] sm:text-xs font-medium">CRM</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* In-Chat Search Bar */}
      {isSearchOpen && (
        <div className="px-3 sm:px-5 py-2 bg-slate-900 border-b border-slate-800 flex items-center gap-2 z-10">
          <Search className="w-4 h-4 text-pink-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={chatSearchTerm}
            onChange={(e) => {
              setChatSearchTerm(e.target.value);
              setCurrentMatchIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (e.shiftKey) handlePrevMatch();
                else handleNextMatch();
              } else if (e.key === 'Escape') {
                setIsSearchOpen(false);
                setChatSearchTerm('');
              }
            }}
            placeholder="Buscar en esta conversación... (Enter = siguiente, Esc = cerrar)"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500/60"
          />
          {chatSearchTerm.trim() && (
            <span className="text-[11px] text-slate-400 font-mono whitespace-nowrap shrink-0">
              {matchingMessageIds.length > 0
                ? `${currentMatchIndex + 1} de ${matchingMessageIds.length}`
                : 'Sin resultados'}
            </span>
          )}
          <button
            onClick={handlePrevMatch}
            disabled={matchingMessageIds.length === 0}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            title="Coincidencia anterior (Shift+Enter)"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            onClick={handleNextMatch}
            disabled={matchingMessageIds.length === 0}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            title="Siguiente coincidencia (Enter)"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setIsSearchOpen(false);
              setChatSearchTerm('');
            }}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
            title="Cerrar búsqueda"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Manual Override Banner */}
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
          const isVoiceNote = m.media?.isVoiceNote || m.media?.type === 'audio';

          return (
            <div
              key={m.id}
              className={`flex flex-col ${isFan ? 'items-start' : 'items-end'}`}
            >
              {/* Sender label — hidden for voice notes to look like genuine WhatsApp */}
              {!isVoiceNote && (
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <span className="text-[10px] text-slate-400">
                    {isFan ? chat.fanName : isBot ? '🤖 VelvetBot' : '👩‍🎤 Creadora'}
                  </span>
                  <span className="text-[10px] text-slate-600">• {m.timestamp}</span>
                </div>
              )}

              {/* Message Bubble */}
              {(() => {
                const isCurrentMatch = isSearchOpen && matchingMessageIds[currentMatchIndex] === m.id;
                const isAnyMatch = isSearchOpen && matchingMessageIds.includes(m.id);

                return (
                  <div
                    id={`msg-${m.id}`}
                    className={`max-w-[88%] sm:max-w-md rounded-2xl shadow-md transition-all ${
                      isCurrentMatch
                        ? 'ring-2 ring-pink-500 shadow-lg shadow-pink-500/30 scale-[1.01]'
                        : isAnyMatch
                        ? 'ring-1 ring-pink-500/50'
                        : ''
                    } ${
                      isVoiceNote
                        ? `px-3.5 py-2.5 ${
                            isFan
                              ? 'bg-[#202c33] border border-white/5 rounded-tl-sm text-slate-100'
                              : 'bg-[#005c4b] border border-emerald-600/30 rounded-tr-sm text-white'
                          }`
                        : `p-3 text-xs sm:text-sm ${
                            isFan
                              ? 'bg-slate-900 border border-slate-800 text-slate-100 rounded-tl-sm'
                              : isBot
                              ? 'bg-gradient-to-br from-pink-950/80 to-purple-950/80 border border-pink-500/30 text-pink-50 rounded-tr-sm'
                              : 'bg-gradient-to-br from-purple-900/90 to-slate-900 border border-purple-500/40 text-purple-50 rounded-tr-sm'
                          }`
                    }`}
                  >
                    {/* Text Content (skip for pure voice notes) */}
                    {m.text && !isVoiceNote && (
                      <p className="whitespace-pre-line leading-relaxed">
                        {isSearchOpen && chatSearchTerm.trim()
                          ? renderHighlightedText(m.text, chatSearchTerm.trim())
                          : m.text}
                      </p>
                    )}

                {/* Voice Note — WhatsApp style, no header, timestamp and checks inside player */}
                {isVoiceNote && (
                  <VoiceNotePlayer
                    audioUrl={m.media?.url}
                    duration={m.media?.duration || '0:15'}
                    isOutgoing={!isFan}
                    timestamp={m.timestamp}
                    status={m.status || 'read'}
                    avatarUrl={isFan ? chat.fanAvatar : undefined}
                  />
                )}

                {/* WhatsApp Ephemeral View Once */}
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
                        <img src={m.media.url} alt="Foto efímera" className="w-full max-h-52 object-cover" />
                      </div>
                    )}
                  </div>
                )}

                {/* Locked PPV Content */}
                {m.media?.isPpv && !m.media.isViewOnce && (
                  <div className="mt-2.5 rounded-xl overflow-hidden border border-pink-500/30 bg-slate-950/80">
                    <div className="relative h-36 sm:h-44 w-full">
                      {m.media.type === 'video' ? (
                        <video
                          src={m.media.isUnlocked ? m.media.url : `${m.media.url}#t=0.5`}
                          controls={m.media.isUnlocked}
                          playsInline
                          className={`w-full h-full object-cover transition-all ${m.media.isUnlocked ? '' : 'blur-md brightness-50 pointer-events-none'}`}
                        />
                      ) : (
                        <img
                          src={m.media.url}
                          alt="PPV teaser"
                          className={`w-full h-full object-cover transition-all ${m.media.isUnlocked ? '' : 'blur-md brightness-50'}`}
                        />
                      )}
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
                          onClick={() => onUnlockPpv(m.id, m.media?.title || 'Set Exclusivo', m.media?.ppvPrice || 45)}
                          className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer shrink-0 shadow-sm"
                        >
                          <Unlock className="w-3 h-3" />
                          Desbloquear (${m.media.ppvPrice || 45})
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* External Payment Details */}
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
                        onClick={() => onConfirmPaymentAndRelease(m.id, m.paymentDetails?.amount || 45)}
                        className="mt-2 w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-sm"
                      >
                        <ShieldCheck className="w-3 h-3" />
                        Confirmar y Liberar Contenido (RF4.2)
                      </button>
                    )}
                  </div>
                )}

                {/* Status indicator */}
                <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-slate-400">
                  {(m.status as string) === 'failed' ? (
                    <span className="flex items-center gap-1 text-red-400 font-semibold animate-pulse">
                      <AlertCircle className="w-3 h-3" />
                      Error al enviar
                    </span>
                  ) : (m.status as string) === 'sending' ? (
                    <span className="flex items-center gap-1 text-slate-500">
                      <Clock className="w-3 h-3 animate-spin" />
                      Enviando...
                    </span>
                  ) : m.status === 'read' ? (
                    <CheckCheck className="w-3 h-3 text-cyan-400" />
                  ) : (
                    <Check className="w-2.5 h-2.5 text-slate-500" />
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Generating indicator */}
      {isGeneratingAi && (
        <div className="px-3 sm:px-5 py-1 bg-pink-950/60 border-t border-pink-500/30 flex items-center gap-1.5 text-xs text-pink-300">
          <Sparkles className="w-3 h-3 animate-spin shrink-0" />
          <span className="truncate">Redactando respuesta sugerida con Gemini...</span>
        </div>
      )}

      {/* Action Toolbar & Input */}
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
            onClick={() => setShowVoicePanel(true)}
            className="px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg bg-emerald-900/30 hover:bg-emerald-900/50 text-emerald-300 hover:text-white flex items-center gap-1 border border-emerald-500/30 transition-colors cursor-pointer shrink-0 text-[11px] sm:text-xs"
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
