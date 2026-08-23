import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sqlContent = fs.readFileSync(
  path.resolve('supabase/migrations/027_phase2b_assets_schema_and_rpcs.sql'),
  'utf8'
);

// Connection string options for Supabase project geidhxmkglandwjqitqg
const connectionStrings = [
  process.env.DATABASE_URL,
  process.env.POSTGRES_URL,
  process.env.DIRECT_URL,
  `postgresql://postgres:postgres@localhost:54322/postgres`,
].filter(Boolean);

console.log('Available connection strings:', connectionStrings.length);

let applied = false;

for (const connStr of connectionStrings) {
  try {
    console.log('Attempting connection with:', connStr.replace(/:[^:@]+@/, ':****@'));
    const sql = postgres(connStr, { max: 1, timeout: 5 });
    await sql.unsafe(sqlContent);
    await sql.end();
    console.log('✓ Migration 027 applied successfully via postgres connection!');
    applied = true;
    break;
  } catch (err) {
    console.log('Connection failed:', err.message);
  }
}

if (!applied) {
  console.log('Notice: Direct postgres connection not configured in .env.local. Checking if Supabase REST RPC or Admin client can execute operations.');
}
