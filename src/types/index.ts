export type PlatformId = 
  | 'fansly' 
  | 'telegram' 
  | 'manyvids' 
  | 'whatsapp' 
  | 'pornhub' 
  | 'scatbook' 
  | 'vipweb';

export type AttendedBy = 'bot' | 'creator';

export type FanTier = 'vip' | 'recurrente' | 'curioso' | 'tacano';

export type MediaType = 'photo' | 'video' | 'audio';

export interface VaultItem {
  id: string;
  title: string;
  description: string;
  type: MediaType;
  url: string;
  thumbnailUrl: string;
  tags: string[]; // e.g. ['Exclusivo', 'PPV', 'Vista Previa', 'Audio Personalizado', 'Video Largo', 'Lencería']
  price: number; // in USD
  duration?: string; // e.g. "08:42" or "00:45"
  fileSize?: string;
  createdDate: string;
  isUnlocked?: boolean;
}

export interface PurchaseRecord {
  id: string;
  vaultItemId: string;
  itemTitle: string;
  amount: number;
  date: string;
  platform: PlatformId;
  paymentMethod: string;
}

export interface FanProfile {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  platform: PlatformId;
  tier: FanTier;
  totalSpent: number;
  joinDate: string;
  lastActive: string;
  notes: string;
  tags: string[];
  preferences: string[];
  purchasedItems: PurchaseRecord[];
  phoneOrUsername?: string;
}

export interface Message {
  id: string;
  chatId: string;
  sender: 'fan' | 'creator' | 'bot';
  text: string;
  timestamp: string;
  media?: {
    type: MediaType;
    url: string;
    thumbnailUrl?: string;
    title?: string;
    duration?: string;
    isViewOnce?: boolean; // WhatsApp View Once
    isVoiceNote?: boolean; // WhatsApp Voice note
    ppvPrice?: number; // USD
    isPpv?: boolean;
    isUnlocked?: boolean;
    paymentLink?: string;
  };
  scheduledFor?: string; // ISO string if scheduled
  status?: 'sending' | 'sent' | 'delivered' | 'read';
  paymentDetails?: {
    method: 'crypto' | 'paypal' | 'wise' | 'mercadopago' | 'fansly_coins' | 'native_mv';
    amount: number;
    currency: string;
    status: 'pending' | 'confirmed';
    txId?: string;
  };
}

export interface ChatThread {
  id: string;
  fanId: string;
  fanName: string;
  fanHandle: string;
  fanAvatar: string;
  platform: PlatformId;
  attendedBy: AttendedBy;
  botPausedReason?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  fanTier: FanTier;
  totalSpent: number;
  isOnline?: boolean;
}

export interface BotRule {
  id: string;
  name: string;
  enabled: boolean;
  triggers: string[]; // e.g. ['precio', 'menu', 'cuanto']
  actionType: 'reply_text' | 'send_ppv' | 'send_payment_link' | 'notify_creator';
  replyContent: string;
  targetPpvId?: string;
}

export interface BotPersona {
  tone: 'coqueta' | 'dominante' | 'dulce' | 'sofisticada' | 'personalizada';
  toneLabel: string;
  customSystemPrompt: string;
  useEmojis: boolean;
  humanTypingDelaySeconds: number;
  autoUpsellEnabled: boolean;
  upsellDiscountPercent: number;
  autoPauseOnCreatorReply: boolean;
}

export interface FAQItem {
  id: string;
  question: string;
  triggers: string[];
  answer: string;
  category: 'precios' | 'customs' | 'pagos' | 'reglas';
  enabled: boolean;
}

export interface PaymentGatewayConfig {
  id: string;
  name: string;
  type: 'crypto' | 'paypal' | 'wise' | 'mercadopago' | 'bizum' | 'stripe';
  enabled: boolean;
  walletOrAccount: string;
  instructions: string;
  currency: string;
  autoUnlockOnConfirm: boolean;
}

export interface ChannelIntegration {
  id: PlatformId;
  name: string;
  iconName: string;
  color: string;
  bgColor: string;
  status: 'connected' | 'reconnecting' | 'action_required' | 'disconnected';
  syncType: string;
  activeChatsCount: number;
  unreadTotal: number;
  todayRevenue: number;
  latencyMs: number;
  lastSyncTime: string;
  credentialInfo: string;
  authMethod?: 'qr_code' | 'api_token' | 'session_cookie' | 'credentials';
  accountUsername?: string;
  webhookUrl?: string;
  apiKeyOrToken?: string;
  sessionCookie?: string;
}
