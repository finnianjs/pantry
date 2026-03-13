import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View, KeyboardAvoidingView, Platform, Alert as RNAlert } from 'react-native';
import {
  Text,
  IconButton,
  Divider,
  TextInput,
  Button,
  Chip,
  Surface,
} from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import { useDatabase } from '@/db/DatabaseProvider';
import { GROCERY_SECTIONS, type GrocerySection } from '@/db/schema';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type GroceryItem = {
  id: number;
  ingredientId: number | null;
  customName: string | null;
  amount: string | null;
  section: string;
  isBulk: boolean;
  name: string;
};

export default function GroceryScreen() {
  const db = useDatabase();
  const [items, setItems] = useState<GroceryItem[]>([]);

  const [addName, setAddName] = useState('');
  const [addAmount, setAddAmount] = useState('');
  const [addSection, setAddSection] = useState<GrocerySection>('Pantry');
  const [showAddForm, setShowAddForm] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadGroceryList();
    }, [])
  );

  async function loadGroceryList() {
    const result = await db.getAllAsync<{
      id: number;
      ingredient_id: number | null;
      custom_name: string | null;
      amount: string | null;
      section: string;
      ingredient_name: string | null;
      is_bulk: number | null;
    }>(
      `SELECT g.id, g.ingredient_id, g.custom_name, g.amount, g.section,
              i.name as ingredient_name, i.is_bulk
       FROM grocery_items g
       LEFT JOIN ingredients i ON g.ingredient_id = i.id
       ORDER BY g.section, COALESCE(i.name, g.custom_name)`
    );

    setItems(
      result.map((r) => ({
        id: r.id,
        ingredientId: r.ingredient_id,
        customName: r.custom_name,
        amount: r.amount,
        section: r.section,
        isBulk: r.is_bulk === 1,
        name: r.ingredient_name || r.custom_name || 'Unknown',
      }))
    );
  }

  async function checkOffItem(item: GroceryItem) {
    if (item.ingredientId && item.isBulk) {
      await db.runAsync('UPDATE ingredients SET is_bulk = 1 WHERE id = $id', {
        $id: item.ingredientId,
      });
    }

    await db.runAsync('DELETE FROM grocery_items WHERE id = $id', {
      $id: item.id,
    });

    loadGroceryList();
  }

  async function markAsBulkAndCheckOff(item: GroceryItem) {
    if (item.ingredientId) {
      await db.runAsync('UPDATE ingredients SET is_bulk = 1 WHERE id = $id', {
        $id: item.ingredientId,
      });
    }

    await db.runAsync('DELETE FROM grocery_items WHERE id = $id', {
      $id: item.id,
    });

    loadGroceryList();
  }

  function pickSection() {
    RNAlert.alert('Pick Section', 'Which grocery store section?', [
      ...GROCERY_SECTIONS.map((section) => ({
        text: section,
        onPress: () => setAddSection(section),
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  }

  async function addCustomItem() {
    if (!addName.trim()) return;

    const existing = await db.getFirstAsync<{ id: number; section: string }>(
      'SELECT id, section FROM ingredients WHERE name = $name COLLATE NOCASE',
      { $name: addName.trim() }
    );

    if (existing) {
      await db.runAsync(
        'INSERT INTO grocery_items (ingredient_id, amount, section) VALUES ($ingredientId, $amount, $section)',
        {
          $ingredientId: existing.id,
          $amount: addAmount.trim() || null,
          $section: existing.section,
        }
      );
    } else {
      const ingResult = await db.runAsync(
        'INSERT INTO ingredients (name, section) VALUES ($name, $section)',
        { $name: addName.trim().toLowerCase(), $section: addSection }
      );
      await db.runAsync(
        'INSERT INTO grocery_items (ingredient_id, amount, section) VALUES ($ingredientId, $amount, $section)',
        {
          $ingredientId: ingResult.lastInsertRowId,
          $amount: addAmount.trim() || null,
          $section: addSection,
        }
      );
    }

    setAddName('');
    setAddAmount('');
    setShowAddForm(false);
    loadGroceryList();
  }

  const grouped = items.reduce<Record<string, GroceryItem[]>>((acc, item) => {
    if (!acc[item.section]) acc[item.section] = [];
    acc[item.section].push(item);
    return acc;
  }, {});

  const sections = Object.keys(grouped).sort();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      {items.length === 0 && !showAddForm ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="cart-outline" size={64} color="#E0E0E0" />
          <Text variant="titleMedium" style={styles.emptyTitle}>List is empty</Text>
          <Text variant="bodyMedium" style={styles.emptyText}>
            Add items from recipes or tap the button below
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
              {grouped[section].map((item, index) => (
                <View key={item.id}>
                  {index > 0 && <Divider style={styles.itemDivider} />}
                  <View style={styles.itemRow}>
                    <IconButton
                      icon="checkbox-blank-circle-outline"
                      size={22}
                      iconColor="#BDBDBD"
                      onPress={() => checkOffItem(item)}
                      style={styles.checkIcon}
                    />
                    <Text style={styles.itemName} numberOfLines={1}>
                      {item.amount ? `${item.amount} ${item.name}` : item.name}
                    </Text>
                    {item.ingredientId ? (
                      <Chip
                        compact
                        onPress={() => markAsBulkAndCheckOff(item)}
                        style={styles.bulkChip}
                        textStyle={styles.bulkChipText}
                      >
                        Bulk?
                      </Chip>
                    ) : null}
                  </View>
                </View>
              ))}
            </Surface>
          )}
        />
      )}

      {showAddForm && (
        <Surface style={styles.addForm} elevation={2}>
          <View style={styles.addFormRow}>
            <TextInput
              label="Qty"
              value={addAmount}
              onChangeText={setAddAmount}
              mode="outlined"
              style={styles.addAmountInput}
              dense
            />
            <TextInput
              label="Item name"
              value={addName}
              onChangeText={setAddName}
              mode="outlined"
              style={styles.addNameInput}
              dense
            />
          </View>
          <View style={styles.addFormRow}>
            <Chip onPress={pickSection} style={styles.sectionPickerChip}>
              {addSection}
            </Chip>
            <View style={styles.addFormButtons}>
              <Button mode="text" onPress={() => setShowAddForm(false)}>Cancel</Button>
              <Button mode="contained" onPress={addCustomItem} disabled={!addName.trim()} style={styles.addFormAddBtn}>
                Add
              </Button>
            </View>
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
          Add Item
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
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    paddingLeft: 4,
    marginBottom: 12,
  },
  sectionHeader: {
    fontWeight: '700',
    fontSize: 12,
    color: '#9E9E9E',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
    marginLeft: 12,
  },
  itemDivider: {
    backgroundColor: '#F5F5F5',
    marginLeft: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingRight: 12,
  },
  checkIcon: {
    margin: 0,
  },
  itemName: {
    flex: 1,
    fontSize: 15,
    color: '#424242',
  },
  bulkChip: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
  },
  bulkChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2E7D32',
  },
  addForm: {
    padding: 16,
    paddingBottom: 28,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  addFormRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  addAmountInput: {
    width: 70,
    backgroundColor: '#FFFFFF',
  },
  addNameInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  sectionPickerChip: {
    backgroundColor: '#F5F5F5',
  },
  addFormButtons: {
    flexDirection: 'row',
    gap: 4,
    marginLeft: 'auto',
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
