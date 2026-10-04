import React, { useState } from 'react';
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Copy,
  QrCode,
  ShieldCheck,
  DollarSign,
  Plus,
  RefreshCw,
  ExternalLink,
  Flame,
  Send,
} from 'lucide-react';
import { PaymentGatewayConfig } from '../../types';

interface PaymentsViewProps {
  gateways: PaymentGatewayConfig[];
  onUpdateGateways: (gateways: PaymentGatewayConfig[]) => void;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({
  gateways,
  onUpdateGateways,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showQrFor, setShowQrFor] = useState<string | null>(null);

  // Recent simulated transactions
  const [transactions, setTransactions] = useState([
    {
      id: 'tx-9941',
      fanName: 'Carlos Mendoza',
      platform: 'WhatsApp',
      method: 'Crypto USDT (TRC20)',
      amount: 45.0,
      item: 'Video Privado Ducha (14 min)',
      status: 'confirmed',
      time: 'Hace 8 min',
      unlocked: true,
    },
    {
      id: 'tx-9940',
      fanName: 'Alexander V.',
      platform: 'Telegram',
      method: 'Wise Transfer',
      amount: 45.0,
      item: 'Video Privado Ducha (14 min)',
      status: 'confirmed',
      time: 'Hace 24 min',
      unlocked: true,
    },
    {
      id: 'tx-9939',
      fanName: 'Maxime Dupont',
      platform: 'Fansly',
      method: 'Fansly Wallet (Nativo)',
      amount: 90.0,
      item: 'Mega Pack VIP Fin de Semana',
      status: 'confirmed',
      time: 'Hace 1 hora',
      unlocked: true,
    },
    {
      id: 'tx-9938',
      fanName: 'Diego Morales',
      platform: 'ManyVids',
      method: 'ManyVids Native PPV',
      amount: 20.0,
      item: 'Teaser Corto',
      status: 'confirmed',
      time: 'Ayer',
      unlocked: true,
    },
  ]);

  const handleToggleGateway = (id: string) => {
    const updated = gateways.map((g) => (g.id === id ? { ...g, enabled: !g.enabled } : g));
    onUpdateGateways(updated);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
      {/* Top Header */}
      <div className="p-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-400" />
              Gestión de Pagos, Pasarelas y Desbloqueos (RF4.1 - RF4.3)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Monetización externa para WhatsApp/Telegram y cobro PPV nativo para Fansly/ManyVids.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-2 rounded-xl">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-emerald-300 font-semibold">
              Auto-Desbloqueo al Confirmar Pago: ACTIVO
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* RF4.1 External Payment Gateways */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-white text-sm">
                Pasarelas Externas Configuradas (WhatsApp, Telegram, etc.)
              </h3>
              <p className="text-xs text-slate-400">
                Enlaces y wallets que el bot envía automáticamente para cerrar ventas.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {gateways.map((g) => (
              <div
                key={g.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                  g.enabled
                    ? 'bg-slate-900 border-slate-800 hover:border-emerald-500/40'
                    : 'bg-slate-950 border-slate-900 opacity-50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-white text-xs">{g.name}</span>
                    <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={g.enabled}
                        onChange={() => handleToggleGateway(g.id)}
                        className="w-4 h-4 rounded text-emerald-600 bg-slate-950 border-slate-700"
                      />
                      <span>{g.enabled ? 'Activa' : 'Pausada'}</span>
                    </label>
                  </div>

                  <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl my-2 flex items-center justify-between">
                    <span className="text-xs font-mono text-emerald-400 truncate mr-2">
                      {g.walletOrAccount}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(g.id, g.walletOrAccount)}
                      className="text-slate-400 hover:text-white p-1 rounded cursor-pointer shrink-0"
                      title="Copiar dirección"
                    >
                      {copiedId === g.id ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed">{g.instructions}</p>
                </div>

                <div className="pt-3 border-t border-slate-800/80 mt-3 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-mono">Moneda: {g.currency}</span>
                  <span className="text-emerald-400 font-medium">⚡ Liberación automática</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RF4.3 Native PPV Channels */}
        <div>
          <h3 className="font-semibold text-white text-sm mb-1">
            Cobro PPV en Plataformas Nativas (RF4.3)
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Reglas de liquidación directa para canales con pasarela propia integrada.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 bg-gradient-to-br from-cyan-950/40 to-slate-900 border border-cyan-500/30 rounded-2xl">
              <div className="flex items-center gap-2 mb-2 text-cyan-400 font-bold text-xs">
                <Flame className="w-4 h-4" /> Fansly Native Pay-Per-View
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Los mensajes salientes marcados con PPV cobran automáticamente el importe en Fansly Wallet. El fan paga con un clic en la interfaz de Fansly sin salir de la plataforma.
              </p>
              <div className="mt-3 flex items-center justify-between text-xs text-cyan-300 font-mono">
                <span>Comisión Fansly: 20%</span>
                <span>Depósito: Semanal</span>
              </div>
            </div>

            <div className="p-5 bg-gradient-to-br from-pink-950/40 to-slate-900 border border-pink-500/30 rounded-2xl">
              <div className="flex items-center gap-2 mb-2 text-pink-400 font-bold text-xs">
                <Send className="w-4 h-4" /> ManyVids Direct Clip Store
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Integración de sesión directa para bloquear videos según el catálogo de ManyVids. Se libera inmediatamente en la biblioteca de ManyVids del comprador.
              </p>
              <div className="mt-3 flex items-center justify-between text-xs text-pink-300 font-mono">
                <span>Comisión ManyVids: 15%</span>
                <span>Depósito: Quincenal</span>
              </div>
            </div>
          </div>
        </div>

        {/* RF4.2 Content Release / Payment Confirmations */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-white text-sm">
                Registro de Pagos Confirmados y Contenido Liberado (RF4.2)
              </h3>
              <p className="text-xs text-slate-400">
                Historial de transacciones validadas en blockchain, Wise, PayPal o pasarelas nativas.
              </p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-mono">
                <tr>
                  <th className="p-3.5">Cliente</th>
                  <th className="p-3.5">Canal</th>
                  <th className="p-3.5">Método</th>
                  <th className="p-3.5">Contenido Liberado</th>
                  <th className="p-3.5">Monto</th>
                  <th className="p-3.5">Estado</th>
                  <th className="p-3.5">Tiempo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-medium text-white">{tx.fanName}</td>
                    <td className="p-3.5 font-mono text-slate-400">{tx.platform}</td>
                    <td className="p-3.5 text-slate-300">{tx.method}</td>
                    <td className="p-3.5 text-slate-200">{tx.item}</td>
                    <td className="p-3.5 font-mono font-bold text-emerald-400">
                      ${tx.amount.toFixed(2)} USD
                    </td>
                    <td className="p-3.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" /> LIBERADO
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-500 font-mono text-[11px]">{tx.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
