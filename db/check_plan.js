const { Client } = require('pg');

const client = new Client({
  host: 'db.nwigkuihnbekkstqsyue.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: '?!Zbx8DLvxJH$6w',
  ssl: { rejectUnauthorized: false }
});

(async () => {
  await client.connect();
  
  console.log('Проверяем последний план...\n');
  const plans = await client.query('SELECT id, name, created_at FROM plans ORDER BY created_at DESC LIMIT 1');
  
  if (plans.rows.length === 0) {
    console.log('❌ Нет планов в базе');
    await client.end();
    process.exit(0);
  }
  
  const plan = plans.rows[0];
  console.log('✅ План:', plan.id, '-', plan.name);
  
  const rows = await client.query('SELECT COUNT(*) as cnt FROM plan_rows WHERE plan_id = $1', [plan.id]);
  console.log('📊 Строк в плане:', rows.rows[0].cnt);
  
  if (rows.rows[0].cnt > 0) {
    const sample = await client.query('SELECT * FROM plan_rows WHERE plan_id = $1 LIMIT 1', [plan.id]);
    console.log('📝 Пример строки:', sample.rows[0]);
    
    // Проверяем рецепт
    const recipe = await client.query('SELECT id, name, image_url FROM v2_recipes WHERE id = $1', [sample.rows[0].recipe_id]);
    if (recipe.rows.length > 0) {
      console.log('✅ Рецепт найден:', recipe.rows[0].name);
      console.log('🖼️  Фото:', recipe.rows[0].image_url);
    } else {
      console.log('❌ Рецепт не найден для ID:', sample.rows[0].recipe_id);
    }
  } else {
    console.log('⚠️  План пустой - нет рецептов!');
  }
  
  await client.end();
  process.exit(0);
})();
