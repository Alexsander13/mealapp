const {Client}=require('pg');
const c=new Client({
  host:'db.nwigkuihnbekkstqsyue.supabase.co',
  port:5432,
  database:'postgres',
  user:'postgres',
  password:'?!Zbx8DLvxJH$6w',
  ssl:{rejectUnauthorized:false}
});

(async()=>{
  await c.connect();
  
  // Проверяем структуру plan_rows
  const r=await c.query(`
    SELECT column_name, data_type, udt_name
    FROM information_schema.columns
    WHERE table_name = 'plan_rows'
    ORDER BY ordinal_position
  `);
  
  console.log('📋 Структура plan_rows:');
  console.table(r.rows);
  
  // Проверяем внешние ключи
  const fk = await c.query(`
    SELECT
      tc.constraint_name, 
      tc.table_name, 
      kcu.column_name, 
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name 
    FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND tc.table_name='plan_rows'
  `);
  
  console.log('\n🔗 Внешние ключи plan_rows:');
  console.table(fk.rows);
  
  await c.end();
})();
