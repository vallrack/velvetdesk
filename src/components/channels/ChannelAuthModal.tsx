import React, { useState, useEffect } from 'react';
import {
  X,
  QrCode,
  Key,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Phone,
  Lock,
  Copy,
  AlertCircle,
  ExternalLink,
  Flame,
  Send,
  MessageCircle,
  Film,
  PlaySquare,
  Radio,
  Crown,
  Wifi,
  Sparkles,
} from 'lucide-react';
import { ChannelIntegration, PlatformId } from '../../types';
import { PlatformBadge } from '../common/PlatformBadge';

interface ChannelAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  channel: ChannelIntegration | null;
  onSaveCredentials: (
    channelId: PlatformId,
    credentials: {
      credentialInfo: string;
      accountUsername?: string;
      status: 'connected' | 'disconnected';
    }
  ) => void;
  allChannels: ChannelIntegration[];
  onSelectChannelToEdit: (ch: ChannelIntegration) => void;
}

export const ChannelAuthModal: React.FC<ChannelAuthModalProps> = ({
  isOpen,
  onClose,
  channel,
  onSaveCredentials,
  allChannels,
  onSelectChannelToEdit,
}) => {
  const [activePlatform, setActivePlatform] = useState<PlatformId>(channel?.id || 'whatsapp');
  const [activeMethod, setActiveMethod] = useState<'qr' | 'token' | 'credentials'>('qr');

  // WhatsApp states
  const [waPhone, setWaPhone] = useState('+1 (305) 555-0199');
  const [pairingCode, setPairingCode] = useState('8K29-4XLP');
  const [qrCounter, setQrCounter] = useState(45);

  // Form inputs for credentials
  const [apiToken, setApiToken] = useState('');
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sessionCookie, setSessionCookie] = useState('');

  // Status feedback
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  useEffect(() => {
    if (channel) {
      setActivePlatform(channel.id);
      setUsernameOrEmail(channel.accountUsername || channel.credentialInfo || '');
      setApiToken(channel.apiKeyOrToken || '');
    }
  }, [channel]);

  // QR code refresh timer
  useEffect(() => {
    let timer: any;
    if (isOpen && activePlatform === 'whatsapp') {
      timer = setInterval(() => {
        setQrCounter((prev) => (prev > 1 ? prev - 1 : 60));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isOpen, activePlatform]);

  if (!isOpen) return null;

  const currentChannel = allChannels.find((c) => c.id === activePlatform) || allChannels[0];

  const handleTestAndConnect = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      setVerifiedSuccess(true);

      let credInfo = '';
      if (activePlatform === 'whatsapp') {
        credInfo = waPhone || '+1 (305) 555-0199';
      } else if (activePlatform === 'telegram') {
        credInfo = usernameOrEmail || '@VelvetGoddess_bot';
      } else if (activePlatform === 'fansly') {
        credInfo = `Token: fan_live_${Math.random().toString(36).substring(2, 7)}...`;
      } else {
        credInfo = usernameOrEmail ? `Usuario: ${usernameOrEmail}` : 'Sesión Activa Sincronizada';
      }

      onSaveCredentials(activePlatform, {
        credentialInfo: credInfo,
        accountUsername: usernameOrEmail || '@velvet_creator',
        status: 'connected',
      });

      setTimeout(() => {
        setVerifiedSuccess(false);
        onClose();
      }, 1400);
    }, 1500);
  };

  const handleDisconnect = () => {
    onSaveCredentials(activePlatform, {
      credentialInfo: 'No conectado',
      accountUsername: '',
      status: 'disconnected',
    });
    onClose();
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(`https://velvetdesk.app/api/webhooks/${activePlatform}`);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
                Conectar Cuenta & Iniciar Sesión de Canal
              </h3>
              <p className="text-[11px] text-slate-400">
                RF1.1: Vincula tu cuenta para sincronizar mensajes y fans en tiempo real
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Platform selection tabs */}
        <div className="px-5 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
          {allChannels.map((ch) => {
            const isSelected = ch.id === activePlatform;
            return (
              <button
                key={ch.id}
                onClick={() => {
                  setActivePlatform(ch.id);
                  onSelectChannelToEdit(ch);
                  setVerifiedSuccess(false);
                }}
                className={`text-xs px-3 py-1.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-pink-600 text-white font-semibold shadow-md shadow-pink-600/25'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <PlatformBadge platform={ch.id} size="sm" showLabel={false} />
                <span>{ch.name}</span>
                {ch.status === 'connected' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                )}
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Current Connection Status Banner */}
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <PlatformBadge platform={currentChannel.id} size="md" />
              <div>
                <span className="text-xs font-semibold text-white block">
                  Estado: {currentChannel.status === 'connected' ? 'Sincronización Activa' : 'Desconectado'}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {currentChannel.credentialInfo}
                </span>
              </div>
            </div>

            {currentChannel.status === 'connected' && (
              <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                <Wifi className="w-3 h-3 animate-pulse" /> EN LÍNEA
              </span>
            )}
          </div>

          {/* PLATFORM SPECIFIC AUTHENTICATION FORMS */}

          {/* 1. WHATSAPP MULTI-DEVICE AUTHENTICATION */}
          {activePlatform === 'whatsapp' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <button
                  type="button"
                  onClick={() => setActiveMethod('qr')}
                  className={`text-xs px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
                    activeMethod === 'qr'
                      ? 'bg-emerald-600 text-white font-medium'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5 inline mr-1" />
                  Escanear Código QR (Recomendado)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMethod('credentials')}
                  className={`text-xs px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
                    activeMethod === 'credentials'
                      ? 'bg-emerald-600 text-white font-medium'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Phone className="w-3.5 h-3.5 inline mr-1" />
                  Código de Vinculación por Teléfono
                </button>
              </div>

              {activeMethod === 'qr' ? (
                <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-slate-950/70 border border-slate-800 rounded-2xl">
                  {/* Simulated QR Code Canvas */}
                  <div className="flex flex-col items-center">
                    <div className="w-48 h-48 bg-white p-3 rounded-2xl shadow-xl flex flex-col items-center justify-center relative group">
                      {/* SVG QR Code Simulation */}
                      <svg viewBox="0 0 100 100" className="w-full h-full text-slate-950">
                        {/* QR Pattern */}
                        <rect x="0" y="0" width="30" height="30" fill="currentColor" rx="4" />
                        <rect x="5" y="5" width="20" height="20" fill="white" rx="2" />
                        <rect x="9" y="9" width="12" height="12" fill="currentColor" rx="1" />

                        <rect x="70" y="0" width="30" height="30" fill="currentColor" rx="4" />
                        <rect x="75" y="5" width="20" height="20" fill="white" rx="2" />
                        <rect x="79" y="9" width="12" height="12" fill="currentColor" rx="1" />

                        <rect x="0" y="70" width="30" height="30" fill="currentColor" rx="4" />
                        <rect x="5" y="75" width="20" height="20" fill="white" rx="2" />
                        <rect x="9" y="79" width="12" height="12" fill="currentColor" rx="1" />

                        {/* Noise dots */}
                        <circle cx="45" cy="15" r="3" fill="currentColor" />
                        <circle cx="55" cy="25" r="3" fill="currentColor" />
                        <circle cx="40" cy="40" r="4" fill="currentColor" />
                        <circle cx="50" cy="50" r="5" fill="#25d366" />
                        <circle cx="60" cy="40" r="4" fill="currentColor" />
                        <circle cx="45" cy="75" r="3" fill="currentColor" />
                        <circle cx="75" cy="55" r="3" fill="currentColor" />
                        <circle cx="85" cy="70" r="3" fill="currentColor" />
                        <circle cx="85" cy="85" r="4" fill="currentColor" />
                      </svg>

                      {/* Scan trigger overlay */}
                      <div className="absolute inset-0 bg-slate-950/80 rounded-2xl flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity p-2 text-center">
                        <button
                          type="button"
                          onClick={handleTestAndConnect}
                          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs cursor-pointer"
                        >
                          Simular Escaneo
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-400 font-mono">
                      <RefreshCw className="w-3 h-3 text-emerald-400 animate-spin" />
                      <span>Se actualiza en {qrCounter}s</span>
                    </div>
                  </div>

                  {/* Instructions */}
                  <div className="space-y-3 text-xs text-slate-300">
                    <h4 className="font-semibold text-white">Pasos para conectar tu WhatsApp:</h4>
                    <ol className="list-decimal list-inside space-y-1.5 text-slate-400 leading-relaxed">
                      <li>Abre WhatsApp en tu teléfono personal o de empresa.</li>
                      <li>Toca <strong>Ajustes</strong> o <strong>Dispositivos vinculados</strong>.</li>
                      <li>Selecciona <strong>Vincular un dispositivo</strong>.</li>
                      <li>Apunta la cámara de tu teléfono hacia este código QR.</li>
                    </ol>
                    <p className="text-[11px] text-emerald-300/80 bg-emerald-950/30 p-2 rounded-lg border border-emerald-500/20">
                      🔒 Conexión cifrada de extremo a extremo mediante Multi-Device Bridge. El bot podrá recibir y responder mensajes.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Número Telefónico de WhatsApp (con código de país)
                    </label>
                    <input
                      type="text"
                      value={waPhone}
                      onChange={(e) => setWaPhone(e.target.value)}
                      placeholder="+34 611 234 567"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">Código de Vinculación</span>
                      <span className="text-lg font-bold font-mono text-emerald-400 tracking-wider">
                        {pairingCode}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPairingCode(`${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`)}
                      className="text-xs text-slate-400 hover:text-white p-1 rounded cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Introduce este código en la notificación de WhatsApp que aparecerá en tu teléfono para autorizar la conexión.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 2. TELEGRAM BOT / MTPROTO AUTHENTICATION */}
          {activePlatform === 'telegram' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Telegram Bot Token (@BotFather)
                </label>
                <input
                  type="text"
                  placeholder="Ej. 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Obtén tu token hablando con @BotFather en Telegram y creando un nuevo bot para la creadora.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Username del Bot o Canal VIP
                </label>
                <input
                  type="text"
                  placeholder="@VelvetGoddess_bot"
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="p-3 bg-sky-950/20 border border-sky-500/20 rounded-xl text-xs text-sky-200">
                ℹ️ Los mensajes de fans en Telegram se recibirán instantáneamente vía MTProto Webhook con latencia menor a 100ms.
              </div>
            </div>
          )}

          {/* 3. FANSLY API TOKEN & WEBHOOK */}
          {activePlatform === 'fansly' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Fansly Creator Auth Token / API Secret
                </label>
                <input
                  type="password"
                  placeholder="fan_live_..."
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Generado desde tu panel de creadora Fansly &gt; Configuración &gt; Aplicaciones / Integraciones.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Username Oficial de Fansly
                </label>
                <input
                  type="text"
                  placeholder="@velvet_goddess"
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Webhook Endpoint to paste in Fansly */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-300">URL de Webhook para Fansly</label>
                  <button
                    type="button"
                    onClick={handleCopyWebhook}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedWebhook ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copiedWebhook ? 'Copiado' : 'Copiar URL'}
                  </button>
                </div>
                <input
                  type="text"
                  readOnly
                  value="https://velvetdesk.app/api/webhooks/fansly"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-400 font-mono select-all"
                />
              </div>
            </div>
          )}

          {/* 4. MANYVIDS SESSION BOT & CREDENTIALS */}
          {activePlatform === 'manyvids' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Email de Creadora ManyVids
                </label>
                <input
                  type="email"
                  placeholder="creadora@manyvids.com"
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Contraseña o MV Session Cookie
                </label>
                <input
                  type="password"
                  placeholder="••••••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  El agente headless inicia sesión de forma segura y monitorea la bandeja de entrada de MV cada 60 segundos.
                </p>
              </div>
            </div>
          )}

          {/* 5. PORNHUB MODEL PROGRAM */}
          {activePlatform === 'pornhub' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Model Profile ID / Nombre de Usuario Pornhub
                </label>
                <input
                  type="text"
                  placeholder="velvet-model-verified"
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  API Key del Programa de Modelos Pornhub
                </label>
                <input
                  type="password"
                  placeholder="ph_sec_..."
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
            </div>
          )}

          {/* 6. SCATBOOK API SECRET */}
          {activePlatform === 'scatbook' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Scatbook User Handle o ID
                </label>
                <input
                  type="text"
                  placeholder="@velvet_sb"
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Token Secreto de Conexión Scatbook
                </label>
                <input
                  type="password"
                  placeholder="sb_token_..."
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>
            </div>
          )}

          {/* 7. VIPWEB INTEGRATION */}
          {activePlatform === 'vipweb' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  VIPweb Model Key / API Credentials
                </label>
                <input
                  type="password"
                  placeholder="vw_live_031..."
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  ID de Sala o Perfil VIPweb
                </label>
                <input
                  type="text"
                  placeholder="room_velvet_vip"
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-500"
                />
              </div>
            </div>
          )}

          {/* Feedback message upon successful connection */}
          {verifiedSuccess && (
            <div className="p-3 bg-emerald-500/15 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>¡Cuenta verificada y sincronizada exitosamente con VelvetDesk!</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
          {currentChannel.status === 'connected' ? (
            <button
              type="button"
              onClick={handleDisconnect}
              className="text-xs text-rose-400 hover:text-rose-300 font-medium cursor-pointer"
            >
              Desvincular cuenta
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-xl cursor-pointer"
            >
              Cerrar
            </button>
            <button
              type="button"
              disabled={isVerifying}
              onClick={handleTestAndConnect}
              className="px-5 py-2 text-xs font-medium bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 disabled:opacity-50 text-white rounded-xl flex items-center gap-2 shadow-lg shadow-pink-600/25 cursor-pointer font-bold"
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Verificando...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Guardar y Sincronizar</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
