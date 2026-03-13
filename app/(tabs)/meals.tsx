import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View, KeyboardAvoidingView, Platform } from 'react-native';
import {
  Text,
  IconButton,
  TextInput,
  Button,
  Divider,
  Surface,
} from 'react-native-paper';
import { useFocusEffect, useRouter } from 'expo-router';
import { useDatabase } from '@/db/DatabaseProvider';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type MealItem = {
  id: number;
  recipeId: number | null;
  recipeName: string | null;
  customName: string | null;
  name: string;
};

export default function MealsScreen() {
  const db = useDatabase();
  const router = useRouter();
  const [meals, setMeals] = useState<MealItem[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [customMealName, setCustomMealName] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadMeals();
    }, [])
  );

  async function loadMeals() {
    const result = await db.getAllAsync<{
      id: number;
      recipe_id: number | null;
      custom_name: string | null;
      recipe_name: string | null;
    }>(
      `SELECT m.id, m.recipe_id, m.custom_name, r.name as recipe_name
       FROM meal_list m
       LEFT JOIN recipes r ON m.recipe_id = r.id
       ORDER BY m.added_at DESC`
    );

    setMeals(
      result.map((r) => ({
        id: r.id,
        recipeId: r.recipe_id,
        recipeName: r.recipe_name,
        customName: r.custom_name,
        name: r.recipe_name || r.custom_name || 'Unknown meal',
      }))
    );
  }

  async function checkOffMeal(mealId: number) {
    await db.runAsync('DELETE FROM meal_list WHERE id = $id', {
      $id: mealId,
    });
    loadMeals();
  }

  async function addCustomMeal() {
    if (!customMealName.trim()) return;

    await db.runAsync(
      'INSERT INTO meal_list (custom_name) VALUES ($name)',
      { $name: customMealName.trim() }
    );

    setCustomMealName('');
    setShowAddForm(false);
    loadMeals();
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      {meals.length === 0 && !showAddForm ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="silverware-fork-knife" size={64} color="#E0E0E0" />
          <Text variant="titleMedium" style={styles.emptyTitle}>No meals planned</Text>
          <Text variant="bodyMedium" style={styles.emptyText}>
            Add meals from a recipe or tap the button below
          </Text>
        </View>
      ) : (
        <FlatList
          data={meals}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Surface
              style={styles.mealCard}
              elevation={1}
            >
              <View style={styles.mealRow}>
                <IconButton
                  icon="checkbox-blank-circle-outline"
                  size={22}
                  iconColor="#BDBDBD"
                  onPress={() => checkOffMeal(item.id)}
                  style={styles.checkIcon}
                />
                <View
                  style={styles.mealPressArea}
                  onTouchEnd={() => {
                    if (item.recipeId) router.push(`/recipe/${item.recipeId}`);
                  }}
                >
                  <View style={styles.mealInfo}>
                    <Text style={styles.mealName}>{item.name}</Text>
                    {item.recipeId && (
                      <Text style={styles.mealLink}>View recipe</Text>
                    )}
                  </View>
                  {item.recipeId && (
                    <MaterialCommunityIcons
                      name="chevron-right"
                      size={20}
                      color="#BDBDBD"
                    />
                  )}
                </View>
              </View>
            </Surface>
          )}
        />
      )}

      {showAddForm && (
        <Surface style={styles.addForm} elevation={2}>
          <TextInput
            label="Meal name"
            value={customMealName}
            onChangeText={setCustomMealName}
            mode="outlined"
            style={styles.addInput}
            dense
          />
          <View style={styles.addFormButtons}>
            <Button mode="text" onPress={() => setShowAddForm(false)}>Cancel</Button>
            <Button
              mode="contained"
              onPress={addCustomMeal}
              disabled={!customMealName.trim()}
              style={styles.addFormAddBtn}
            >
              Add
            </Button>
          </View>
        </Surface>
      )}

      {!showAddForm && (
        <Button
          mode="contained-tonal"
          onPress={() => setShowAddForm(true)}
          style={styles.addButton}
          contentStyle={styles.addButtonContent}
          icon="plus"
        >
          Add Custom Meal
        </Button>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 8,
  },
  emptyTitle: {
    color: '#757575',
    marginTop: 8,
  },
  emptyText: {
    color: '#BDBDBD',
    textAlign: 'center',
  },
  list: {
    padding: 16,
    paddingBottom: 80,
  },
  mealCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 10,
    paddingVertical: 4,
    paddingRight: 16,
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkIcon: {
    margin: 0,
  },
  mealPressArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  mealInfo: {
    flex: 1,
    gap: 2,
  },
  mealName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1B1B1B',
  },
  mealLink: {
    fontSize: 13,
    color: '#2E7D32',
    fontWeight: '500',
  },
  addForm: {
    padding: 16,
    paddingBottom: 28,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  addInput: {
    backgroundColor: '#FFFFFF',
  },
  addFormButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
  },
  addFormAddBtn: {
    borderRadius: 8,
  },
  addButton: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
  },
  addButtonContent: {
    paddingVertical: 4,
  },
});
