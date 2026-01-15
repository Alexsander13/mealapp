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
  
  const plans = await client.query('SELECT id, name FROM plans ORDER BY created_at DESC LIMIT 1');
  
  if (plans.rows.length === 0) {
    console.log('No plans');
    process.exit(0);
  }
  
  const plan = plans.rows[0];
  console.log('Plan:', plan.id, '-', plan.name);
  
  const rows = await client.query('SELECT COUNT(*) as cnt FROM plan_rows WHERE plan_id = $1', [plan.id]);
  console.log('Rows:', rows.rows[0].cnt);
  
  if (rows.rows[0].cnt > 0) {
    const sample = await client.query('SELECT * FROM plan_rows WHERE plan_id = $1 LIMIT 3', [plan.id]);
    console.log('\nSample rows:');
    sample.rows.forEach(r => {
      console.log(`  Day ${r.day_index}, ${r.slot}: recipe_id = ${r.recipe_id} (type: ${typeof r.recipe_id})`);
    });
    
    // Проверяем рецепт
    if (sample.rows.length > 0) {
      const recipeId = sample.rows[0].recipe_id;
      const recipe = await client.query('SELECT id, name, image_url FROM v2_recipes WHERE id = $1', [recipeId]);
      console.log('\nRecipe check:');
      console.log('  Looking for ID:', recipeId, '(type:', typeof recipeId, ')');
      if (recipe.rows.length > 0) {
        console.log('  ✅ Found:', recipe.rows[0].name);
        console.log('  Image:', recipe.rows[0].image_url);
      } else {
        console.log('  ❌ Not found');
      }
    }
  }
  
  await client.end();
  process.exit(0);
})();
