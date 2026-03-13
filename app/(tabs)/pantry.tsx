import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Text, List, IconButton, Divider, Searchbar, Surface } from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import { useDatabase } from '@/db/DatabaseProvider';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type BulkIngredient = {
  id: number;
  name: string;
  section: string;
};

export default function PantryScreen() {
  const db = useDatabase();
  const [ingredients, setIngredients] = useState<BulkIngredient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadPantry();
    }, [])
  );

  async function loadPantry() {
    const result = await db.getAllAsync<BulkIngredient>(
      'SELECT id, name, section FROM ingredients WHERE is_bulk = 1 ORDER BY section, name'
    );
    setIngredients(result);
  }

  async function markRunOut(ingredient: BulkIngredient) {
    await db.runAsync('UPDATE ingredients SET is_bulk = 0 WHERE id = $id', {
      $id: ingredient.id,
    });

    await db.runAsync(
      'INSERT INTO grocery_items (ingredient_id, amount, section) VALUES ($ingredientId, $amount, $section)',
      {
        $ingredientId: ingredient.id,
        $amount: '1',
        $section: ingredient.section,
      }
    );

    loadPantry();
  }

  const filtered = searchQuery
    ? ingredients.filter((i) =>
        i.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : ingredients;

  const grouped = filtered.reduce<Record<string, BulkIngredient[]>>((acc, ing) => {
    if (!acc[ing.section]) acc[ing.section] = [];
    acc[ing.section].push(ing);
    return acc;
  }, {});

  const sections = Object.keys(grouped).sort();

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search pantry..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        style={styles.searchbar}
        inputStyle={styles.searchbarInput}
        elevation={0}
      />
      {ingredients.length === 0 ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="archive-outline" size={64} color="#E0E0E0" />
          <Text variant="titleMedium" style={styles.emptyTitle}>Pantry is empty</Text>
          <Text variant="bodyMedium" style={styles.emptyText}>
            Mark ingredients as bulk from a recipe to stock your pantry
          </Text>
        </View>
      ) : (
        <FlatList
          data={sections}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.list}
          renderItem={({ item: section }) => (
            <Surface style={styles.sectionCard} elevation={1}>
              <Text style={styles.sectionHeader}>{section}</Text>
              {grouped[section].map((ing, index) => (
                <View key={ing.id}>
                  {index > 0 && <Divider style={styles.itemDivider} />}
                  <View style={styles.itemRow}>
                    <Text style={styles.itemName}>{ing.name}</Text>
                    <IconButton
                      icon="minus-circle-outline"
                      iconColor="#EF5350"
                      size={20}
                      onPress={() => markRunOut(ing)}
                    />
                  </View>
                </View>
              ))}
            </Surface>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  searchbar: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  searchbarInput: {
    fontSize: 15,
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
    paddingBottom: 24,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  sectionHeader: {
    fontWeight: '700',
    fontSize: 12,
    color: '#9E9E9E',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  itemDivider: {
    backgroundColor: '#F5F5F5',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  itemName: {
    fontSize: 15,
    color: '#424242',
    textTransform: 'capitalize',
  },
});
