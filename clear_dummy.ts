import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

async function clearChats() {
  console.log('Clearing messages...');
  await db.from('messages').delete().neq('id', 'dummy');
  console.log('Clearing threads...');
  await db.from('threads').delete().neq('id', 'dummy');
  console.log('Done!');
}
clearChats();
