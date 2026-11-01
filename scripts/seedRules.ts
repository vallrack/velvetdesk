import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { INITIAL_BOT_RULES } from '../src/mock/initialData';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const sb = createClient(supabaseUrl, supabaseKey);

async function seedRules() {
  console.log('Seeding bot_rules...');
  for (let i = 0; i < INITIAL_BOT_RULES.length; i++) {
    const r = INITIAL_BOT_RULES[i] as any;
    const { error } = await sb.from('bot_rules').upsert({
      id: r.id,
      name: r.name,
      enabled: r.enabled ?? true,
      triggers: r.triggers,
      action_type: r.actionType,
      reply_content: r.replyContent,
      target_ppv_id: r.targetPpvId || null,
      sort_order: i,
    });
    if (error) console.error('Bot rule error:', r.id, error.message);
  }
  console.log('Bot rules seeded! ✅');
}

seedRules().catch(console.error);
