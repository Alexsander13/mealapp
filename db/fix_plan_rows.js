const {Client}=require('pg');
const fs=require('fs');
const path=require('path');

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
  console.log('🔧 Исправление типа plan_rows.recipe_id...\n');
  
  const sql = fs.readFileSync(path.join(__dirname, 'fix_plan_rows_type.sql'), 'utf-8');
  
  try {
    const result = await c.query(sql);
    console.log('✅ Успешно!\n');
    
    // Последний результат - это SELECT проверки
    const lastResult = Array.isArray(result) ? result[result.length - 1] : result;
    if (lastResult.rows) {
      console.log('📋 Новый тип recipe_id:');
      console.table(lastResult.rows);
    }
  } catch (err) {
    console.error('❌ Ошибка:', err.message);
  }
  
  await c.end();
})();
