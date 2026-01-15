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
  
  // Проверяем есть ли план
  const plans = await c.query('SELECT id, name, people_count FROM plans LIMIT 5');
  console.log('📋 Планы:');
  console.table(plans.rows);
  
  if (plans.rows.length > 0) {
    const planId = plans.rows[0].id;
    
    // Проверяем plan_rows
    const rows = await c.query('SELECT * FROM plan_rows WHERE plan_id = $1 LIMIT 10', [planId]);
    console.log(`\n📝 Plan rows для плана ${planId}:`);
    console.table(rows.rows);
    
    if (rows.rows.length > 0) {
      const recipeIds = rows.rows.map(r => r.recipe_id);
      const recipes = await c.query('SELECT id, name, image_url FROM v2_recipes WHERE id = ANY($1)', [recipeIds]);
      console.log('\n🍳 Рецепты:');
      console.table(recipes.rows);
    }
  }
  
  await c.end();
})();
