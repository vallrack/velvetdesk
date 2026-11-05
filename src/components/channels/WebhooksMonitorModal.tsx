import React, { useState, useEffect } from 'react';
import {
  X,
  Radio,
  CheckCircle2,
  Copy,
  ExternalLink,
  Send,
  RefreshCw,
  Zap,
  ShieldCheck,
  Clock,
  AlertCircle,
  Code,
} from 'lucide-react';
import { PlatformId } from '../../types';
import { PlatformBadge } from '../common/PlatformBadge';
import { fetchWebhookLogs, sendTestWebhook, type WebhookLogItem } from '../../services/apiService';

interface WebhooksMonitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWebhookTested?: () => void;
}

export const WebhooksMonitorModal: React.FC<WebhooksMonitorModalProps> = ({
  isOpen,
  onClose,
  onWebhookTested,
}) => {
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformId>('whatsapp');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [logs, setLogs] = useState<WebhookLogItem[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string; latency?: number } | null>(null);

  // Test form state
  const [testFanName, setTestFanName] = useState('Alejandro Torres');
  const [testMessage, setTestMessage] = useState('¡Hola! Me encantó tu última foto, ¿tienes contenido nuevo disponible?');

  const platforms: { id: PlatformId; name: string }[] = [
    { id: 'onlyfans', name: 'OnlyFans' },
    { id: 'whatsapp', name: 'WhatsApp' },
    { id: 'telegram', name: 'Telegram' },
    { id: 'fansly', name: 'Fansly' },
    { id: 'manyvids', name: 'ManyVids' },
    { id: 'pornhub', name: 'Pornhub' },
    { id: 'scatbook', name: 'Scatbook' },
    { id: 'vipweb', name: 'VIPweb' },
  ];

  const currentHost = typeof window !== 'undefined' ? window.location.origin : 'https://velvetdesk.app';
  const webhookUrl = `${currentHost}/api/webhooks/${selectedPlatform}`;

  const loadLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const data = await fetchWebhookLogs();
      setLogs(data.recent || []);
    } catch (e) {
      console.warn('Error loading webhook logs:', e);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadLogs();
      setTestResult(null);
    }
  }, [isOpen, selectedPlatform]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testMessage.trim()) return;

    setIsSendingTest(true);
    setTestResult(null);

    try {
      const res = await sendTestWebhook(selectedPlatform, {
        fanName: testFanName.trim() || 'Fan de Prueba',
        fanHandle: `@${(testFanName || 'fan').toLowerCase().replace(/\s+/g, '_')}`,
        text: testMessage.trim(),
        tier: 'curioso',
      });

      setTestResult({
        ok: true,
        msg: `¡Webhook enviado exitosamente a ${selectedPlatform.toUpperCase()}!`,
        latency: res.latencyMs || 15,
      });

      // Reload logs
      setTimeout(loadLogs, 600);
      onWebhookTested?.();
    } catch (err: any) {
      setTestResult({
        ok: false,
        msg: `Error al enviar webhook: ${err.message || 'Error de red'}`,
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-3 sm:p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center shrink-0">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
                Centro de Webhooks & Eventos en Tiempo Real
              </h3>
              <p className="text-[11px] text-slate-400">
                Recepción instantánea de mensajes y sincronización bidireccional para 7 plataformas
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
          {platforms.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPlatform(p.id)}
              className={`text-xs px-3 py-1.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedPlatform === p.id
                  ? 'bg-pink-600 text-white font-semibold shadow-md shadow-pink-600/25'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <PlatformBadge platform={p.id} size="sm" showLabel={false} />
              <span>{p.name}</span>
            </button>
          ))}
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Active Webhook URL Box */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-pink-400" />
                URL del Webhook de {selectedPlatform.toUpperCase()}
              </label>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Endpoint Activo
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={webhookUrl}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-pink-300 font-mono focus:outline-none select-all"
              />
              <button
                type="button"
                onClick={handleCopy}
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all shrink-0 ${
                  copiedUrl
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                }`}
              >
                {copiedUrl ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar URL</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Pega esta URL en el panel de desarrollador o configuración de webhooks de tu cuenta de{' '}
              <strong className="text-slate-400">{selectedPlatform.toUpperCase()}</strong>. Soporta verificación automática GET y recepción de eventos POST.
            </p>
          </div>

          {/* Test Dispatcher Form */}
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
            <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-pink-400" />
              Probar Envío de Webhook en Vivo
            </h4>
            <p className="text-[11px] text-slate-400">
              Envía un evento de prueba simulado. Al procesarse, se insertará en Supabase, se activará Realtime y sonará la notificación.
            </p>

            <form onSubmit={handleSendTest} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Nombre del Fan remitente</label>
                  <input
                    type="text"
                    value={testFanName}
                    onChange={(e) => setTestFanName(e.target.value)}
                    placeholder="Ej. Juan Carlos"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500/60"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Red de Origen</label>
                  <div className="flex items-center gap-2 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300">
                    <PlatformBadge platform={selectedPlatform} size="sm" />
                    <span className="font-mono text-[11px] text-slate-400">POST /api/webhooks/{selectedPlatform}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Texto del Mensaje</label>
                <textarea
                  rows={2}
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="Escribe el mensaje entrante..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-pink-500/60 resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                {testResult && (
                  <div
                    className={`text-xs px-3 py-1.5 rounded-xl border flex items-center gap-1.5 ${
                      testResult.ok
                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                    }`}
                  >
                    {testResult.ok ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    )}
                    <span>{testResult.msg}</span>
                    {testResult.latency !== undefined && (
                      <span className="font-mono text-[10px] text-slate-400 ml-1">
                        ({testResult.latency} ms)
                      </span>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSendingTest || !testMessage.trim()}
                  className="ml-auto px-4 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-md shadow-pink-600/20 disabled:opacity-40"
                >
                  <Send className={`w-3.5 h-3.5 ${isSendingTest ? 'animate-spin' : ''}`} />
                  <span>{isSendingTest ? 'Enviando...' : 'Disparar Webhook'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Webhook Logs Feed */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Historial de Eventos Recibidos ({logs.length})
              </h4>
              <button
                onClick={loadLogs}
                disabled={isLoadingLogs}
                className="text-slate-400 hover:text-white p-1 rounded-md text-xs flex items-center gap-1 cursor-pointer transition-colors"
                title="Actualizar registro"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingLogs ? 'animate-spin text-pink-400' : ''}`} />
                <span className="text-[11px]">Refrescar</span>
              </button>
            </div>

            {logs.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs bg-slate-950/60 border border-slate-800/80 rounded-2xl">
                No hay eventos de webhook registrados todavía. ¡Dispara una prueba arriba para ver el primer evento!
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60 bg-slate-950/60 border border-slate-800 rounded-2xl overflow-hidden text-xs">
                {logs.map((log) => (
                  <div key={log.id} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-900/40">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <PlatformBadge platform={log.platform as PlatformId} size="sm" showLabel={false} />
                      <div className="min-w-0">
                        <p className="font-semibold text-white truncate text-[11px]">
                          {log.sender}: <span className="text-slate-300 font-normal">"{log.textSnippet}"</span>
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {log.timestamp} • Latencia: {log.latencyMs}ms
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full shrink-0 font-semibold border ${
                        log.status === 'processed'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      }`}
                    >
                      {log.status === 'processed' ? '200 OK' : 'ERROR'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
