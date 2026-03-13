import { useState, useEffect } from 'react';
import { StyleSheet, View, Alert as RNAlert } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import {
  TextInput,
  Button,
  Text,
  IconButton,
  Chip,
  Divider,
} from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useDatabase } from '@/db/DatabaseProvider';
import { GROCERY_SECTIONS, type GrocerySection } from '@/db/schema';
import { UNITS } from '@/db/units';

type IngredientEntry = {
  name: string;
  amount: string;
  unit: string;
  ingredientId?: number;
  section?: GrocerySection;
  needsSection: boolean;
};

type Suggestion = {
  id: number;
  name: string;
  section: string;
};

export default function NewRecipeScreen() {
  const db = useDatabase();
  const router = useRouter();
  const params = useLocalSearchParams<{ prefill?: string }>();

  const [name, setName] = useState('');
  const [ingredients, setIngredients] = useState<IngredientEntry[]>([]);
  const [steps, setSteps] = useState<string[]>(['']);

  useEffect(() => {
    if (params.prefill) {
      try {
        const data = JSON.parse(params.prefill);
        if (data.name) setName(data.name);
        if (data.steps?.length) setSteps(data.steps);
        if (data.ingredients?.length) {
          resolveIngredients(data.ingredients);
        }
      } catch {}
    }
  }, []);

  async function resolveIngredients(
    parsed: { name: string; amount: string; unit: string }[]
  ) {
    const resolved: IngredientEntry[] = [];
    for (const ing of parsed) {
      const match = await db.getFirstAsync<{ id: number; section: string }>(
        'SELECT id, section FROM ingredients WHERE name = $name COLLATE NOCASE',
        { $name: ing.name }
      );
      resolved.push({
        name: ing.name,
        amount: ing.amount,
        unit: ing.unit,
        ingredientId: match?.id,
        section: match?.section as GrocerySection | undefined,
        needsSection: !match,
      });
    }
    setIngredients(resolved);
  }

  // Current ingredient input
  const [ingredientName, setIngredientName] = useState('');
  const [ingredientAmount, setIngredientAmount] = useState('');
  const [ingredientUnit, setIngredientUnit] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  async function searchIngredients(query: string) {
    setIngredientName(query);
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    const results = await db.getAllAsync<Suggestion>(
      'SELECT id, name, section FROM ingredients WHERE name LIKE $query ORDER BY name LIMIT 10',
      { $query: `%${query}%` }
    );
    setSuggestions(results);
  }

  function formatAmount(amount: string, unit: string): string {
    return unit ? `${amount} ${unit}` : amount;
  }

  function addIngredient(suggestion?: Suggestion) {
    const ingredientNameTrimmed = (suggestion?.name || ingredientName).trim();
    if (!ingredientNameTrimmed || !ingredientAmount.trim()) return;

    setIngredients([
      ...ingredients,
      {
        name: ingredientNameTrimmed,
        amount: ingredientAmount.trim(),
        unit: ingredientUnit,
        ingredientId: suggestion?.id,
        section: suggestion?.section as GrocerySection | undefined,
        needsSection: !suggestion,
      },
    ]);
    setIngredientName('');
    setIngredientAmount('');
    setIngredientUnit('');
    setSuggestions([]);
  }

  function removeIngredient(index: number) {
    setIngredients(ingredients.filter((_, i) => i !== index));
  }

  function pickSection(index: number) {
    const options = [...GROCERY_SECTIONS];
    RNAlert.alert('Pick Section', 'Which grocery store section?', [
      ...options.map((section) => ({
        text: section,
        onPress: () => {
          const updated = [...ingredients];
          updated[index] = { ...updated[index], section, needsSection: false };
          setIngredients(updated);
        },
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  }

  function pickUnit() {
    const unitOptions = UNITS.filter((u) => u !== '');
    RNAlert.alert('Select Unit', undefined, [
      ...unitOptions.map((unit) => ({
        text: unit,
        onPress: () => setIngredientUnit(unit),
      })),
      {
        text: 'Custom...',
        onPress: () => {
          RNAlert.prompt('Custom Unit', 'Enter a custom unit:', (text) => {
            if (text?.trim()) setIngredientUnit(text.trim());
          });
        },
      },
      {
        text: '(none)',
        onPress: () => setIngredientUnit(''),
      },
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  }

  function updateStep(index: number, text: string) {
    const updated = [...steps];
    updated[index] = text;
    setSteps(updated);
  }

  function addStep() {
    setSteps([...steps, '']);
  }

  function removeStep(index: number) {
    if (steps.length <= 1) return;
    setSteps(steps.filter((_, i) => i !== index));
  }

  async function saveRecipe() {
    if (!name.trim()) return;
    if (ingredients.length === 0) return;
    if (ingredients.some((i) => i.needsSection)) return;

    const nonEmptySteps = steps.filter((s) => s.trim());
    if (nonEmptySteps.length === 0) return;

    const result = await db.runAsync(
      'INSERT INTO recipes (name) VALUES ($name)',
      { $name: name.trim() }
    );
    const recipeId = result.lastInsertRowId;

    for (const ing of ingredients) {
      let ingredientId = ing.ingredientId;

      if (!ingredientId) {
        const ingResult = await db.runAsync(
          'INSERT OR IGNORE INTO ingredients (name, section) VALUES ($name, $section)',
          { $name: ing.name.toLowerCase(), $section: ing.section! }
        );
        if (ingResult.lastInsertRowId) {
          ingredientId = ingResult.lastInsertRowId;
        } else {
          const existing = await db.getFirstAsync<{ id: number }>(
            'SELECT id FROM ingredients WHERE name = $name COLLATE NOCASE',
            { $name: ing.name }
          );
          ingredientId = existing!.id;
        }
      }

      await db.runAsync(
        'INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount) VALUES ($recipeId, $ingredientId, $amount)',
        {
          $recipeId: recipeId,
          $ingredientId: ingredientId,
          $amount: formatAmount(ing.amount, ing.unit),
        }
      );
    }

    for (let i = 0; i < nonEmptySteps.length; i++) {
      await db.runAsync(
        'INSERT INTO recipe_steps (recipe_id, step_number, instruction) VALUES ($recipeId, $stepNumber, $instruction)',
        { $recipeId: recipeId, $stepNumber: i + 1, $instruction: nonEmptySteps[i].trim() }
      );
    }

    router.back();
  }

  const canSave =
    name.trim() &&
    ingredients.length > 0 &&
    !ingredients.some((i) => i.needsSection) &&
    steps.some((s) => s.trim());

  return (
    <KeyboardAwareScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
      enableOnAndroid
      extraScrollHeight={120}
    >
      <TextInput
        label="Recipe Name"
        value={name}
        onChangeText={setName}
        mode="outlined"
        style={styles.input}
      />

      <Divider style={styles.divider} />
      <Text variant="titleMedium" style={styles.sectionTitle}>Ingredients</Text>

      {ingredients.map((ing, index) => (
        <View key={index} style={styles.ingredientRow}>
          <View style={styles.ingredientInfo}>
            <Text>{formatAmount(ing.amount, ing.unit)} {ing.name}</Text>
            <Chip
              compact
              onPress={() => pickSection(index)}
              style={ing.needsSection ? styles.sectionChip : styles.sectionChipAssigned}
              textStyle={styles.sectionChipText}
            >
              {ing.needsSection ? 'Pick section' : ing.section}
            </Chip>
          </View>
          <IconButton icon="close" size={18} onPress={() => removeIngredient(index)} />
        </View>
      ))}

      <View style={styles.addIngredientRow}>
        <TextInput
          label="Qty"
          value={ingredientAmount}
          onChangeText={setIngredientAmount}
          mode="outlined"
          style={styles.amountInput}
          dense
          keyboardType="numeric"
        />
        <TextInput
          label="Unit"
          value={ingredientUnit}
          mode="outlined"
          style={styles.unitInput}
          dense
          showSoftInputOnFocus={false}
          onPressIn={() => pickUnit()}
          onChangeText={setIngredientUnit}
        />
        <TextInput
          label="Ingredient"
          value={ingredientName}
          onChangeText={searchIngredients}
          mode="outlined"
          style={styles.nameInput}
          dense
        />
        <IconButton icon="plus" size={20} onPress={() => addIngredient()} />
      </View>

      {suggestions.length > 0 && (
        <View style={styles.suggestions}>
          {suggestions.map((s) => (
            <Chip
              key={s.id}
              onPress={() => addIngredient(s)}
              style={styles.suggestionChip}
              compact
            >
              {s.name} ({s.section})
            </Chip>
          ))}
        </View>
      )}

      <Divider style={styles.divider} />
      <Text variant="titleMedium" style={styles.sectionTitle}>Instructions</Text>

      {steps.map((step, index) => (
        <View key={index} style={styles.stepRow}>
          <Text style={styles.stepNumber}>{index + 1}.</Text>
          <TextInput
            value={step}
            onChangeText={(text) => updateStep(index, text)}
            mode="outlined"
            style={styles.stepInput}
            multiline
            dense
          />
          {steps.length > 1 && (
            <IconButton icon="close" size={18} onPress={() => removeStep(index)} />
          )}
        </View>
      ))}

      <Button mode="text" onPress={addStep} style={styles.addStepButton}>
        Add Step
      </Button>

      <Button
        mode="contained"
        onPress={saveRecipe}
        disabled={!canSave}
        style={styles.saveButton}
      >
        Save Recipe
      </Button>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  input: {
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  divider: {
    marginVertical: 20,
    backgroundColor: '#F0F0F0',
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: '700',
    color: '#1B1B1B',
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingLeft: 4,
    paddingRight: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 6,
    paddingHorizontal: 12,
  },
  ingredientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  sectionChip: {
    backgroundColor: '#FFF3E0',
    borderRadius: 6,
  },
  sectionChipAssigned: {
    backgroundColor: '#E8F5E9',
    borderRadius: 6,
  },
  sectionChipText: {
    fontSize: 11,
    fontWeight: '500',
  },
  addIngredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  amountInput: {
    width: 55,
    backgroundColor: '#FFFFFF',
  },
  unitInput: {
    minWidth: 60,
    flexShrink: 1,
    backgroundColor: '#FFFFFF',
  },
  nameInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  suggestionChip: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  stepNumber: {
    marginTop: 18,
    marginRight: 10,
    fontWeight: '700',
    color: '#2E7D32',
    fontSize: 15,
  },
  stepInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  addStepButton: {
    alignSelf: 'flex-start',
  },
  saveButton: {
    marginTop: 28,
    borderRadius: 12,
    paddingVertical: 2,
  },
});
