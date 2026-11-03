import React, { useState, useEffect, useRef } from 'react';
import {
  BarChart3, TrendingUp, Bot, UserCheck, DollarSign,
  MessageCircle, Crown, ArrowUpRight, Zap, Target,
  Users, ShoppingBag, RefreshCw,
} from 'lucide-react';
import type { ChannelIntegration } from '../../types';

interface AnalyticsViewProps {
  channels: ChannelIntegration[];
}

// ─── Inline SVG Bar Chart ──────────────────────────────────────────────────────
function BarChartSvg({ data, color }: { data: { label: string; value: number }[]; color: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  const H = 120;
  const W = 100 / data.length;

  return (
    <div className="relative w-full" style={{ height: H + 32 }}>
      <svg width="100%" height={H} className="overflow-visible">
        {data.map((d, i) => {
          const barH = (d.value / max) * (H - 20);
          const x = i * W + W * 0.15;
          const barW = W * 0.7;
          return (
            <g key={i}>
              {/* Track */}
              <rect x={`${x}%`} y={0} width={`${barW}%`} height={H - 4} rx={4}
                fill="rgba(255,255,255,0.04)" />
              {/* Bar */}
              <rect x={`${x}%`} y={H - barH - 4} width={`${barW}%`} height={barH} rx={4}
                fill={color} opacity={0.85}>
                <animate attributeName="height" from="0" to={barH} dur="0.6s" calcMode="ease" fill="freeze" />
                <animate attributeName="y" from={H - 4} to={H - barH - 4} dur="0.6s" calcMode="ease" fill="freeze" />
              </rect>
              {/* Value */}
              <text x={`${x + barW / 2}%`} y={H - barH - 8}
                textAnchor="middle" fontSize="9" fill="white" fontWeight="600">
                {d.value >= 1000 ? (d.value / 1000).toFixed(1) + 'k' : d.value}
              </text>
            </g>
          );
        })}
      </svg>
      {/* Labels */}
      <div className="flex w-full" style={{ marginTop: 4 }}>
        {data.map((d, i) => (
          <div key={i} className="text-center text-slate-500 font-mono" style={{ width: `${W}%`, fontSize: 9 }}>
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Inline SVG Area/Line Chart ───────────────────────────────────────────────
function AreaChartSvg({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  const W = 400;
  const H = 80;
  const step = W / (data.length - 1);

  const points = data.map((v, i) => ({
    x: i * step,
    y: H - (v / max) * (H - 10),
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${H} L 0 ${H} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full" style={{ height: 80 }}>
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#grad-${color.replace('#', '')})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} />
      ))}
    </svg>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color, icon: Icon, trend }: any) {
  return (
    <div className="p-5 rounded-2xl border flex flex-col gap-2"
      style={{ background: 'rgba(15,23,42,0.8)', borderColor: 'rgba(255,255,255,0.07)' }}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400 uppercase font-mono tracking-wider">{label}</span>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: `${color}22` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-bold font-mono" style={{ color }}>{value}</span>
        {trend && (
          <span className="text-xs font-bold text-emerald-400 flex items-center gap-0.5">
            <ArrowUpRight className="w-3 h-3" />{trend}
          </span>
        )}
      </div>
      {sub && <p className="text-[11px] text-slate-500">{sub}</p>}
    </div>
  );
}

// ─── Channel colors map ───────────────────────────────────────────────────────
const CHANNEL_COLORS: Record<string, string> = {
  whatsapp: '#25d366', telegram: '#229ed9', fansly: '#00aff0',
  vipweb: '#eab308', manyvids: '#e91e63', pornhub: '#ff9000', scatbook: '#a855f7',
};

const WEEK_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTH_LABELS = ['S1', 'S2', 'S3', 'S4'];

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ channels }) => {
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('week');
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const loadSummary = async () => {
    setLoading(true);
    try {
      const auth = await import('../../services/authService');
      const token = typeof auth.getAccessToken === 'function' ? await auth.getAccessToken() : null;
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const r = await fetch(`/api/analytics/summary?range=${timeRange}`, { headers });
      if (r.ok) setSummary(await r.json());
    } catch (e) {
      console.error('[Analytics] Failed to load summary:', e);
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  };

  useEffect(() => { loadSummary(); }, [timeRange]);

  // ── Real data from Supabase — zero fake fallbacks ─────────────────────────
  const totalRevenue: number = summary?.totalRevenue ?? 0;
  const totalFans: number = summary?.totalFans ?? 0;
  const totalUnread: number = summary?.totalUnread ?? 0;
  const vipCount: number = summary?.vipCount ?? 0;
  const recurrenteCount: number = summary?.recurrenteCount ?? 0;
  const botManagedPct: number = summary?.botManagedPct ?? 0;

  // Channel revenue — real from DB, no fake demo data
  const rawChannels: any[] = summary?.channels ?? [];
  const channelRevenues = rawChannels
    .map((c: any) => ({
      id: c.id,
      name: c.name || (c.id.charAt(0).toUpperCase() + c.id.slice(1)),
      revenue: Number(c.today_revenue) || 0,
      color: c.color || CHANNEL_COLORS[c.id] || '#a855f7',
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const displayTotal = totalRevenue;
  const maxRev = channelRevenues.length > 0 ? Math.max(...channelRevenues.map(c => c.revenue), 1) : 1;

  // Trend arrays — real from API, always zeroes if DB is empty
  const rawRevenueTrend: number[] = summary?.revenueTrend ?? [];
  const rawMsgsTrend: number[] = summary?.messagesTrend ?? [];

  const trendLabels = timeRange === 'month' ? MONTH_LABELS : timeRange === 'today'
    ? ['-24h', '-20h', '-16h', '-12h', '-8h', '-4h']
    : WEEK_LABELS;
  const expectedLen = timeRange === 'month' ? 4 : timeRange === 'today' ? 6 : 7;
  const trendData = rawRevenueTrend.length === expectedLen ? rawRevenueTrend : Array(expectedLen).fill(0);
  const msgsByDay = rawMsgsTrend.length === expectedLen ? rawMsgsTrend : Array(expectedLen).fill(0);

  const msgBarData = trendLabels.map((label, i) => ({
    label,
    value: msgsByDay[i] ?? 0,
  }));

  // PPV Funnel — real from API
  const ppvFunnel = summary?.ppvFunnel ?? { suggested: 0, viewed: 0, purchased: 0, conversionRate: 0 };

  // Response Speed — real from API
  const responseSpeed = summary?.responseSpeed ?? { botAvgSeconds: null, botSamples: 0, creatorAvgMinutes: null, creatorSamples: 0 };

  // Retention cohorts — real from API (empty until we have enough data)
  const retentionCohorts: any[] = summary?.retentionCohorts ?? [];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden"
      style={{ background: '#020617' }}>

      {/* ── Header ── */}
      <div className="p-6 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(16px)' }}>
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-pink-400" />
            Analytics & Rendimiento
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Revenue por canal · Conversión PPV · Bot vs Creadora · Retención
            {!loading && (
              <span className="ml-2 text-slate-600">
                · Actualizado {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={loadSummary}
            className="p-2 rounded-xl border text-slate-400 hover:text-white transition-colors"
            style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)' }}
            title="Actualizar">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <div className="flex items-center gap-1 p-1 rounded-xl border text-xs"
            style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)' }}>
            {(['today', 'week', 'month'] as const).map(r => (
              <button key={r} onClick={() => setTimeRange(r)}
                className="px-3 py-1.5 rounded-lg capitalize transition-all duration-200"
                style={{
                  background: timeRange === r ? 'linear-gradient(135deg,#a855f7,#ec4899)' : 'transparent',
                  color: timeRange === r ? '#fff' : '#94a3b8',
                  fontWeight: timeRange === r ? 600 : 400,
                }}>
                {r === 'today' ? 'Hoy' : r === 'week' ? 'Semana' : 'Mes'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Revenue Total"
            value={`$${displayTotal.toLocaleString()}`}
            sub="Sumatoria de todos los canales"
            color="#34d399"
            icon={DollarSign}
          />
          <KpiCard
            label="Fans Totales"
            value={totalFans > 0 ? totalFans.toLocaleString() : '0'}
            sub={`${vipCount} VIP · ${recurrenteCount} Recurrentes`}
            color="#a78bfa"
            icon={Users}
          />
          <KpiCard
            label="Bot vs Creadora"
            value={botManagedPct > 0 ? `${botManagedPct}%` : '—'}
            sub={botManagedPct > 0 ? 'Mensajes manejados por bot' : 'Sin conversaciones aún'}
            color="#f472b6"
            icon={Bot}
          />
          <KpiCard
            label="No Leídos"
            value={totalUnread.toString()}
            sub="Mensajes pendientes en bandeja"
            color="#fb923c"
            icon={MessageCircle}
          />
        </div>

        {/* ── Revenue Trend + Messages/day ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Revenue trend area chart */}
          <div className="rounded-2xl border p-6"
            style={{ background: 'rgba(15,23,42,0.8)', borderColor: 'rgba(255,255,255,0.07)' }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Revenue por período</h3>
                <p className="text-xs text-slate-500">Tendencia de ingresos acumulados</p>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400">
                ${(trendData.reduce((a, b) => a + b, 0)).toLocaleString()} USD
              </span>
            </div>
            <AreaChartSvg data={trendData} color="#34d399" />
            {/* X axis labels */}
            <div className="flex justify-between mt-1">
              {trendLabels.map((l, i) => (
                <span key={i} className="text-[9px] text-slate-600 font-mono">{l}</span>
              ))}
            </div>
          </div>

          {/* Messages per day bar chart */}
          <div className="rounded-2xl border p-6"
            style={{ background: 'rgba(15,23,42,0.8)', borderColor: 'rgba(255,255,255,0.07)' }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Mensajes por día</h3>
                <p className="text-xs text-slate-500">Actividad de fans en todos los canales</p>
              </div>
              <span className="text-xs font-mono font-bold text-purple-400">
                {msgBarData.reduce((a, d) => a + d.value, 0).toLocaleString()} total
              </span>
            </div>
            <BarChartSvg data={msgBarData} color="#a855f7" />
          </div>
        </div>

        {/* ── Revenue by Channel ── */}
        <div className="rounded-2xl border p-6"
          style={{ background: 'rgba(15,23,42,0.8)', borderColor: 'rgba(255,255,255,0.07)' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-semibold text-white">Ingresos por Canal</h3>
              <p className="text-xs text-slate-500">Comparativa de facturación entre plataformas</p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-400">
              Total: ${displayTotal.toLocaleString()} USD
            </span>
          </div>
          {channelRevenues.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>Sin ingresos registrados aún</p>
              <p className="text-xs mt-1 text-slate-600">Los ingresos aparecerán aquí cuando haya compras en la base de datos</p>
            </div>
          ) : (
            <div className="space-y-4">
              {channelRevenues.map((ch) => {
                const pct = displayTotal > 0 ? Math.round((ch.revenue / maxRev) * 100) : 0;
                const share = displayTotal > 0 ? ((ch.revenue / displayTotal) * 100).toFixed(1) : '0.0';
                return (
                  <div key={ch.id}>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-white flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: ch.color }} />
                        {ch.name}
                      </span>
                      <div className="flex items-center gap-3 font-mono">
                        <span className="text-slate-400">{share}%</span>
                        <span className="font-bold text-white">${ch.revenue.toLocaleString()} USD</span>
                      </div>
                    </div>
                    <div className="w-full h-3 rounded-full overflow-hidden p-0.5 border"
                      style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: ch.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── PPV Funnel + Response Speed ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* PPV Funnel — real data */}
          <div className="rounded-2xl border p-6"
            style={{ background: 'rgba(15,23,42,0.8)', borderColor: 'rgba(255,255,255,0.07)' }}>
            <h3 className="text-sm font-semibold text-white mb-1">Embudo de Conversión PPV</h3>
            <p className="text-xs text-slate-500 mb-5">PPVs sugeridos por el bot → compra final</p>
            {ppvFunnel.suggested === 0 ? (
              <div className="text-center py-6 text-slate-500 text-sm">
                <Target className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>Sin PPVs enviados aún</p>
                <p className="text-xs mt-1 text-slate-600">Los datos aparecerán cuando el bot envíe contenido PPV</p>
              </div>
            ) : (
              <div className="space-y-3">
                {[
                  { step: '1. PPVs Sugeridos', value: ppvFunnel.suggested, pct: 100, color: '#a855f7' },
                  { step: '2. Teasers Vistos', value: ppvFunnel.viewed, pct: ppvFunnel.suggested > 0 ? Math.round((ppvFunnel.viewed / ppvFunnel.suggested) * 100 * 10) / 10 : 0, color: '#ec4899' },
                  { step: '3. Pagos Confirmados', value: ppvFunnel.purchased, pct: ppvFunnel.conversionRate, color: '#34d399' },
                ].map((s, i) => (
                  <div key={i} className="rounded-xl border p-3.5" style={{
                    marginLeft: i * 12,
                    borderColor: `${s.color}33`,
                    background: `${s.color}08`,
                  }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[11px] text-slate-400">{s.step}</p>
                        <p className="text-lg font-bold font-mono" style={{ color: s.color }}>{s.value.toLocaleString()}</p>
                      </div>
                      <span className="text-xs font-bold font-mono" style={{ color: s.color }}>{s.pct}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full mt-2" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full" style={{ width: `${s.pct}%`, background: s.color }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Response speed — real measured data */}
          <div className="rounded-2xl border p-6"
            style={{ background: 'rgba(15,23,42,0.8)', borderColor: 'rgba(255,255,255,0.07)' }}>
            <h3 className="text-sm font-semibold text-white mb-1">Velocidad de Respuesta</h3>
            <p className="text-xs text-slate-500 mb-5">Bot vs intervención manual de la creadora</p>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl border"
                style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#f472b618' }}>
                    <Bot className="w-5 h-5" style={{ color: '#f472b6' }} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">Bot (VelvetBot)</p>
                    <p className="text-[10px] text-slate-500">
                      {responseSpeed.botSamples > 0 ? `${responseSpeed.botSamples} respuestas medidas` : 'Sin datos aún'}
                    </p>
                  </div>
                </div>
                <span className="text-xl font-bold font-mono" style={{ color: '#f472b6' }}>
                  {responseSpeed.botAvgSeconds !== null ? `${responseSpeed.botAvgSeconds}s` : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl border"
                style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#a78bfa18' }}>
                    <UserCheck className="w-5 h-5" style={{ color: '#a78bfa' }} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">Creadora (manual)</p>
                    <p className="text-[10px] text-slate-500">
                      {responseSpeed.creatorSamples > 0 ? `${responseSpeed.creatorSamples} intervenciones medidas` : 'Sin datos aún'}
                    </p>
                  </div>
                </div>
                <span className="text-xl font-bold font-mono" style={{ color: '#a78bfa' }}>
                  {responseSpeed.creatorAvgMinutes !== null ? `${responseSpeed.creatorAvgMinutes}min` : '—'}
                </span>
              </div>
              <div className="p-3 rounded-xl border text-xs"
                style={{ background: 'rgba(236,72,153,0.06)', borderColor: 'rgba(236,72,153,0.2)', color: '#fda4af' }}>
                💡 <strong>Impacto:</strong> Respuesta en {'<'}10s → mayor probabilidad de compra PPV inmediata.
              </div>
            </div>
          </div>
        </div>

        {/* ── Retention Cohort Table — real data or empty state ── */}
        <div className="rounded-2xl border p-6"
          style={{ background: 'rgba(15,23,42,0.8)', borderColor: 'rgba(255,255,255,0.07)' }}>
          <h3 className="text-sm font-semibold text-white mb-1">Retención Mensual por Plataforma</h3>
          <p className="text-xs text-slate-500 mb-4">% de clientes que continúan comprando mes a mes</p>
          {retentionCohorts.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>Sin datos de retención aún</p>
              <p className="text-xs mt-1 text-slate-600">Este análisis requiere al menos 2 meses de actividad registrada en compras</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                    {['Plataforma', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'Tendencia'].map(h => (
                      <th key={h} className="p-3 text-slate-500 font-mono uppercase text-[10px] tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {retentionCohorts.map(({ platform, vals, color }: any) => (
                    <tr key={platform} className="border-b hover:bg-white/[0.02] transition-colors"
                      style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                      <td className="p-3 font-semibold text-white text-xs flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                        {platform}
                      </td>
                      {vals.map((v: number, i: number) => (
                        <td key={i} className="p-3 font-mono"
                          style={{ color: v >= 80 ? '#34d399' : v >= 60 ? '#facc15' : v >= 40 ? '#fb923c' : '#f87171' }}>
                          {v}%
                        </td>
                      ))}
                      <td className="p-3">
                        <AreaChartSvg data={vals} color={color} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Connected Channels Status ── */}
        {channels.length > 0 && (
          <div className="rounded-2xl border p-6"
            style={{ background: 'rgba(15,23,42,0.8)', borderColor: 'rgba(255,255,255,0.07)' }}>
            <h3 className="text-sm font-semibold text-white mb-4">Estado de Canales en Tiempo Real</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {channels.map(ch => (
                <div key={ch.id} className="p-3 rounded-xl border flex items-center gap-2"
                  style={{
                    borderColor: ch.status === 'connected' ? 'rgba(52,211,153,0.25)' : 'rgba(255,255,255,0.06)',
                    background: ch.status === 'connected' ? 'rgba(52,211,153,0.05)' : 'rgba(255,255,255,0.02)',
                  }}>
                  <div className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: ch.status === 'connected' ? '#34d399' : '#ef4444' }} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{ch.name}</p>
                    <p className="text-[10px] text-slate-500">
                      {ch.status === 'connected'
                        ? `${ch.latencyMs ?? 0}ms · ${ch.activeChatsCount ?? 0} chats`
                        : 'Sin conexión'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
