import React from 'react';
import { Inbox, Bot, FolderLock, Users, Menu } from 'lucide-react';
import { MainView } from './Sidebar';

interface MobileBottomNavProps {
  currentView: MainView;
  onSelectView: (view: MainView) => void;
  onOpenMobileMenu: () => void;
  unreadCount: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentView,
  onSelectView,
  onOpenMobileMenu,
  unreadCount,
}) => {
  const tabs = [
    { id: 'inbox' as MainView, label: 'Chats', icon: Inbox, badge: unreadCount },
    { id: 'bot' as MainView, label: 'Bot IA', icon: Bot },
    { id: 'vault' as MainView, label: 'Bóveda', icon: FolderLock },
    { id: 'crm' as MainView, label: 'CRM', icon: Users },
  ];

  return (
    <nav className="lg:hidden border-t border-slate-800 bg-slate-950/95 backdrop-blur-md px-2 py-1.5 flex items-center justify-around shrink-0 z-30 safe-area-bottom">
      {tabs.map((tab) => {
        const isActive = currentView === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            onClick={() => onSelectView(tab.id)}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all relative cursor-pointer ${
              isActive ? 'text-pink-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <Icon className="w-5 h-5" />
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-4 h-4 rounded-full bg-pink-600 text-white text-[9px] font-bold flex items-center justify-center px-1 font-mono">
                  {tab.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 leading-tight">{tab.label}</span>
          </button>
        );
      })}

      {/* Menu button to open remaining modules (Payments, Analytics, Channels) */}
      <button
        onClick={onOpenMobileMenu}
        className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
          currentView === 'payments' || currentView === 'analytics' || currentView === 'channels'
            ? 'text-pink-400 font-semibold'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Menu className="w-5 h-5" />
        <span className="text-[10px] mt-0.5 leading-tight">Más</span>
      </button>
    </nav>
  );
};
