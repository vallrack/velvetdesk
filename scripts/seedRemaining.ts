import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import {
  INITIAL_VAULT,
  INITIAL_BOT_RULES,
} from '../src/mock/initialData';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const sb = createClient(supabaseUrl, supabaseKey);

async function seedRemaining() {
  console.log('Seeding vault_items...');
  for (const v of INITIAL_VAULT) {
    const { error } = await sb.from('vault_items').upsert({
      id: v.id,
      title: v.title,
      description: v.description,
      type: v.type,
      url: v.url,
      thumbnail_url: v.thumbnailUrl,
      tags: v.tags,
      price: v.price,
      duration: v.duration || null,
      file_size: v.fileSize || null,
      created_date: v.createdDate,
      is_unlocked: v.isUnlocked || false,
    });
    if (error) console.error('Vault item error:', v.id, error.message);
  }

  console.log('Seeding bot_rules...');
  for (let i = 0; i < INITIAL_BOT_RULES.length; i++) {
    const r = INITIAL_BOT_RULES[i];
    const { error } = await sb.from('bot_rules').upsert({
      id: r.id,
      name: r.name,
      enabled: r.isActive,
      triggers: r.triggers,
      action_type: r.action,
      reply_content: r.replyContent,
      target_ppv_id: r.targetPpvId || null,
      sort_order: i,
    });
    if (error) console.error('Bot rule error:', r.id, error.message);
  }

  console.log('Done seeding vault_items and bot_rules! ✅');
}

seedRemaining().catch(console.error);
