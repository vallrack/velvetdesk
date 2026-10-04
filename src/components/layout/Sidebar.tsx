import React from 'react';
import {
  Inbox,
  Bot,
  FolderLock,
  CreditCard,
  Users,
  BarChart3,
  Radio,
  X,
} from 'lucide-react';

export type MainView = 'inbox' | 'bot' | 'vault' | 'payments' | 'crm' | 'analytics' | 'channels';

interface SidebarProps {
  currentView: MainView;
  onSelectView: (view: MainView) => void;
  unreadCount: number;
  channelsCount: number;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  unreadCount,
  channelsCount,
  isMobileOpen,
  onCloseMobile,
}) => {
  const navItems = [
    {
      id: 'inbox' as MainView,
      label: 'Bandeja Unificada',
      sublabel: 'Chats en tiempo real',
      icon: Inbox,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    {
      id: 'bot' as MainView,
      label: 'Motor de Bot & IA',
      sublabel: 'Tono, reglas & FAQs',
      icon: Bot,
    },
    {
      id: 'vault' as MainView,
      label: 'Bóveda Multimedia',
      sublabel: 'Fotos, audios & PPV',
      icon: FolderLock,
    },
    {
      id: 'payments' as MainView,
      label: 'Pagos & Enlaces',
      sublabel: 'Crypto, Wise, PayPal',
      icon: CreditCard,
    },
    {
      id: 'crm' as MainView,
      label: 'CRM de Clientes',
      sublabel: 'Fans, VIPs & compras',
      icon: Users,
    },
    {
      id: 'analytics' as MainView,
      label: 'Métricas & Reportes',
      sublabel: 'Ingresos & conversión',
      icon: BarChart3,
    },
    {
      id: 'channels' as MainView,
      label: 'Canales Conectados',
      sublabel: 'Fansly, WA, TG, MV...',
      icon: Radio,
      badge: `${channelsCount}`,
    },
  ];

  const handleItemClick = (view: MainView) => {
    onSelectView(view);
    onCloseMobile();
  };

  const navContent = (
    <div className="flex flex-col h-full justify-between select-none">
      <div className="p-3 space-y-1.5 overflow-y-auto">
        <div className="flex items-center justify-between px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">
          <span>Módulos Principales</span>
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {navItems.map((item) => {
          const isActive = currentView === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              className={`w-full px-3.5 py-3 rounded-xl flex items-center justify-between transition-all cursor-pointer group text-left ${
                isActive
                  ? 'bg-gradient-to-r from-pink-600/20 to-purple-600/10 border border-pink-500/30 text-white font-medium shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                    isActive
                      ? 'bg-pink-600 text-white shadow-md shadow-pink-600/30'
                      : 'bg-slate-900 text-slate-400 group-hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold block leading-tight">{item.label}</span>
                  <span className="text-[10px] text-slate-500 block">{item.sublabel}</span>
                </div>
              </div>

              {item.badge !== undefined && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${
                    isActive
                      ? 'bg-pink-600 text-white'
                      : 'bg-slate-800 text-pink-400 group-hover:bg-slate-700'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Creator Profile Footer */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950">
        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2.5">
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
            alt="Velvet Creator"
            className="w-9 h-9 rounded-full object-cover border border-pink-500/40"
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white truncate">Velvet Goddess</p>
            <p className="text-[10px] text-emerald-400 font-mono">● 7 Canales Activos</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 border-r border-slate-800 bg-slate-950 flex-col shrink-0">
        {navContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[85vw] bg-slate-950 border-r border-slate-800 h-full flex flex-col shadow-2xl z-10">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
};
