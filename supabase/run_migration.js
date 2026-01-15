const fs = require('fs')
const path = require('path')

function loadEnv() {
  const p = path.resolve(__dirname, '../.env.local')
  if (!fs.existsSync(p)) return {}
  const lines = fs.readFileSync(p, 'utf8').split(/\n/)
    .map(l=>l.trim())
    .filter(l=>l && !l.startsWith('#'))
  const out = {}
  for(const l of lines){
    const idx = l.indexOf('=')
    if (idx>0){
      const k = l.slice(0,idx)
      const v = l.slice(idx+1)
      out[k]=v
    }
  }
  return out
}

const env = loadEnv()
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_KEY){
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const sql = fs.readFileSync(path.join(__dirname, 'migrations/001_init.sql'), 'utf8')

async function runMigration(){
  console.log('Running migration...')
  const url = SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/rpc/exec_sql'
  
  // Try using pg_execute endpoint or query API
  // Supabase doesn't expose direct SQL execution via REST, so we use psql-like approach
  // Alternative: use Supabase Management API or run via Dashboard
  
  // For now, let's just output instructions
  console.log('Migration SQL ready. Please run this in Supabase SQL Editor:')
  console.log('=' .repeat(60))
  console.log(sql)
  console.log('=' .repeat(60))
  console.log('Or copy from: supabase/migrations/001_init.sql')
  console.log('\nAfter running SQL, execute: node supabase/seed/seed_node.js')
}

runMigration().catch(e=>{ console.error(e); process.exit(1) })
