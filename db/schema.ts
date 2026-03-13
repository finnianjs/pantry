import type { SQLiteDatabase } from 'expo-sqlite';

export const GROCERY_SECTIONS = [
  'Produce',
  'Pantry',
  'Freezer',
  'Vegan',
  'Baking',
  'Spices',
  'Beverages',
] as const;

export type GrocerySection = (typeof GROCERY_SECTIONS)[number];

export async function initDatabase(db: SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS recipe_steps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipe_id INTEGER NOT NULL,
      step_number INTEGER NOT NULL,
      instruction TEXT NOT NULL,
      FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE COLLATE NOCASE,
      section TEXT NOT NULL,
      is_bulk INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS recipe_ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipe_id INTEGER NOT NULL,
      ingredient_id INTEGER NOT NULL,
      amount TEXT NOT NULL,
      FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
      FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
    );

    CREATE TABLE IF NOT EXISTS grocery_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ingredient_id INTEGER,
      custom_name TEXT,
      amount TEXT,
      section TEXT NOT NULL,
      FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
    );

    CREATE TABLE IF NOT EXISTS meal_list (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipe_id INTEGER,
      custom_name TEXT,
      added_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  await seedIngredients(db);
}

async function seedIngredients(db: SQLiteDatabase) {
  const existing = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM ingredients'
  );
  if (existing && existing.count > 0) return;

  const seeds: { name: string; section: GrocerySection }[] = [
    // Produce
    { name: 'onion', section: 'Produce' },
    { name: 'garlic', section: 'Produce' },
    { name: 'tomato', section: 'Produce' },
    { name: 'potato', section: 'Produce' },
    { name: 'sweet potato', section: 'Produce' },
    { name: 'carrot', section: 'Produce' },
    { name: 'celery', section: 'Produce' },
    { name: 'bell pepper', section: 'Produce' },
    { name: 'broccoli', section: 'Produce' },
    { name: 'spinach', section: 'Produce' },
    { name: 'kale', section: 'Produce' },
    { name: 'lettuce', section: 'Produce' },
    { name: 'avocado', section: 'Produce' },
    { name: 'lemon', section: 'Produce' },
    { name: 'lime', section: 'Produce' },
    { name: 'banana', section: 'Produce' },
    { name: 'apple', section: 'Produce' },
    { name: 'mushrooms', section: 'Produce' },
    { name: 'zucchini', section: 'Produce' },
    { name: 'cucumber', section: 'Produce' },
    { name: 'ginger', section: 'Produce' },
    { name: 'cilantro', section: 'Produce' },
    { name: 'basil', section: 'Produce' },
    { name: 'green onion', section: 'Produce' },
    { name: 'jalapeño', section: 'Produce' },
    { name: 'corn', section: 'Produce' },
    { name: 'cauliflower', section: 'Produce' },
    { name: 'cabbage', section: 'Produce' },
    { name: 'eggplant', section: 'Produce' },

    // Pantry
    { name: 'rice', section: 'Pantry' },
    { name: 'pasta', section: 'Pantry' },
    { name: 'bread', section: 'Pantry' },
    { name: 'tortillas', section: 'Pantry' },
    { name: 'canned tomatoes', section: 'Pantry' },
    { name: 'canned beans', section: 'Pantry' },
    { name: 'black beans', section: 'Pantry' },
    { name: 'chickpeas', section: 'Pantry' },
    { name: 'lentils', section: 'Pantry' },
    { name: 'coconut milk', section: 'Pantry' },
    { name: 'vegetable broth', section: 'Pantry' },
    { name: 'soy sauce', section: 'Pantry' },
    { name: 'olive oil', section: 'Pantry' },
    { name: 'coconut oil', section: 'Pantry' },
    { name: 'sesame oil', section: 'Pantry' },
    { name: 'vinegar', section: 'Pantry' },
    { name: 'hot sauce', section: 'Pantry' },
    { name: 'peanut butter', section: 'Pantry' },
    { name: 'tahini', section: 'Pantry' },
    { name: 'maple syrup', section: 'Pantry' },
    { name: 'quinoa', section: 'Pantry' },
    { name: 'oats', section: 'Pantry' },
    { name: 'noodles', section: 'Pantry' },
    { name: 'tomato paste', section: 'Pantry' },
    { name: 'salsa', section: 'Pantry' },

    // Freezer
    { name: 'frozen vegetables', section: 'Freezer' },
    { name: 'frozen fruit', section: 'Freezer' },
    { name: 'frozen berries', section: 'Freezer' },
    { name: 'frozen corn', section: 'Freezer' },
    { name: 'frozen peas', section: 'Freezer' },
    { name: 'frozen edamame', section: 'Freezer' },

    // Vegan
    { name: 'tofu', section: 'Vegan' },
    { name: 'tempeh', section: 'Vegan' },
    { name: 'nutritional yeast', section: 'Vegan' },
    { name: 'plant-based meat', section: 'Vegan' },
    { name: 'vegan cheese', section: 'Vegan' },
    { name: 'vegan butter', section: 'Vegan' },
    { name: 'vegan mayo', section: 'Vegan' },
    { name: 'vegan yogurt', section: 'Vegan' },

    // Baking
    { name: 'flour', section: 'Baking' },
    { name: 'sugar', section: 'Baking' },
    { name: 'brown sugar', section: 'Baking' },
    { name: 'baking powder', section: 'Baking' },
    { name: 'baking soda', section: 'Baking' },
    { name: 'vanilla extract', section: 'Baking' },
    { name: 'cocoa powder', section: 'Baking' },
    { name: 'cornstarch', section: 'Baking' },
    { name: 'yeast', section: 'Baking' },

    // Spices
    { name: 'salt', section: 'Spices' },
    { name: 'black pepper', section: 'Spices' },
    { name: 'cumin', section: 'Spices' },
    { name: 'paprika', section: 'Spices' },
    { name: 'chili powder', section: 'Spices' },
    { name: 'turmeric', section: 'Spices' },
    { name: 'oregano', section: 'Spices' },
    { name: 'thyme', section: 'Spices' },
    { name: 'cinnamon', section: 'Spices' },
    { name: 'garlic powder', section: 'Spices' },
    { name: 'onion powder', section: 'Spices' },
    { name: 'cayenne pepper', section: 'Spices' },
    { name: 'red pepper flakes', section: 'Spices' },
    { name: 'curry powder', section: 'Spices' },
    { name: 'smoked paprika', section: 'Spices' },
    { name: 'bay leaves', section: 'Spices' },
    { name: 'coriander', section: 'Spices' },
    { name: 'nutmeg', section: 'Spices' },

    // Beverages
    { name: 'oat milk', section: 'Beverages' },
    { name: 'almond milk', section: 'Beverages' },
    { name: 'soy milk', section: 'Beverages' },
    { name: 'orange juice', section: 'Beverages' },
    { name: 'coffee', section: 'Beverages' },
    { name: 'tea', section: 'Beverages' },
  ];

  const stmt = await db.prepareAsync(
    'INSERT OR IGNORE INTO ingredients (name, section) VALUES ($name, $section)'
  );
  try {
    for (const seed of seeds) {
      await stmt.executeAsync({ $name: seed.name, $section: seed.section });
    }
  } finally {
    await stmt.finalizeAsync();
  }
}
