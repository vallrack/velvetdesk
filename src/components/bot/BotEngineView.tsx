import React, { useState, useEffect } from 'react';
import {
  Bot,
  Sparkles,
  Zap,
  Sliders,
  HelpCircle,
  Plus,
  Trash2,
  Check,
  Play,
  RotateCcw,
  MessageSquare,
  ShieldAlert,
  ArrowRight,
  ClipboardList,
  RefreshCw,
  Volume2,
  Search,
  Filter,
  AlertCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { BotPersona, BotRule, FAQItem, VaultItem, BotAuditLog } from '../../types';
import { requestBotReply } from '../../services/geminiService';
import { fetchBotAuditLogs, clearBotAuditLogs } from '../../services/apiService';

interface BotEngineViewProps {
  persona: BotPersona;
  rules: BotRule[];
  faqs: FAQItem[];
  vaultItems: VaultItem[];
  onUpdatePersona: (persona: BotPersona) => void;
  onUpdateRules: (rules: BotRule[]) => void;
  onUpdateFaqs: (faqs: FAQItem[]) => void;
}

export const BotEngineView: React.FC<BotEngineViewProps> = ({
  persona,
  rules,
  faqs,
  vaultItems,
  onUpdatePersona,
  onUpdateRules,
  onUpdateFaqs,
}) => {
  const [activeTab, setActiveTab] = useState<'persona' | 'rules' | 'faqs' | 'test' | 'audit'>('persona');

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<BotAuditLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditPlatformFilter, setAuditPlatformFilter] = useState<string>('all');
  const [auditTypeFilter, setAuditTypeFilter] = useState<'all' | 'voice' | 'text'>('all');

  const loadAuditLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const logs = await fetchBotAuditLogs();
      setAuditLogs(logs || []);
    } catch (e) {
      console.error('Error fetching bot audit logs:', e);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'audit') {
      loadAuditLogs();
    }
  }, [activeTab]);

  const handleClearLogs = async () => {
    if (!window.confirm('¿Seguro que deseas vaciar el historial de logs del bot?')) return;
    try {
      await clearBotAuditLogs();
      setAuditLogs([]);
    } catch (e) {
      console.error('Error clearing audit logs:', e);
    }
  };

  // Local state for persona
  const [currentPersona, setCurrentPersona] = useState<BotPersona>(persona);
  const [savedPersona, setSavedPersona] = useState(false);

  // New Rule form state
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleTriggers, setNewRuleTriggers] = useState('');
  const [newRuleReply, setNewRuleReply] = useState('');
  const [newRuleAction, setNewRuleAction] = useState<BotRule['actionType']>('reply_text');
  const [newRuleTargetPpv, setNewRuleTargetPpv] = useState('');
  const [showAddRule, setShowAddRule] = useState(false);

  // New FAQ form state
  const [newFaqQuestion, setNewFaqQuestion] = useState('');
  const [newFaqTriggers, setNewFaqTriggers] = useState('');
  const [newFaqAnswer, setNewFaqAnswer] = useState('');
  const [newFaqCategory, setNewFaqCategory] = useState<FAQItem['category']>('precios');
  const [showAddFaq, setShowAddFaq] = useState(false);

  // Live Test Playground state
  const [testInput, setTestInput] = useState('');
  const [testResponses, setTestResponses] = useState<
    { sender: 'user' | 'bot'; text: string; intent?: string }[]
  >([]);
  const [isTesting, setIsTesting] = useState(false);

  const handleSavePersona = () => {
    onUpdatePersona(currentPersona);
    setSavedPersona(true);
    setTimeout(() => setSavedPersona(false), 2000);
  };

  const handleToggleRule = (id: string) => {
    const updated = rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r));
    onUpdateRules(updated);
  };

  const handleDeleteRule = (id: string) => {
    onUpdateRules(rules.filter((r) => r.id !== id));
  };

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName.trim() || !newRuleTriggers.trim() || !newRuleReply.trim()) return;

    const triggers = newRuleTriggers
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const newRule: BotRule = {
      id: `rule-${Date.now()}`,
      name: newRuleName,
      enabled: true,
      triggers,
      actionType: newRuleAction,
      replyContent: newRuleReply,
      targetPpvId: newRuleTargetPpv || undefined,
    };

    onUpdateRules([...rules, newRule]);
    setNewRuleName('');
    setNewRuleTriggers('');
    setNewRuleReply('');
    setShowAddRule(false);
  };

  const handleToggleFaq = (id: string) => {
    const updated = faqs.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f));
    onUpdateFaqs(updated);
  };

  const handleDeleteFaq = (id: string) => {
    onUpdateFaqs(faqs.filter((f) => f.id !== id));
  };

  const handleAddFaq = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFaqQuestion.trim() || !newFaqAnswer.trim()) return;

    const triggers = newFaqTriggers
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const newFaq: FAQItem = {
      id: `faq-${Date.now()}`,
      question: newFaqQuestion,
      triggers: triggers.length > 0 ? triggers : [newFaqQuestion.toLowerCase()],
      answer: newFaqAnswer,
      category: newFaqCategory,
      enabled: true,
    };

    onUpdateFaqs([...faqs, newFaq]);
    setNewFaqQuestion('');
    setNewFaqTriggers('');
    setNewFaqAnswer('');
    setShowAddFaq(false);
  };

  const handleRunTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testInput.trim() || isTesting) return;

    const userText = testInput.trim();
    setTestResponses((prev) => [...prev, { sender: 'user', text: userText }]);
    setTestInput('');
    setIsTesting(true);

    try {
      const res = await requestBotReply({
        fanName: 'Fan de Prueba',
        fanTier: 'vip',
        platform: 'whatsapp',
        persona: currentPersona,
        rules,
        messages: testResponses.map((r, i) => ({
          id: `t-${i}`,
          chatId: 'test-chat',
          sender: r.sender === 'user' ? 'fan' : 'bot',
          text: r.text,
          timestamp: 'Ahora',
        })),
        vaultMenu: vaultItems,
      });

      setTestResponses((prev) => [
        ...prev,
        { sender: 'bot', text: res.reply, intent: res.intent },
      ]);
    } catch (err: any) {
      setTestResponses((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: err?.message || 'Error al conectar con el motor de IA. Verifica tu configuración.',
        },
      ]);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
      {/* Top Header */}
      <div className="p-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Bot className="w-5 h-5 text-pink-400" />
              Motor de Bot y Respuestas Automáticas (IA / Reglas)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              RF2.1 a RF2.3: Configura el tono de voz de la creadora, disparadores de compra PPV, up-selling y preguntas frecuentes.
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs overflow-x-auto max-w-full scrollbar-none shrink-0">
            <button
              onClick={() => setActiveTab('persona')}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'persona' ? 'bg-pink-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              🎭 Personalidad
            </button>
            <button
              onClick={() => setActiveTab('rules')}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'rules' ? 'bg-pink-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              ⚡ Reglas ({rules.length})
            </button>
            <button
              onClick={() => setActiveTab('faqs')}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'faqs' ? 'bg-pink-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              ❓ FAQs ({faqs.length})
            </button>
            <button
              onClick={() => setActiveTab('test')}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'test' ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white' : 'text-pink-400 hover:text-white'
              }`}
            >
              ✨ Simulador
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'audit' ? 'bg-pink-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              Auditoría & Logs
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* TAB 1: PERSONALITY & TONE */}
        {activeTab === 'persona' && (
          <div className="max-w-4xl space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
              <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-pink-400" />
                Arquetipo y Tono de Voz de la Creadora (RF2.1)
              </h3>

              {/* Tone Presets */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  {
                    id: 'coqueta',
                    title: 'Coqueta & Juguetona',
                    desc: 'Usa piropos dulces, emojis sugestivos (💋, 🔥, ✨), trato cercano y picardía.',
                  },
                  {
                    id: 'dominante',
                    title: 'Dominante / Femdom',
                    desc: 'Tono seguro, exige adoración, lenguaje directo, sin titubeos ni ruegos.',
                  },
                  {
                    id: 'dulce',
                    title: 'Dulce & Cariñosa',
                    desc: 'Cálida, tierna, atenta a cómo está su día, apodos amorosos y ternura.',
                  },
                  {
                    id: 'sofisticada',
                    title: 'Sofisticada & Exclusiva',
                    desc: 'Misteriosa, elegante, orientada a compradores de alto ticket y contenido VIP.',
                  },
                  {
                    id: 'personalizada',
                    title: 'Personalizada a Medida',
                    desc: 'Configuración 100% libre basada en el prompt de la creadora.',
                  },
                ].map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() =>
                      setCurrentPersona({
                        ...currentPersona,
                        tone: preset.id as any,
                        toneLabel: preset.title,
                      })
                    }
                    className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                      currentPersona.tone === preset.id
                        ? 'border-pink-500 bg-pink-500/10 text-white ring-1 ring-pink-500/50'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <h4 className="font-semibold text-white text-xs">{preset.title}</h4>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{preset.desc}</p>
                  </button>
                ))}
              </div>

              {/* System Prompt for Gemini */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Prompt del Sistema / Instrucciones para el Bot Gemini
                </label>
                <textarea
                  rows={4}
                  value={currentPersona.customSystemPrompt}
                  onChange={(e) =>
                    setCurrentPersona({ ...currentPersona, customSystemPrompt: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-pink-500/60 font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Este prompt guía a Gemini para responder exactamente como tú lo harías en un chat de mensajería.
                </p>
              </div>

              {/* Humanization & Up-selling settings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                <div className="space-y-3">
                  <label className="flex items-center justify-between text-xs text-slate-300">
                    <span>Uso natural de Emojis</span>
                    <input
                      type="checkbox"
                      checked={currentPersona.useEmojis}
                      onChange={(e) =>
                        setCurrentPersona({ ...currentPersona, useEmojis: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-pink-600 bg-slate-950 border-slate-700"
                    />
                  </label>

                  <label className="flex items-center justify-between text-xs text-slate-300">
                    <div>
                      <span>Pausar bot al intervenir manualmente</span>
                      <p className="text-[10px] text-slate-500">RF1.4: Evita colisiones si la creadora escribe</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={currentPersona.autoPauseOnCreatorReply}
                      onChange={(e) =>
                        setCurrentPersona({
                          ...currentPersona,
                          autoPauseOnCreatorReply: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded text-pink-600 bg-slate-950 border-slate-700"
                    />
                  </label>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                      <span>Retardo de Escritura Humanizado</span>
                      <span className="font-mono text-pink-400 font-bold">
                        {currentPersona.humanTypingDelaySeconds}s
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="6"
                      step="0.5"
                      value={currentPersona.humanTypingDelaySeconds}
                      onChange={(e) =>
                        setCurrentPersona({
                          ...currentPersona,
                          humanTypingDelaySeconds: Number(e.target.value),
                        })
                      }
                      className="w-full accent-pink-500"
                    />
                  </div>

                  <label className="flex items-center justify-between text-xs text-slate-300">
                    <div>
                      <span>Up-selling automático activado</span>
                      <p className="text-[10px] text-slate-500">
                        RF2.2: Ofrecer bundles y audios complementarios
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={currentPersona.autoUpsellEnabled}
                      onChange={(e) =>
                        setCurrentPersona({ ...currentPersona, autoUpsellEnabled: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-pink-600 bg-slate-950 border-slate-700"
                    />
                  </label>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleSavePersona}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-medium text-xs flex items-center gap-2 shadow-lg shadow-pink-600/25 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  {savedPersona ? '¡Personalidad Guardada!' : 'Guardar Configuración de Personalidad'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CONDITIONAL RULES */}
        {activeTab === 'rules' && (
          <div className="max-w-4xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white text-sm">
                  Reglas Condicionadas & Disparadores de Venta (RF2.1, RF2.2)
                </h3>
                <p className="text-xs text-slate-400">
                  Detecta palabras clave específicas en cualquier chat y ejecuta la acción correspondiente.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddRule(!showAddRule)}
                className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-md shadow-pink-600/20"
              >
                <Plus className="w-3.5 h-3.5" /> Nueva Regla
              </button>
            </div>

            {/* Add rule form */}
            {showAddRule && (
              <form
                onSubmit={handleAddRule}
                className="p-5 bg-slate-900 border border-pink-500/40 rounded-2xl space-y-4"
              >
                <h4 className="font-semibold text-white text-xs">Crear Nueva Regla de Automatización</h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Nombre de la Regla</label>
                    <input
                      type="text"
                      placeholder="Ej. Disparador de Video Especial"
                      value={newRuleName}
                      onChange={(e) => setNewRuleName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500/60"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Acción del Bot
                    </label>
                    <select
                      value={newRuleAction}
                      onChange={(e) => setNewRuleAction(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500/60"
                    >
                      <option value="reply_text">Responder con texto personalizado</option>
                      <option value="send_ppv">Enviar tarjeta de compra PPV</option>
                      <option value="send_payment_link">Enviar enlaces de pago externos</option>
                      <option value="notify_creator">Notificar a la creadora</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Palabras Clave / Triggers (Separadas por comas)
                  </label>
                  <input
                    type="text"
                    placeholder="ej. precio, cuanto, costo, menu, catalogo"
                    value={newRuleTriggers}
                    onChange={(e) => setNewRuleTriggers(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500/60"
                  />
                </div>

                {newRuleAction === 'send_ppv' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Contenido PPV a Ofrecer
                    </label>
                    <select
                      value={newRuleTargetPpv}
                      onChange={(e) => setNewRuleTargetPpv(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500/60"
                    >
                      <option value="">Selecciona contenido del Vault...</option>
                      {vaultItems.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.title} (${v.price} USD)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Texto de Respuesta de la Creadora
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Texto que enviará el bot automáticamente..."
                    value={newRuleReply}
                    onChange={(e) => setNewRuleReply(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-pink-500/60"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddRule(false)}
                    className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-medium bg-pink-600 hover:bg-pink-500 text-white rounded-xl shadow-md"
                  >
                    Guardar Regla
                  </button>
                </div>
              </form>
            )}

            {/* Rules List */}
            <div className="space-y-3">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    rule.enabled
                      ? 'bg-slate-900 border-slate-800'
                      : 'bg-slate-950 border-slate-900 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-xs">{rule.name}</span>
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-pink-500/10 text-pink-400 border border-pink-500/20">
                          {rule.actionType}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {rule.triggers.map((t) => (
                          <span
                            key={t}
                            className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono"
                          >
                            "{t}"
                          </span>
                        ))}
                      </div>

                      <p className="text-xs text-slate-300 italic bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/60">
                        "{rule.replyContent}"
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rule.enabled}
                          onChange={() => handleToggleRule(rule.id)}
                          className="w-4 h-4 rounded text-pink-600 bg-slate-950 border-slate-700"
                        />
                        <span>{rule.enabled ? 'Activa' : 'Inactiva'}</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleDeleteRule(rule.id)}
                        className="text-slate-500 hover:text-rose-400 p-1 rounded cursor-pointer"
                        title="Eliminar regla"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: FAQS */}
        {activeTab === 'faqs' && (
          <div className="max-w-4xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white text-sm">
                  Preguntas Frecuentes Automatizadas (RF2.3)
                </h3>
                <p className="text-xs text-slate-400">
                  Precios de suscripción, políticas de customs, horarios y reglas de interacción.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddFaq(!showAddFaq)}
                className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-md shadow-pink-600/20"
              >
                <Plus className="w-3.5 h-3.5" /> Nueva FAQ
              </button>
            </div>

            {/* Add FAQ form */}
            {showAddFaq && (
              <form
                onSubmit={handleAddFaq}
                className="p-5 bg-slate-900 border border-pink-500/40 rounded-2xl space-y-4"
              >
                <h4 className="font-semibold text-white text-xs">Crear Nueva Respuesta Frecuente</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Pregunta / Tema</label>
                    <input
                      type="text"
                      placeholder="Ej. ¿Haces videollamadas privadas?"
                      value={newFaqQuestion}
                      onChange={(e) => setNewFaqQuestion(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500/60"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Categoría</label>
                    <select
                      value={newFaqCategory}
                      onChange={(e) => setNewFaqCategory(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500/60"
                    >
                      <option value="precios">Precios</option>
                      <option value="customs">Customs / Personalizados</option>
                      <option value="pagos">Pagos</option>
                      <option value="reglas">Reglas y Límites</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Disparadores (Triggers de palabras clave)
                  </label>
                  <input
                    type="text"
                    placeholder="ej. videollamada, cam2cam, llamada en vivo"
                    value={newFaqTriggers}
                    onChange={(e) => setNewFaqTriggers(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500/60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Respuesta de la Creadora
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Respuesta detallada y amable con los límites de la creadora..."
                    value={newFaqAnswer}
                    onChange={(e) => setNewFaqAnswer(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-pink-500/60"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddFaq(false)}
                    className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-medium bg-pink-600 hover:bg-pink-500 text-white rounded-xl shadow-md"
                  >
                    Guardar FAQ
                  </button>
                </div>
              </form>
            )}

            {/* FAQs List */}
            <div className="space-y-3">
              {faqs.map((faq) => (
                <div
                  key={faq.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    faq.enabled
                      ? 'bg-slate-900 border-slate-800'
                      : 'bg-slate-950 border-slate-900 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-xs">{faq.question}</span>
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          {faq.category}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {faq.triggers.map((t) => (
                          <span
                            key={t}
                            className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono"
                          >
                            "{t}"
                          </span>
                        ))}
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/60">
                        {faq.answer}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={faq.enabled}
                          onChange={() => handleToggleFaq(faq.id)}
                          className="w-4 h-4 rounded text-pink-600 bg-slate-950 border-slate-700"
                        />
                        <span>{faq.enabled ? 'Activa' : 'Inactiva'}</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleDeleteFaq(faq.id)}
                        className="text-slate-500 hover:text-rose-400 p-1 rounded cursor-pointer"
                        title="Eliminar FAQ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: LIVE SIMULATOR */}
        {activeTab === 'test' && (
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                  <Play className="w-4 h-4 text-emerald-400" />
                  Simulador de Conversación en Tiempo Real
                </h3>
                <p className="text-xs text-slate-400">
                  Escribe como si fueras un fan para verificar el tono, la oferta de PPV y las respuestas del bot.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTestResponses([])}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Limpiar chat
              </button>
            </div>

            {/* Chat Box */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 min-h-[350px] max-h-[480px] overflow-y-auto space-y-3">
              {testResponses.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                  <Bot className="w-8 h-8 text-slate-600 mb-2" />
                  <p className="text-xs font-medium text-slate-400">Sandbox de prueba listo</p>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-sm">
                    Escribe un mensaje abajo simulando ser un fan para probar en vivo cómo responderá tu bot según tu personalidad y catálogo.
                  </p>
                </div>
              ) : (
                testResponses.map((r, i) => (
                  <div
                    key={i}
                    className={`flex flex-col ${r.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <span className="text-[10px] text-slate-500 mb-1 px-1">
                      {r.sender === 'user' ? 'Fan (Tú)' : '🤖 VelvetBot'}
                    </span>
                    <div
                      className={`max-w-md rounded-2xl p-3 text-xs leading-relaxed ${
                        r.sender === 'user'
                          ? 'bg-slate-800 text-white rounded-tr-sm'
                          : 'bg-gradient-to-br from-pink-950/80 to-purple-950/80 border border-pink-500/30 text-pink-100 rounded-tl-sm'
                      }`}
                    >
                      {r.text}
                      {r.intent && (
                        <span className="block mt-1 text-[9px] uppercase font-mono text-pink-400 font-bold">
                          Intención: {r.intent}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
              {isTesting && (
                <div className="flex items-center gap-2 text-xs text-pink-400">
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  <span>VelvetBot está escribiendo...</span>
                </div>
              )}
            </div>

            {/* Input Bar */}
            <form onSubmit={handleRunTest} className="flex items-center gap-2">
              <input
                type="text"
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                placeholder="Escribe como fan (ej. 'Cuánto vale el video largo?', 'Haces customs?')..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-pink-500/60"
              />
              <button
                type="submit"
                disabled={isTesting || !testInput.trim()}
                className="px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-medium text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Probar
              </button>
            </form>
          </div>
        )}

        {/* TAB 5: AUDIT LOGS & DECISION TRAIL */}
        {activeTab === 'audit' && (
          <div className="max-w-6xl space-y-6">
            {/* Header & Controls */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-pink-400" />
                    Registro de Auditoría & Decisiones del Bot (RF-Audit)
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Supervisa en tiempo real qué respondió la IA, cuándo, a quién, latencias del modelo y activación de notas de voz.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={loadAuditLogs}
                    disabled={isLoadingLogs}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                    title="Actualizar registro"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                    Actualizar
                  </button>
                  <button
                    onClick={handleClearLogs}
                    disabled={auditLogs.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-red-300 rounded-xl text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                    title="Limpiar registro"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Limpiar
                  </button>
                </div>
              </div>

              {/* Quick KPI stats */}
              {(() => {
                const totalLogs = auditLogs.length;
                const voiceCount = auditLogs.filter((l) => l.isVoice).length;
                const avgLatency =
                  totalLogs > 0
                    ? Math.round(auditLogs.reduce((acc, l) => acc + (l.latencyMs || 0), 0) / totalLogs)
                    : 0;
                const buyPpvCount = auditLogs.filter((l) => l.intent === 'BUY_PPV').length;

                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">Decisiones Totales</span>
                      <span className="text-base font-bold text-white font-mono mt-0.5 block">{totalLogs}</span>
                    </div>
                    <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">Notas de Voz</span>
                      <span className="text-base font-bold text-pink-400 font-mono mt-0.5 block">
                        {voiceCount} ({totalLogs > 0 ? Math.round((voiceCount / totalLogs) * 100) : 0}%)
                      </span>
                    </div>
                    <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">Latencia Media</span>
                      <span className="text-base font-bold text-emerald-400 font-mono mt-0.5 block">
                        {avgLatency} ms
                      </span>
                    </div>
                    <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">Ofertas PPV</span>
                      <span className="text-base font-bold text-amber-400 font-mono mt-0.5 block">
                        {buyPpvCount} veces
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Filters */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/60">
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={auditPlatformFilter}
                    onChange={(e) => setAuditPlatformFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-pink-500 cursor-pointer"
                  >
                    <option value="all">Todas las plataformas</option>
                    <option value="onlyfans">OnlyFans</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="telegram">Telegram</option>
                    <option value="fansly">Fansly</option>
                    <option value="manyvids">ManyVids</option>
                  </select>

                  <select
                    value={auditTypeFilter}
                    onChange={(e) => setAuditTypeFilter(e.target.value as any)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-pink-500 cursor-pointer"
                  >
                    <option value="all">Todos los formatos</option>
                    <option value="voice">🎙️ Con Nota de Voz</option>
                    <option value="text">💬 Solo Texto</option>
                  </select>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Buscar por fan, mensaje, respuesta..."
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-pink-500 placeholder:text-slate-500"
                  />
                </div>
              </div>
            </div>

            {/* Audit Log Entries List */}
            {(() => {
              const filteredLogs = auditLogs.filter((log) => {
                const q = auditSearch.toLowerCase();
                const matchSearch =
                  log.fanName.toLowerCase().includes(q) ||
                  log.incomingText.toLowerCase().includes(q) ||
                  log.botReply.toLowerCase().includes(q) ||
                  (log.intent && log.intent.toLowerCase().includes(q));
                const matchPlatform =
                  auditPlatformFilter === 'all' || log.platform.toLowerCase() === auditPlatformFilter;
                const matchType =
                  auditTypeFilter === 'all' ||
                  (auditTypeFilter === 'voice' && log.isVoice) ||
                  (auditTypeFilter === 'text' && !log.isVoice);
                return matchSearch && matchPlatform && matchType;
              });

              if (filteredLogs.length === 0) {
                return (
                  <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 text-xs space-y-2">
                    <ClipboardList className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="font-medium text-slate-300">Sin registros de auditoría que coincidan.</p>
                    <p className="text-slate-500">
                      Los eventos se generarán automáticamente cuando el bot responda mensajes en WhatsApp, Telegram o el simulador.
                    </p>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {filteredLogs.map((log) => (
                    <div
                      key={log.id}
                      className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition-all space-y-3"
                    >
                      {/* Top Meta Row */}
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white">{log.fanName}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/10 border border-pink-500/30 text-pink-300 font-mono uppercase">
                            {log.fanTier}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono uppercase">
                            {log.platform}
                          </span>
                          {log.intent && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono">
                              Intención: {log.intent}
                            </span>
                          )}
                          {log.isVoice && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 font-mono flex items-center gap-1 font-semibold">
                              <Volume2 className="w-3 h-3 text-purple-400" />
                              Audio Clonado
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-slate-500 font-mono text-[11px]">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              log.latencyMs < 1200
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : 'bg-amber-950 text-amber-400 border border-amber-800'
                            }`}
                          >
                            {log.latencyMs} ms
                          </span>
                        </div>
                      </div>

                      {/* Messages Comparison */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs">
                        {/* Fan Prompt */}
                        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 space-y-1">
                          <span className="text-[10px] font-mono uppercase text-slate-400 block font-semibold">
                            Mensaje Entrante del Fan
                          </span>
                          <p className="text-slate-200 leading-relaxed italic">
                            "{log.incomingText || 'Sin texto inicial'}"
                          </p>
                        </div>

                        {/* Bot Reply */}
                        <div className="bg-pink-950/20 p-3 rounded-xl border border-pink-500/20 space-y-1">
                          <span className="text-[10px] font-mono uppercase text-pink-400 block font-semibold flex items-center justify-between">
                            <span>Respuesta Generada por VelvetBot</span>
                            <span className="text-[9px] text-slate-400 font-normal">{log.modelUsed}</span>
                          </span>
                          <p className="text-pink-100 leading-relaxed font-normal">
                            {log.botReply}
                          </p>
                          {log.suggestedPpvId && (
                            <span className="inline-block mt-1 text-[10px] text-amber-300 font-mono">
                              ⭐ Contenido PPV sugerido: {log.suggestedPpvId}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};
