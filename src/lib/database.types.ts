export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      channels: {
        Row: {
          id: string;
          name: string;
          icon_name: string;
          color: string;
          bg_color: string;
          status: string;
          sync_type: string;
          active_chats_count: number;
          unread_total: number;
          today_revenue: number;
          latency_ms: number;
          last_sync_time: string;
          credential_info: string;
          auth_method: string | null;
          account_username: string | null;
          webhook_url: string | null;
          api_key_or_token: string | null;
          session_cookie: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['channels']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['channels']['Insert']>;
      };
      fans: {
        Row: {
          id: string;
          name: string;
          handle: string;
          avatar: string;
          platform: string;
          tier: string;
          total_spent: number;
          join_date: string;
          last_active: string;
          notes: string;
          tags: string[];
          preferences: string[];
          phone_or_username: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['fans']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['fans']['Insert']>;
      };
      threads: {
        Row: {
          id: string;
          fan_id: string;
          fan_name: string;
          fan_handle: string;
          fan_avatar: string;
          platform: string;
          attended_by: string;
          bot_paused_reason: string | null;
          last_message: string;
          last_message_time: string;
          unread_count: number;
          fan_tier: string;
          total_spent: number;
          is_online: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['threads']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['threads']['Insert']>;
      };
      messages: {
        Row: {
          id: string;
          chat_id: string;
          sender: string;
          text: string;
          timestamp: string;
          media: Json | null;
          scheduled_for: string | null;
          status: string | null;
          payment_details: Json | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['messages']['Row'], 'created_at'>;
        Update: Partial<Database['public']['Tables']['messages']['Insert']>;
      };
      vault_items: {
        Row: {
          id: string;
          title: string;
          description: string;
          type: string;
          url: string;
          thumbnail_url: string;
          tags: string[];
          price: number;
          duration: string | null;
          file_size: string | null;
          created_date: string;
          is_unlocked: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['vault_items']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['vault_items']['Insert']>;
      };
      purchase_records: {
        Row: {
          id: string;
          fan_id: string;
          vault_item_id: string;
          item_title: string;
          amount: number;
          date: string;
          platform: string;
          payment_method: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['purchase_records']['Row'], 'created_at'>;
        Update: Partial<Database['public']['Tables']['purchase_records']['Insert']>;
      };
      bot_rules: {
        Row: {
          id: string;
          name: string;
          enabled: boolean;
          triggers: string[];
          action_type: string;
          reply_content: string;
          target_ppv_id: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['bot_rules']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['bot_rules']['Insert']>;
      };
      faqs: {
        Row: {
          id: string;
          question: string;
          triggers: string[];
          answer: string;
          category: string;
          enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['faqs']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['faqs']['Insert']>;
      };
      payment_gateways: {
        Row: {
          id: string;
          name: string;
          type: string;
          enabled: boolean;
          wallet_or_account: string;
          instructions: string;
          currency: string;
          auto_unlock_on_confirm: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['payment_gateways']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['payment_gateways']['Insert']>;
      };
      bot_persona: {
        Row: {
          id: number;
          tone: string;
          tone_label: string;
          custom_system_prompt: string;
          use_emojis: boolean;
          human_typing_delay_seconds: number;
          auto_upsell_enabled: boolean;
          upsell_discount_percent: number;
          auto_pause_on_creator_reply: boolean;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['bot_persona']['Row'], 'id' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['bot_persona']['Insert']>;
      };
    };
  };
}
