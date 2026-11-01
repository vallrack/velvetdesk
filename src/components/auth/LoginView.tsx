import React, { useState } from 'react';
import { login, register } from '../../services/authService';

interface LoginViewProps {
  onAuthSuccess: () => void;
}

export function LoginView({ onAuthSuccess }: LoginViewProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
        onAuthSuccess();
      } else {
        if (!name.trim()) { setError('El nombre es requerido.'); setLoading(false); return; }
        if (password.length < 6) { setError('La contraseña debe tener mínimo 6 caracteres.'); setLoading(false); return; }
        await register(email, password, name);
        setSuccess('✅ Cuenta creada. Verifica tu correo y luego inicia sesión.');
        setMode('login');
      }
    } catch (err: any) {
      setError(err.message || 'Error de autenticación.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-slate-950 flex items-center justify-center p-4"
      style={{ background: 'radial-gradient(ellipse at 60% 0%, rgba(168,85,247,0.15) 0%, transparent 60%), radial-gradient(ellipse at 0% 100%, rgba(236,72,153,0.1) 0%, transparent 60%), #020617' }}>

      {/* Decorative glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-[120px] pointer-events-none"
        style={{ background: 'rgba(168,85,247,0.18)' }} />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
              style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)' }}>
              💎
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold text-white tracking-tight">VelvetDesk</h1>
              <p className="text-xs text-slate-400">Omnichannel Creator Suite</p>
            </div>
          </div>
          <p className="text-slate-400 text-sm">
            {mode === 'login' ? 'Bienvenida de vuelta 💋' : 'Crea tu cuenta de creadora ✨'}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 p-8 shadow-2xl"
          style={{ background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(24px)' }}>

          {/* Tab Switcher */}
          <div className="flex rounded-xl p-1 mb-6 gap-1" style={{ background: 'rgba(255,255,255,0.05)' }}>
            {(['login', 'register'] as const).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null); setSuccess(null); }}
                className="flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                style={{
                  background: mode === m ? 'linear-gradient(135deg, #a855f7, #ec4899)' : 'transparent',
                  color: mode === m ? '#fff' : '#94a3b8',
                }}>
                {m === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Nombre artístico / Nombre de usuario</label>
                <input
                  id="auth-name"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="ej. Valentina Cruz"
                  required
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-500 border border-white/10 outline-none transition-all duration-200 focus:border-purple-500/60"
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Correo electrónico</label>
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                required
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-500 border border-white/10 outline-none transition-all duration-200 focus:border-purple-500/60"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Contraseña</label>
              <input
                id="auth-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={mode === 'register' ? 'Mínimo 6 caracteres' : '••••••••'}
                required
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-500 border border-white/10 outline-none transition-all duration-200 focus:border-purple-500/60"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-xl border border-red-500/30 text-red-400 text-xs"
                style={{ background: 'rgba(239,68,68,0.08)' }}>
                <span className="mt-0.5">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-start gap-2 p-3 rounded-xl border border-emerald-500/30 text-emerald-400 text-xs"
                style={{ background: 'rgba(16,185,129,0.08)' }}>
                <span>{success}</span>
              </div>
            )}

            <button
              id="auth-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              style={{
                background: loading
                  ? 'rgba(168,85,247,0.4)'
                  : 'linear-gradient(135deg, #a855f7, #ec4899)',
                boxShadow: loading ? 'none' : '0 4px 24px rgba(168,85,247,0.4)',
              }}>
              {loading
                ? (mode === 'login' ? 'Iniciando sesión...' : 'Creando cuenta...')
                : (mode === 'login' ? '✨ Entrar al Panel' : '🚀 Crear mi Cuenta')}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-600 mt-6">
          VelvetDesk © {new Date().getFullYear()} · Plataforma segura para creadoras de contenido
        </p>
      </div>
    </div>
  );
}
