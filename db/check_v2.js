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
  const r=await c.query(`
    SELECT 
      (SELECT COUNT(*) FROM v2_recipes) as recipes,
      (SELECT COUNT(*) FROM v2_ingredients) as ingredients,
      (SELECT COUNT(*) FROM v2_recipe_ingredients) as links
  `);
  console.log('📊 Статистика:');
  console.log('  Рецепты:', r.rows[0].recipes);
  console.log('  Ингредиенты:', r.rows[0].ingredients);
  console.log('  Связей:', r.rows[0].links);
  await c.end();
})();
