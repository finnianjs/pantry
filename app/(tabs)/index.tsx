import { FlatList, StyleSheet, View } from 'react-native';
import { FAB, Text, Card, useTheme, Portal, Modal, Button } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useDatabase } from '@/db/DatabaseProvider';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type Recipe = {
  id: number;
  name: string;
  created_at: string;
  needed_count: number;
};

export default function RecipesScreen() {
  const db = useDatabase();
  const router = useRouter();
  const theme = useTheme();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [showMenu, setShowMenu] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadRecipes();
    }, [])
  );

  async function loadRecipes() {
    const result = await db.getAllAsync<Recipe>(
      `SELECT r.*,
              COUNT(CASE WHEN i.is_bulk = 0 THEN 1 END) as needed_count
       FROM recipes r
       LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
       LEFT JOIN ingredients i ON ri.ingredient_id = i.id
       GROUP BY r.id
       ORDER BY r.created_at DESC`
    );
    setRecipes(result);
  }

  return (
    <View style={styles.container}>
      {recipes.length === 0 ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="book-open-variant" size={64} color="#E0E0E0" />
          <Text variant="titleMedium" style={styles.emptyTitle}>No recipes yet</Text>
          <Text variant="bodyMedium" style={styles.emptyText}>
            Tap + to add your first recipe
          </Text>
        </View>
      ) : (
        <FlatList
          data={recipes}
          contentContainerStyle={styles.list}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <Card
              style={styles.card}
              mode="elevated"
              onPress={() => router.push(`/recipe/${item.id}`)}
            >
              <Card.Title
                title={item.name}
                titleStyle={styles.cardTitle}
                subtitle={item.needed_count > 0 ? `${item.needed_count} ingredient${item.needed_count !== 1 ? 's' : ''} needed` : 'All ingredients in pantry'}
                subtitleStyle={styles.cardSubtitle}
                right={(props) => (
                  <MaterialCommunityIcons
                    {...props}
                    name="chevron-right"
                    size={22}
                    color="#BDBDBD"
                    style={styles.cardChevron}
                  />
                )}
              />
            </Card>
          )}
        />
      )}
      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color="#FFFFFF"
        onPress={() => setShowMenu(true)}
      />
      <Portal>
        <Modal
          visible={showMenu}
          onDismiss={() => setShowMenu(false)}
          contentContainerStyle={styles.menuModal}
        >
          <Text variant="titleMedium" style={styles.menuTitle}>Add Recipe</Text>
          <Button
            mode="outlined"
            icon="pencil"
            onPress={() => { setShowMenu(false); router.push('/recipe/new'); }}
            style={styles.menuButton}
            contentStyle={styles.menuButtonContent}
          >
            Enter Manually
          </Button>
          <Button
            mode="outlined"
            icon="camera"
            onPress={() => { setShowMenu(false); router.push('/recipe/from-photo'); }}
            style={styles.menuButton}
            contentStyle={styles.menuButtonContent}
          >
            From Photo
          </Button>
        </Modal>
      </Portal>
    </View>
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
  },
  list: {
    padding: 16,
    paddingBottom: 96,
  },
  card: {
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#9E9E9E',
  },
  cardChevron: {
    marginRight: 12,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    borderRadius: 16,
  },
  menuModal: {
    backgroundColor: '#FFFFFF',
    margin: 32,
    padding: 24,
    borderRadius: 16,
    gap: 12,
  },
  menuTitle: {
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  menuButton: {
    borderRadius: 12,
  },
  menuButtonContent: {
    paddingVertical: 6,
    justifyContent: 'flex-start',
  },
});
