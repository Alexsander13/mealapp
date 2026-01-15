const fs = require('fs')
const path = require('path')

function loadEnv() {
  const p = path.resolve(__dirname, '../../.env.local')
  if (!fs.existsSync(p)) return {}
  const lines = fs.readFileSync(p, 'utf8').split(/\n/)
    .map(l=>l.trim())
    .filter(l=>l && !l.startsWith('#'))
  const out = {}
  for(const l of lines){
    const idx = l.indexOf('=')
    if (idx>0){
      const k = l.slice(0,idx).trim()
      const v = l.slice(idx+1).trim()
      out[k]=v
    }
  }
  return out
}

const env = loadEnv()
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY

console.log('Loaded env:', { url: SUPABASE_URL ? 'SET' : 'MISSING', key: SUPABASE_KEY ? 'SET' : 'MISSING' })

if (!SUPABASE_URL || !SUPABASE_KEY){
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const rest = SUPABASE_URL.replace(/\/$/, '') + '/rest/v1'

async function runSQL(sql){
  const url = rest + '/rpc'
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json'
  }
  
  const res = await fetch(url, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify({ query: sql })
  })
  
  const text = await res.text()
  console.log('Status:', res.status)
  console.log('Response:', text)
  
  if (!res.ok) {
    throw new Error('SQL execution failed: ' + text)
  }
  
  return text
}

async function main(){
  console.log('Applying migration 002...')
  
  // Directly run ALTER TABLE command
  try {
    await runSQL('alter table recipes add column if not exists image_url text;')
    console.log('Migration 002 complete')
  } catch(e) {
    console.error('Migration failed:', e.message)
    process.exit(1)
  }
}

main()
