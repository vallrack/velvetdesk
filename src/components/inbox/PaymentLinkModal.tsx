import React, { useState } from 'react';
import { X, CreditCard, Send, CheckCircle2, Copy, Sparkles, ShieldCheck } from 'lucide-react';
import { PaymentGatewayConfig, FanProfile } from '../../types';

interface PaymentLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  gateways: PaymentGatewayConfig[];
  fanProfile?: FanProfile;
  onSendPaymentLink: (data: {
    gatewayId: string;
    amount: number;
    currency: string;
    messageText: string;
  }) => void;
}

export const PaymentLinkModal: React.FC<PaymentLinkModalProps> = ({
  isOpen,
  onClose,
  gateways,
  fanProfile,
  onSendPaymentLink,
}) => {
  const enabledGateways = gateways.filter((g) => g.enabled);
  const [selectedGatewayId, setSelectedGatewayId] = useState(enabledGateways[0]?.id || '');
  const [amount, setAmount] = useState<number>(45);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentGateway = enabledGateways.find((g) => g.id === selectedGatewayId) || enabledGateways[0];

  const presetAmounts = [20, 35, 45, 80, 150];

  const generateMessage = () => {
    if (!currentGateway) return '';
    return `¡Listo mi amor! Para desbloquear tu contenido exclusivo por $${amount} ${currentGateway.currency}:\n\n` +
      `💳 Método: ${currentGateway.name}\n` +
      `📌 Datos/Enlace: ${currentGateway.walletOrAccount}\n` +
      `ℹ️ ${currentGateway.instructions}\n\n` +
      `Apenas confirmes, el sistema te liberará el contenido automáticamente en este chat 💕✨`;
  };

  const handleSend = () => {
    if (!currentGateway) return;
    onSendPaymentLink({
      gatewayId: currentGateway.id,
      amount,
      currency: currentGateway.currency,
      messageText: generateMessage(),
    });
    onClose();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateMessage());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Enviar Enlace de Pago Seguro</h3>
              <p className="text-xs text-slate-400">
                Monetización externa para {fanProfile?.name || 'el cliente'} ({fanProfile?.platform.toUpperCase()})
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

        <div className="p-6 space-y-4">
          {/* Method selector */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Pasarela / Método de Cobro
            </label>
            <div className="grid grid-cols-2 gap-2">
              {enabledGateways.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setSelectedGatewayId(g.id)}
                  className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                    selectedGatewayId === g.id
                      ? 'border-emerald-500 bg-emerald-500/10 text-white font-medium'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <p className="truncate font-semibold text-white">{g.name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 truncate">{g.currency} • Auto-desbloqueo</p>
                </button>
              ))}
            </div>
          </div>

          {/* Amount selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-300">Importe a Cobrar</label>
              <span className="text-xs font-mono font-bold text-emerald-400">${amount} {currentGateway?.currency}</span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              {presetAmounts.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setAmount(p)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium border cursor-pointer transition-colors ${
                    amount === p
                      ? 'bg-emerald-600 border-emerald-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  ${p}
                </button>
              ))}
            </div>
            <input
              type="number"
              min="5"
              step="1"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              placeholder="Otro monto personalizado..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/60"
            />
          </div>

          {/* Preview Box */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-300">Vista previa del mensaje a enviar</label>
              <button
                type="button"
                onClick={handleCopy}
                className="text-[11px] text-slate-400 hover:text-emerald-400 flex items-center gap-1 cursor-pointer"
              >
                {copied ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copiado' : 'Copiar texto'}
              </button>
            </div>
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 whitespace-pre-line font-mono max-h-36 overflow-y-auto">
              {generateMessage()}
            </div>
          </div>

          <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-xs text-emerald-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>El bot monitorea la confirmación del pago y liberará el contenido en automático tras recibirlo.</span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-xl cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSend}
              className="px-5 py-2 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-600/25 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              Enviar Enlace al Chat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
