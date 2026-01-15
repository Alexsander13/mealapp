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
  
  // Проверяем типы данных
  const planRows = await c.query(`
    SELECT column_name, data_type, udt_name
    FROM information_schema.columns
    WHERE table_name = 'plan_rows'
    ORDER BY ordinal_position
  `);
  
  console.log('📋 plan_rows:');
  console.table(planRows.rows);
  
  const v2Recipes = await c.query(`
    SELECT column_name, data_type, udt_name
    FROM information_schema.columns
    WHERE table_name = 'v2_recipes' AND column_name = 'id'
  `);
  
  console.log('\n🆔 v2_recipes.id:');
  console.table(v2Recipes.rows);
  
  // Проверяем внешние ключи
  const fk = await c.query(`
    SELECT
      tc.constraint_name, 
      kcu.column_name, 
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name 
    FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND tc.table_name='plan_rows'
  `);
  
  console.log('\n🔗 Внешние ключи plan_rows:');
  console.table(fk.rows);
  
  await c.end();
})();
