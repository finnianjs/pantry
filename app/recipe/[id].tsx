import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View, Alert } from 'react-native';
import {
  Text,
  Button,
  Checkbox,
  Divider,
  IconButton,
  Menu,
  Surface,
} from 'react-native-paper';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useDatabase } from '@/db/DatabaseProvider';

type RecipeDetail = {
  id: number;
  name: string;
};

type Ingredient = {
  recipeIngredientId: number;
  ingredientId: number;
  name: string;
  amount: string;
  section: string;
  isBulk: boolean;
};

type Step = {
  id: number;
  step_number: number;
  instruction: string;
};

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDatabase();
  const router = useRouter();

  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [menuVisible, setMenuVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadRecipe();
    }, [id])
  );

  async function loadRecipe() {
    const r = await db.getFirstAsync<RecipeDetail>(
      'SELECT id, name FROM recipes WHERE id = $id',
      { $id: Number(id) }
    );
    setRecipe(r);

    const ings = await db.getAllAsync<{
      recipeIngredientId: number;
      ingredientId: number;
      name: string;
      amount: string;
      section: string;
      is_bulk: number;
    }>(
      `SELECT ri.id as recipeIngredientId, ri.ingredient_id as ingredientId,
              i.name, ri.amount, i.section, i.is_bulk
       FROM recipe_ingredients ri
       JOIN ingredients i ON ri.ingredient_id = i.id
       WHERE ri.recipe_id = $recipeId
       ORDER BY i.name`,
      { $recipeId: Number(id) }
    );
    setIngredients(
      ings.map((i) => ({ ...i, isBulk: i.is_bulk === 1 }))
    );

    const s = await db.getAllAsync<Step>(
      'SELECT * FROM recipe_steps WHERE recipe_id = $recipeId ORDER BY step_number',
      { $recipeId: Number(id) }
    );
    setSteps(s);
  }

  async function toggleBulk(ingredient: Ingredient) {
    const newBulk = !ingredient.isBulk;
    await db.runAsync(
      'UPDATE ingredients SET is_bulk = $isBulk WHERE id = $id',
      { $isBulk: newBulk ? 1 : 0, $id: ingredient.ingredientId }
    );
    setIngredients(
      ingredients.map((i) =>
        i.ingredientId === ingredient.ingredientId
          ? { ...i, isBulk: newBulk }
          : i
      )
    );
  }

  async function addToMealList() {
    await db.runAsync(
      'INSERT INTO meal_list (recipe_id) VALUES ($recipeId)',
      { $recipeId: Number(id) }
    );

    const nonBulkIngredients = ingredients.filter((i) => !i.isBulk);
    for (const ing of nonBulkIngredients) {
      const existing = await db.getFirstAsync<{ id: number; amount: string }>(
        'SELECT id, amount FROM grocery_items WHERE ingredient_id = $ingredientId',
        { $ingredientId: ing.ingredientId }
      );

      if (existing) {
        const combined = combineAmounts(existing.amount, ing.amount);
        await db.runAsync(
          'UPDATE grocery_items SET amount = $amount WHERE id = $id',
          { $amount: combined, $id: existing.id }
        );
      } else {
        await db.runAsync(
          'INSERT INTO grocery_items (ingredient_id, amount, section) VALUES ($ingredientId, $amount, $section)',
          {
            $ingredientId: ing.ingredientId,
            $amount: ing.amount,
            $section: ing.section,
          }
        );
      }
    }

    Alert.alert('Added!', `${recipe?.name} added to meal list with ${nonBulkIngredients.length} grocery items.`);
  }

  async function deleteRecipe() {
    const onMealList = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM meal_list WHERE recipe_id = $recipeId',
      { $recipeId: Number(id) }
    );

    if (onMealList) {
      Alert.alert(
        'Cannot Delete',
        'This recipe is on your meal list. You must make the meal first or check it off the list before deleting.'
      );
      return;
    }

    Alert.alert('Delete Recipe', `Are you sure you want to delete "${recipe?.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await db.runAsync('DELETE FROM recipes WHERE id = $id', {
            $id: Number(id),
          });
          router.back();
        },
      },
    ]);
  }

  if (!recipe) {
    return (
      <View style={styles.loading}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>{recipe.name}</Text>
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <IconButton
              icon="dots-vertical"
              iconColor="#757575"
              onPress={() => setMenuVisible(true)}
            />
          }
        >
          <Menu.Item
            leadingIcon="pencil-outline"
            title="Edit"
            onPress={() => {
              setMenuVisible(false);
              router.push(`/recipe/edit?id=${id}`);
            }}
          />
          <Menu.Item
            leadingIcon="delete-outline"
            title="Delete"
            onPress={() => {
              setMenuVisible(false);
              deleteRecipe();
            }}
          />
        </Menu>
      </View>

      <Surface style={styles.section} elevation={1}>
        <Text variant="titleSmall" style={styles.sectionLabel}>INGREDIENTS</Text>
        {ingredients.map((ing, index) => (
          <View key={ing.recipeIngredientId}>
            {index > 0 && <Divider style={styles.itemDivider} />}
            <View style={styles.ingredientRow}>
              <Checkbox
                status={ing.isBulk ? 'checked' : 'unchecked'}
                onPress={() => toggleBulk(ing)}
                color="#2E7D32"
              />
              <View style={styles.ingredientText}>
                <Text style={styles.ingredientName}>
                  {ing.amount} {ing.name}
                </Text>
                {ing.isBulk && (
                  <Text style={styles.bulkLabel}>in pantry</Text>
                )}
              </View>
            </View>
          </View>
        ))}
      </Surface>

      <Surface style={styles.section} elevation={1}>
        <Text variant="titleSmall" style={styles.sectionLabel}>INSTRUCTIONS</Text>
        {steps.map((step, index) => (
          <View key={step.id}>
            {index > 0 && <Divider style={styles.itemDivider} />}
            <View style={styles.stepRow}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>{step.step_number}</Text>
              </View>
              <Text style={styles.stepText}>{step.instruction}</Text>
            </View>
          </View>
        ))}
      </Surface>

      <Button
        mode="contained"
        onPress={addToMealList}
        style={styles.mealButton}
        contentStyle={styles.mealButtonContent}
        icon="plus"
      >
        Add to Meal List
      </Button>
    </ScrollView>
  );
}

function combineAmounts(existing: string | null, adding: string): string {
  if (!existing) return adding;

  const parseAmount = (s: string) => {
    const match = s.match(/^([\d.\/]+)\s*(.*)$/);
    if (!match) return null;
    let num = 0;
    if (match[1].includes('/')) {
      const [a, b] = match[1].split('/');
      num = Number(a) / Number(b);
    } else {
      num = Number(match[1]);
    }
    return { num, unit: match[2].trim().toLowerCase() };
  };

  const a = parseAmount(existing);
  const b = parseAmount(adding);

  if (a && b && a.unit === b.unit && !isNaN(a.num) && !isNaN(b.num)) {
    const total = a.num + b.num;
    const display = Number.isInteger(total) ? total.toString() : total.toFixed(1);
    return a.unit ? `${display} ${a.unit}` : display;
  }

  return `${existing} + ${adding}`;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
  },
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    flex: 1,
    fontWeight: '700',
    color: '#1B1B1B',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionLabel: {
    color: '#9E9E9E',
    fontWeight: '700',
    letterSpacing: 1,
    fontSize: 12,
    marginBottom: 12,
  },
  itemDivider: {
    backgroundColor: '#F5F5F5',
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  ingredientText: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  ingredientName: {
    fontSize: 15,
    color: '#424242',
  },
  bulkLabel: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '500',
  },
  stepRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    gap: 12,
  },
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2E7D32',
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: '#424242',
  },
  mealButton: {
    marginTop: 8,
    borderRadius: 12,
  },
  mealButtonContent: {
    paddingVertical: 6,
  },
});
