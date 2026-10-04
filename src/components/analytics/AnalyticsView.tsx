import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Bot,
  UserCheck,
  DollarSign,
  PieChart,
  Clock,
  ArrowUpRight,
  Flame,
  Send,
  MessageCircle,
  Crown,
  Radio,
  PlaySquare,
  Film,
} from 'lucide-react';
import { ChannelIntegration } from '../../types';

interface AnalyticsViewProps {
  channels: ChannelIntegration[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ channels }) => {
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('month');

  // Revenue by Channel (RF6.1)
  const channelRevenues = [
    { name: 'WhatsApp', revenue: 4250, color: '#25d366', share: '32.4%' },
    { name: 'Telegram', revenue: 3120, color: '#229ed9', share: '23.8%' },
    { name: 'Fansly', revenue: 2680, color: '#00aff0', share: '20.4%' },
    { name: 'VIPweb', revenue: 1450, color: '#eab308', share: '11.1%' },
    { name: 'ManyVids', revenue: 890, color: '#e91e63', share: '6.8%' },
    { name: 'Pornhub', revenue: 480, color: '#ff9900', share: '3.7%' },
    { name: 'Scatbook', revenue: 240, color: '#8b5cf6', share: '1.8%' },
  ];

  const totalRevenue = channelRevenues.reduce((acc, c) => acc + c.revenue, 0);

  // Retention data (RF6.4)
  const retentionCohorts = [
    { platform: 'Fansly', m1: '100%', m2: '78%', m3: '65%', m4: '54%', m5: '48%', m6: '44%' },
    { platform: 'Telegram VIP', m1: '100%', m2: '84%', m3: '72%', m4: '68%', m5: '61%', m6: '58%' },
    { platform: 'WhatsApp Direct', m1: '100%', m2: '89%', m3: '81%', m4: '76%', m5: '70%', m6: '67%' },
    { platform: 'VIPweb', m1: '100%', m2: '74%', m3: '62%', m4: '51%', m5: '46%', m6: '42%' },
    { platform: 'ManyVids', m1: '100%', m2: '61%', m3: '45%', m4: '38%', m5: '32%', m6: '28%' },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
      {/* Top Header */}
      <div className="p-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-pink-400" />
              Métricas, Reportes y Rendimiento (RF6.1 - RF6.4)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Desempeño de ventas por canal, ratio Bot vs Creadora, conversión PPV y retención mensual.
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs">
            {(['today', 'week', 'month'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-3 py-1.5 rounded-lg capitalize transition-colors cursor-pointer ${
                  timeRange === r ? 'bg-pink-600 text-white font-medium' : 'text-slate-400 hover:text-white'
                }`}
              >
                {r === 'today' ? 'Hoy' : r === 'week' ? 'Esta Semana' : 'Este Mes'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
            <span className="text-slate-400 text-xs font-mono uppercase">Ingresos Totales Brutos</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-bold text-emerald-400 font-mono">
                ${totalRevenue.toLocaleString()} USD
              </span>
              <span className="text-xs text-emerald-400 flex items-center gap-0.5 font-bold">
                <TrendingUp className="w-3.5 h-3.5" /> +28.4%
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Sumatoria de los 7 canales integrados</p>
          </div>

          {/* RF6.2 Bot vs Human Ratio */}
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
            <span className="text-slate-400 text-xs font-mono uppercase">Desempeño del Bot (RF6.2)</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-bold text-pink-400 font-mono">79.2%</span>
              <span className="text-xs text-pink-300">Bot vs Creadora</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-3 flex">
              <div className="bg-pink-500 h-full" style={{ width: '79.2%' }} />
              <div className="bg-purple-500 h-full" style={{ width: '20.8%' }} />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-1.5 font-mono">
              <span>🤖 Bot: 79.2%</span>
              <span>👩‍🎤 Creadora: 20.8%</span>
            </div>
          </div>

          {/* RF6.3 PPV Conversion Rate */}
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
            <span className="text-slate-400 text-xs font-mono uppercase">Conversión PPV (RF6.3)</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-bold text-purple-400 font-mono">34.8%</span>
              <span className="text-xs text-emerald-400 font-bold">+6.2% vs manual</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">PPVs ofrecidos por bot que terminaron en compra</p>
          </div>

          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
            <span className="text-slate-400 text-xs font-mono uppercase">Horas Ahorradas a la Creadora</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-bold text-amber-400 font-mono">148 hrs</span>
              <span className="text-xs text-amber-300 font-mono">~4.9h / día</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Tiempo de chat automatizado por VelvetBot</p>
          </div>
        </div>

        {/* RF6.1 Revenue by Channel Chart and Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-white text-sm">
                Reporte de Ingresos por Canal (RF6.1)
              </h3>
              <p className="text-xs text-slate-400">
                Comparativa de facturación entre canales de mensajería (WhatsApp/Telegram) y plataformas de contenido.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-400">
              Total: ${totalRevenue.toLocaleString()} USD
            </span>
          </div>

          <div className="space-y-4">
            {channelRevenues.map((ch) => {
              const maxRev = channelRevenues[0].revenue;
              const widthPct = (ch.revenue / maxRev) * 100;

              return (
                <div key={ch.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block"
                        style={{ backgroundColor: ch.color }}
                      />
                      {ch.name}
                    </span>
                    <div className="flex items-center gap-3 font-mono">
                      <span className="text-slate-400">{ch.share}</span>
                      <span className="font-bold text-white">${ch.revenue.toLocaleString()} USD</span>
                    </div>
                  </div>

                  <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden p-0.5 border border-slate-800">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${widthPct}%`,
                        backgroundColor: ch.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Funnel of PPV conversion (RF6.3) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="font-semibold text-white text-sm mb-1">
              Embudo de Conversión de Ofertas PPV (RF6.3)
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Rendimiento de los menús interactivos y teasers desplegados automáticamente por el bot.
            </p>

            <div className="space-y-3 font-mono">
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block">1. PPVs Sugeridos por Bot</span>
                  <span className="text-lg font-bold text-white">1,420 ofertas</span>
                </div>
                <span className="text-xs text-slate-500">100%</span>
              </div>

              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between ml-4">
                <div>
                  <span className="text-xs text-slate-400 block">2. Teasers Vistos / Clics</span>
                  <span className="text-lg font-bold text-pink-400">894 vistas</span>
                </div>
                <span className="text-xs text-pink-400 font-semibold">62.9%</span>
              </div>

              <div className="p-3.5 bg-slate-950 border border-emerald-500/30 rounded-xl flex items-center justify-between ml-8">
                <div>
                  <span className="text-xs text-slate-400 block">3. Pagos Confirmados & Liberados</span>
                  <span className="text-lg font-bold text-emerald-400">495 compras</span>
                </div>
                <span className="text-xs text-emerald-400 font-bold">34.8% Final</span>
              </div>
            </div>
          </div>

          {/* Response times & Human intervention */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="font-semibold text-white text-sm mb-1">
              Velocidad de Respuesta & Retención
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Comparación entre respuesta instantánea del bot y respuesta humana.
            </p>

            <div className="space-y-4">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-white">Tiempo Respuesta Bot</h4>
                    <p className="text-[11px] text-slate-400">Humanizado con retardo natural</p>
                  </div>
                </div>
                <span className="text-xl font-bold font-mono text-pink-400">2.4 seg</span>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-white">Tiempo Respuesta Creadora</h4>
                    <p className="text-[11px] text-slate-400">Intervención manual</p>
                  </div>
                </div>
                <span className="text-xl font-bold font-mono text-purple-400">14.2 min</span>
              </div>

              <div className="p-3 bg-pink-500/5 border border-pink-500/20 rounded-xl text-xs text-pink-200">
                💡 <strong>Impacto demostrado:</strong> Los fans que reciben respuesta en menos de 10 segundos tienen un 73% más de probabilidades de pagar un PPV inmediato.
              </div>
            </div>
          </div>
        </div>

        {/* RF6.4 Retention Cohorts by Platform */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-white text-sm">
                Retención de Suscriptores & Recurrencia Mensual (RF6.4)
              </h3>
              <p className="text-xs text-slate-400">
                Porcentaje de clientes que continúan comprando mes a mes por cada plataforma.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-mono">
                <tr>
                  <th className="p-3">Canal / Red Social</th>
                  <th className="p-3">Mes 1</th>
                  <th className="p-3">Mes 2</th>
                  <th className="p-3">Mes 3</th>
                  <th className="p-3">Mes 4</th>
                  <th className="p-3">Mes 5</th>
                  <th className="p-3">Mes 6</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {retentionCohorts.map((r) => (
                  <tr key={r.platform} className="hover:bg-slate-800/30">
                    <td className="p-3 font-semibold text-white font-sans">{r.platform}</td>
                    <td className="p-3 text-slate-300">{r.m1}</td>
                    <td className="p-3 text-emerald-400 font-semibold">{r.m2}</td>
                    <td className="p-3 text-emerald-400/90">{r.m3}</td>
                    <td className="p-3 text-slate-300">{r.m4}</td>
                    <td className="p-3 text-slate-400">{r.m5}</td>
                    <td className="p-3 text-slate-500">{r.m6}</td>
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
