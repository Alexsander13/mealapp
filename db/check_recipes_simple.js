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
  
  // Проверяем сколько рецептов
  const recipes = await c.query('SELECT COUNT(*) FROM v2_recipes');
  console.log('🍳 Всего рецептов:', recipes.rows[0].count);
  
  // Проверяем примеры
  const examples = await c.query('SELECT id, name, image_url FROM v2_recipes LIMIT 5');
  console.log('\n📋 Примеры рецептов:');
  console.table(examples.rows);
  
  await c.end();
})();
