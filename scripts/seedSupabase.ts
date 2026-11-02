import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import {
  INITIAL_FANS,
  INITIAL_CHATS,
  INITIAL_MESSAGES,
  INITIAL_VAULT,
  INITIAL_BOT_RULES,
  INITIAL_FAQS,
} from '../src/mock/initialData';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const sb = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log('Seeding fans...');
  for (const fan of INITIAL_FANS) {
    const { error } = await sb.from('fans').upsert({
      id: fan.id,
      name: fan.name,
      handle: fan.handle,
      avatar: fan.avatar,
      platform: fan.platform,
      tier: fan.tier,
      total_spent: fan.totalSpent,
      join_date: fan.joinDate,
      last_active: fan.lastActive,
      notes: fan.notes,
      tags: fan.tags,
      preferences: fan.preferences,
      phone_or_username: fan.phoneOrUsername,
    });
    if (error) console.error('Fan error:', fan.id, error.message);
  }

  console.log('Seeding threads (chats)...');
  for (const chat of INITIAL_CHATS) {
    const { error } = await sb.from('threads').upsert({
      id: chat.id,
      fan_id: chat.fanId,
      fan_name: chat.fanName,
      fan_handle: chat.fanHandle,
      fan_avatar: chat.fanAvatar,
      platform: chat.platform,
      attended_by: chat.attendedBy,
      bot_paused_reason: chat.botPausedReason || null,
      last_message: chat.lastMessage,
      last_message_time: chat.lastMessageTime,
      unread_count: chat.unreadCount,
      fan_tier: chat.fanTier,
      total_spent: chat.totalSpent,
      is_online: chat.isOnline,
    });
    if (error) console.error('Thread error:', chat.id, error.message);
  }

  console.log('Seeding messages...');
  for (const [chatId, msgs] of Object.entries(INITIAL_MESSAGES)) {
    for (const msg of msgs) {
      const { error } = await sb.from('messages').upsert({
        id: msg.id,
        chat_id: chatId,
        sender: msg.sender,
        text: msg.text,
        timestamp: msg.timestamp,
        media: msg.media || null,
        scheduled_for: msg.scheduledFor || null,
        status: msg.status || 'delivered',
        payment_details: msg.paymentDetails || null,
      });
      if (error) console.error('Message error:', msg.id, error.message);
    }
  }

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
      enabled: r.enabled ?? true,
      triggers: r.triggers,
      action_type: r.actionType,
      reply_content: r.replyContent,
      target_ppv_id: r.targetPpvId || null,
      sort_order: i,
    });
    if (error) console.error('Bot rule error:', r.id, error.message);
  }

  console.log('Seeding FAQs...');
  for (const f of INITIAL_FAQS) {
    const { error } = await sb.from('faqs').upsert({
      id: f.id,
      question: f.question,
      answer: f.answer,
      category: f.category,
      triggers: f.triggers,
      enabled: f.enabled ?? true,
    });
    if (error) console.error('FAQ error:', f.id, error.message);
  }

  console.log('Database seeding complete! ✅');
}

seed().catch(console.error);
