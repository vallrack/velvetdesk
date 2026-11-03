import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Bot,
  PlayCircle,
  Menu,
  LogOut,
  Bell,
  Volume2,
  VolumeX,
  Radio,
  CheckCircle2,
  MessageSquare,
  DollarSign,
  Lock,
  Clock,
  X,
} from 'lucide-react';
import { ChannelIntegration, AppNotification, PlatformId } from '../../types';
import { PlatformBadge } from '../common/PlatformBadge';
import type { AuthUser } from '../../services/authService';

interface NavbarProps {
  channels: ChannelIntegration[];
  isGlobalBotActive: boolean;
  onToggleGlobalBot: () => void;
  onOpenSimulateModal: () => void;
  onOpenMobileMenu: () => void;
  todayTotalRevenue: number;
  unreadCount: number;
  authUser?: AuthUser | null;
  onLogout?: () => void;
  notifications?: AppNotification[];
  onSelectNotification?: (notification: AppNotification) => void;
  onClearNotifications?: () => void;
  isSoundEnabled?: boolean;
  onToggleSound?: () => void;
  onOpenWebhooksModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  channels,
  isGlobalBotActive,
  onToggleGlobalBot,
  onOpenSimulateModal,
  onOpenMobileMenu,
  todayTotalRevenue,
  unreadCount,
  authUser,
  onLogout,
  notifications = [],
  onSelectNotification,
  onClearNotifications,
  isSoundEnabled = true,
  onToggleSound,
  onOpenWebhooksModal,
}) => {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadNotifCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-950 px-3 sm:px-6 flex items-center justify-between shrink-0 z-30 relative">
      {/* Brand & Status */}
      <div className="flex items-center gap-3 sm:gap-6">
        {/* Hamburger on mobile */}
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-900 border border-slate-800"
          title="Abrir menú"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-pink-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-pink-500/20 shrink-0">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-white text-sm sm:text-base tracking-tight font-sans">
                Velvet<span className="text-pink-500">Desk</span>
              </span>
              <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-pink-500/10 text-pink-400 border border-pink-500/20">
                Creator Suite
              </span>
            </div>
            <p className="text-[9px] sm:text-[10px] text-slate-400 font-mono">Omnichannel Bot & CRM</p>
          </div>
        </div>

        {/* 7 Channel Status Indicators (desktop only) */}
        <div className="hidden xl:flex items-center gap-1.5 bg-slate-900/80 border border-slate-800 p-1 rounded-xl">
          {channels.map((ch) => (
            <div
              key={ch.id}
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono text-slate-300"
              title={`${ch.name}: ${ch.status}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>{ch.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Webhooks Monitor Quick Button */}
        {onOpenWebhooksModal && (
          <button
            onClick={onOpenWebhooksModal}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-pink-500/40 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Ver Webhooks y eventos de canales"
          >
            <Radio className="w-4 h-4 text-pink-400" />
            <span className="hidden md:inline">Webhooks</span>
          </button>
        )}

        {/* Notification Bell Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className={`p-2 rounded-xl border transition-all cursor-pointer relative ${
              isNotifOpen
                ? 'bg-pink-600 text-white border-pink-500'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800'
            }`}
            title="Centro de Notificaciones en Vivo"
          >
            <Bell className="w-4 h-4" />
            {(unreadCount > 0 || unreadNotifCount > 0) && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-pink-500 text-white text-[9px] font-bold flex items-center justify-center animate-pulse shadow-md shadow-pink-500/50">
                {unreadNotifCount || unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Menu */}
          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
              {/* Header */}
              <div className="p-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-xs flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-pink-400" />
                    Notificaciones en Vivo
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" title="Supabase Realtime activo" />
                </div>
                <div className="flex items-center gap-2">
                  {onToggleSound && (
                    <button
                      onClick={onToggleSound}
                      className={`p-1 rounded-lg text-xs cursor-pointer transition-colors ${
                        isSoundEnabled ? 'text-pink-400 hover:text-pink-300' : 'text-slate-500 hover:text-slate-400'
                      }`}
                      title={isSoundEnabled ? 'Sonido activado (clic para silenciar)' : 'Sonido silenciado (clic para activar)'}
                    >
                      {isSoundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                    </button>
                  )}
                  {notifications.length > 0 && onClearNotifications && (
                    <button
                      onClick={onClearNotifications}
                      className="text-[10px] text-slate-400 hover:text-pink-400 cursor-pointer"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
              </div>

              {/* Notifications List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs space-y-1">
                    <p className="font-semibold text-slate-400">Todo al día</p>
                    <p className="text-[11px]">Los nuevos mensajes y eventos de webhooks aparecerán aquí en tiempo real.</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        onSelectNotification?.(notif);
                        setIsNotifOpen(false);
                      }}
                      className={`p-3 flex items-start gap-3 cursor-pointer transition-colors hover:bg-slate-800/50 ${
                        !notif.read ? 'bg-slate-950/40' : ''
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700 mt-0.5 overflow-hidden">
                        {notif.fanAvatar ? (
                          <img src={notif.fanAvatar} alt="" className="w-full h-full object-cover" />
                        ) : notif.type === 'payment' ? (
                          <DollarSign className="w-4 h-4 text-emerald-400" />
                        ) : notif.type === 'ppv_unlock' ? (
                          <Lock className="w-4 h-4 text-amber-400" />
                        ) : notif.type === 'bot_reply' ? (
                          <Bot className="w-4 h-4 text-pink-400" />
                        ) : (
                          <MessageSquare className="w-4 h-4 text-purple-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="font-semibold text-white text-xs truncate">
                            {notif.title}
                          </span>
                          <span className="text-[9px] text-slate-500 font-mono shrink-0">
                            {notif.timestamp}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 truncate">
                          {notif.description}
                        </p>
                        {notif.platform && (
                          <div className="mt-1">
                            <PlatformBadge platform={notif.platform} size="sm" />
                          </div>
                        )}
                      </div>
                      {!notif.read && (
                        <span className="w-2 h-2 rounded-full bg-pink-500 shrink-0 mt-1.5" />
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Dropdown Footer */}
              <div className="p-2.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Supabase Realtime
                </span>
                {onOpenWebhooksModal && (
                  <button
                    onClick={() => {
                      setIsNotifOpen(false);
                      onOpenWebhooksModal();
                    }}
                    className="text-pink-400 hover:text-pink-300 font-medium cursor-pointer"
                  >
                    Ver Webhooks →
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Simulate Incoming Message Button */}
        <button
          onClick={onOpenSimulateModal}
          className="px-2.5 sm:px-3.5 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-semibold text-xs flex items-center gap-1.5 sm:gap-2 shadow-lg shadow-pink-600/20 cursor-pointer transition-all active:scale-95"
          title="Probar llegada de mensaje en cualquiera de los 7 canales"
        >
          <PlayCircle className="w-4 h-4 fill-current shrink-0" />
          <span className="hidden md:inline">Simular Mensaje</span>
          <span className="md:hidden text-[11px]">Simular</span>
        </button>

        {/* Master Bot Switch */}
        <button
          onClick={onToggleGlobalBot}
          className={`px-2.5 sm:px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 sm:gap-2 border transition-all cursor-pointer ${
            isGlobalBotActive
              ? 'bg-pink-950/40 border-pink-500/40 text-pink-300'
              : 'bg-slate-900 border-slate-800 text-slate-500'
          }`}
          title="Interruptor maestro del bot para todos los canales"
        >
          <Bot className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">Bot:</span>
          <span
            className={`font-mono uppercase font-bold text-[10px] px-1.5 py-0.5 rounded ${
              isGlobalBotActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
            }`}
          >
            {isGlobalBotActive ? 'ON' : 'OFF'}
          </span>
        </button>

        {/* Today's Revenue */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
          <span className="text-[10px] uppercase font-mono text-slate-400">Hoy:</span>
          <span className="font-mono font-bold text-emerald-400">
            ${todayTotalRevenue.toFixed(2)}
          </span>
        </div>

        {/* User Avatar + Logout */}
        {authUser && (
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)' }}
              >
                {authUser.email?.[0]?.toUpperCase() || '?'}
              </div>
              <span className="text-[11px] text-slate-300 font-mono max-w-[120px] truncate">
                {authUser.email}
              </span>
            </div>
            <button
              id="navbar-logout-btn"
              onClick={onLogout}
              className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-950/30 border border-slate-800 hover:border-red-500/30 transition-all cursor-pointer"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

