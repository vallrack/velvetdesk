-- ============================================================
-- VelvetDesk Omnichannel Creator Suite — Supabase SQL Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE: channels
-- ============================================================
CREATE TABLE IF NOT EXISTS public.channels (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  icon_name         TEXT NOT NULL DEFAULT 'Globe',
  color             TEXT NOT NULL DEFAULT '#888888',
  bg_color          TEXT NOT NULL DEFAULT 'rgba(136,136,136,0.15)',
  status            TEXT NOT NULL DEFAULT 'disconnected'
                      CHECK (status IN ('connected','reconnecting','action_required','disconnected')),
  sync_type         TEXT NOT NULL DEFAULT 'API',
  active_chats_count INT NOT NULL DEFAULT 0,
  unread_total      INT NOT NULL DEFAULT 0,
  today_revenue     NUMERIC(10,2) NOT NULL DEFAULT 0,
  latency_ms        INT NOT NULL DEFAULT 0,
  last_sync_time    TEXT NOT NULL DEFAULT 'Nunca',
  credential_info   TEXT NOT NULL DEFAULT '',
  auth_method       TEXT CHECK (auth_method IN ('qr_code','api_token','session_cookie','credentials')),
  account_username  TEXT,
  webhook_url       TEXT,
  api_key_or_token  TEXT,
  session_cookie    TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: fans
-- ============================================================
CREATE TABLE IF NOT EXISTS public.fans (
  id                TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  name              TEXT NOT NULL,
  handle            TEXT NOT NULL DEFAULT '',
  avatar            TEXT NOT NULL DEFAULT 'https://ui-avatars.com/api/?name=Fan&background=8b5cf6&color=fff',
  platform          TEXT NOT NULL,
  tier              TEXT NOT NULL DEFAULT 'curioso'
                      CHECK (tier IN ('vip','recurrente','curioso','tacano')),
  total_spent       NUMERIC(10,2) NOT NULL DEFAULT 0,
  join_date         DATE NOT NULL DEFAULT CURRENT_DATE,
  last_active       TEXT NOT NULL DEFAULT 'Desconocido',
  notes             TEXT NOT NULL DEFAULT '',
  tags              TEXT[] NOT NULL DEFAULT '{}',
  preferences       TEXT[] NOT NULL DEFAULT '{}',
  phone_or_username TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: threads
-- ============================================================
CREATE TABLE IF NOT EXISTS public.threads (
  id                  TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  fan_id              TEXT NOT NULL REFERENCES public.fans(id) ON DELETE CASCADE,
  fan_name            TEXT NOT NULL,
  fan_handle          TEXT NOT NULL DEFAULT '',
  fan_avatar          TEXT NOT NULL DEFAULT '',
  platform            TEXT NOT NULL,
  attended_by         TEXT NOT NULL DEFAULT 'bot' CHECK (attended_by IN ('bot','creator')),
  bot_paused_reason   TEXT,
  last_message        TEXT NOT NULL DEFAULT '',
  last_message_time   TEXT NOT NULL DEFAULT '',
  unread_count        INT NOT NULL DEFAULT 0,
  fan_tier            TEXT NOT NULL DEFAULT 'curioso',
  total_spent         NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_online           BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: messages
-- ============================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id              TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  chat_id         TEXT NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  sender          TEXT NOT NULL CHECK (sender IN ('fan','creator','bot')),
  text            TEXT NOT NULL DEFAULT '',
  timestamp       TEXT NOT NULL DEFAULT '',
  media           JSONB,
  scheduled_for   TIMESTAMPTZ,
  status          TEXT CHECK (status IN ('sending','sent','delivered','read')),
  payment_details JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS messages_chat_id_idx ON public.messages(chat_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON public.messages(created_at DESC);

-- ============================================================
-- TABLE: vault_items
-- ============================================================
CREATE TABLE IF NOT EXISTS public.vault_items (
  id            TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  title         TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  type          TEXT NOT NULL CHECK (type IN ('photo','video','audio')),
  url           TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL DEFAULT '',
  tags          TEXT[] NOT NULL DEFAULT '{}',
  price         NUMERIC(10,2) NOT NULL DEFAULT 0,
  duration      TEXT,
  file_size     TEXT,
  created_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  is_unlocked   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: purchase_records
-- ============================================================
CREATE TABLE IF NOT EXISTS public.purchase_records (
  id              TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  fan_id          TEXT NOT NULL REFERENCES public.fans(id) ON DELETE CASCADE,
  vault_item_id   TEXT NOT NULL DEFAULT '',
  item_title      TEXT NOT NULL,
  amount          NUMERIC(10,2) NOT NULL,
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  platform        TEXT NOT NULL,
  payment_method  TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS purchase_records_fan_id_idx ON public.purchase_records(fan_id);

-- ============================================================
-- TABLE: bot_rules
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bot_rules (
  id            TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  name          TEXT NOT NULL,
  enabled       BOOLEAN NOT NULL DEFAULT TRUE,
  triggers      TEXT[] NOT NULL DEFAULT '{}',
  action_type   TEXT NOT NULL CHECK (action_type IN ('reply_text','send_ppv','send_payment_link','notify_creator')),
  reply_content TEXT NOT NULL DEFAULT '',
  target_ppv_id TEXT,
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: faqs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.faqs (
  id         TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  question   TEXT NOT NULL,
  triggers   TEXT[] NOT NULL DEFAULT '{}',
  answer     TEXT NOT NULL DEFAULT '',
  category   TEXT NOT NULL DEFAULT 'precios'
               CHECK (category IN ('precios','customs','pagos','reglas')),
  enabled    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: payment_gateways
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payment_gateways (
  id                     TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  name                   TEXT NOT NULL,
  type                   TEXT NOT NULL CHECK (type IN ('crypto','paypal','wise','mercadopago','bizum','stripe')),
  enabled                BOOLEAN NOT NULL DEFAULT FALSE,
  wallet_or_account      TEXT NOT NULL DEFAULT '',
  instructions           TEXT NOT NULL DEFAULT '',
  currency               TEXT NOT NULL DEFAULT 'USD',
  auto_unlock_on_confirm BOOLEAN NOT NULL DEFAULT TRUE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: bot_persona (single row, id=1)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bot_persona (
  id                          INT PRIMARY KEY DEFAULT 1,
  tone                        TEXT NOT NULL DEFAULT 'coqueta'
                                CHECK (tone IN ('coqueta','dominante','dulce','sofisticada','personalizada')),
  tone_label                  TEXT NOT NULL DEFAULT 'Coqueta, Picara y Dulce',
  custom_system_prompt        TEXT NOT NULL DEFAULT '',
  use_emojis                  BOOLEAN NOT NULL DEFAULT TRUE,
  human_typing_delay_seconds  NUMERIC(4,1) NOT NULL DEFAULT 2.5,
  auto_upsell_enabled         BOOLEAN NOT NULL DEFAULT TRUE,
  upsell_discount_percent     INT NOT NULL DEFAULT 20,
  auto_pause_on_creator_reply BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.bot_persona (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SEED: channels (empty credentials)
-- ============================================================
INSERT INTO public.channels (id, name, icon_name, color, bg_color, status, sync_type, auth_method)
VALUES
  ('fansly',   'Fansly',    'Flame',         '#00aff0', 'rgba(0,175,240,0.15)',   'disconnected', 'API Oficial',               'api_token'),
  ('telegram', 'Telegram',  'Send',          '#229ed9', 'rgba(34,158,217,0.15)', 'disconnected', 'Telegram Bot API',          'api_token'),
  ('manyvids', 'ManyVids',  'Film',          '#e91e63', 'rgba(233,30,99,0.15)',  'disconnected', 'Session Cookie / Scraper',  'session_cookie'),
  ('whatsapp', 'WhatsApp',  'MessageCircle', '#25d366', 'rgba(37,211,102,0.15)','disconnected', 'Baileys Multi-Device (QR)', 'qr_code'),
  ('pornhub',  'Pornhub',   'PlaySquare',    '#ff9900', 'rgba(255,153,0,0.15)', 'disconnected', 'Session Cookie / Scraper',  'session_cookie'),
  ('scatbook', 'Scatbook',  'Radio',         '#8b5cf6', 'rgba(139,92,246,0.15)','disconnected', 'API Token',                 'api_token'),
  ('vipweb',   'VIPweb',    'Crown',         '#eab308', 'rgba(234,179,8,0.15)', 'disconnected', 'API + Credentials',         'credentials')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SEED: payment_gateways (empty wallets)
-- ============================================================
INSERT INTO public.payment_gateways (id, name, type, currency, instructions)
VALUES
  ('pay-crypto',      'Crypto USDT (TRC20)',            'crypto',      'USDT', 'Envia USDT exactos por red TRON (TRC20). Contenido liberado en 60s.'),
  ('pay-paypal',      'PayPal Friends & Family',        'paypal',      'USD',  'Enviar como Amigos y Familia sin nota explicita.'),
  ('pay-wise',        'Wise Transfer',                  'wise',        'USD',  'Transferencia directa en USD o EUR.'),
  ('pay-mercadopago', 'MercadoPago / Pix',              'mercadopago', 'ARS',  'Envia el comprobante para desbloqueo automatico.'),
  ('pay-bizum',       'Bizum Espana',                   'bizum',       'EUR',  'Concepto: Regalo. Desbloqueo inmediato.'),
  ('pay-stripe',      'Stripe (Tarjeta Internacional)', 'stripe',      'USD',  'Pago con tarjeta seguro via Stripe.')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- REALTIME — enable for live inbox updates
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.threads;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.channels         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fans             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.threads          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_rules        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_persona      ENABLE ROW LEVEL SECURITY;

-- Policy: allow all for service_role (backend server uses this key)
CREATE POLICY "service_role_all" ON public.channels         FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public.fans             FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public.threads          FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public.messages         FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public.vault_items      FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public.purchase_records FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public.bot_rules        FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public.faqs             FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public.payment_gateways FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public.bot_persona      FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Policy: allow all for authenticated users (anon key from frontend)
CREATE POLICY "authenticated_all" ON public.channels         FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public.fans             FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public.threads          FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public.messages         FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public.vault_items      FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public.purchase_records FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public.bot_rules        FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public.faqs             FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public.payment_gateways FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public.bot_persona      FOR ALL TO anon USING (true) WITH CHECK (true);
