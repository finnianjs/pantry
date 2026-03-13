import { useState } from 'react';
import { StyleSheet, View, Image, Alert } from 'react-native';
import { Button, Text, TextInput, ActivityIndicator } from 'react-native-paper';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useDatabase } from '@/db/DatabaseProvider';
import { GROCERY_SECTIONS } from '@/db/schema';
import { UNITS } from '@/db/units';

type ParsedRecipe = {
  name: string;
  ingredients: { name: string; amount: string; unit: string }[];
  steps: string[];
};

export default function FromPhotoScreen() {
  const db = useDatabase();
  const router = useRouter();

  const [images, setImages] = useState<{ uri: string; base64: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function getApiKey(): Promise<string | null> {
    const row = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM settings WHERE key = 'claude_api_key'"
    );
    return row?.value || null;
  }

  async function promptForApiKey(): Promise<string | null> {
    return new Promise((resolve) => {
      Alert.prompt(
        'Claude API Key',
        'Enter your Anthropic API key to enable recipe scanning. You can get one at console.anthropic.com.',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
          {
            text: 'Save',
            onPress: async (key?: string) => {
              if (key?.trim()) {
                await db.runAsync(
                  "INSERT OR REPLACE INTO settings (key, value) VALUES ('claude_api_key', $value)",
                  { $value: key.trim() }
                );
                resolve(key.trim());
              } else {
                resolve(null);
              }
            },
          },
        ],
        'plain-text'
      );
    });
  }

  async function addImage(useCamera: boolean) {
    if (images.length >= 3) {
      Alert.alert('Limit reached', 'You can include up to 3 photos per recipe.');
      return;
    }

    if (useCamera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Camera access is required to take photos.');
        return;
      }
    }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.8,
          base64: true,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.8,
          base64: true,
        });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setImages((prev) => [...prev, { uri: asset.uri, base64: asset.base64! }]);
    setError(null);
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function submitPhotos() {
    if (images.length === 0) return;
    await parseRecipe(images.map((img) => img.base64));
  }

  async function parseRecipe(base64Images: string[]) {
    let apiKey = await getApiKey();
    if (!apiKey) {
      apiKey = await promptForApiKey();
      if (!apiKey) return;
    }

    setLoading(true);
    setError(null);

    const knownUnits = UNITS.filter((u) => u !== '').join(', ');
    const sections = GROCERY_SECTIONS.join(', ');

    const imageBlocks = base64Images.map((data) => ({
      type: 'image' as const,
      source: {
        type: 'base64' as const,
        media_type: 'image/jpeg' as const,
        data,
      },
    }));

    const multiPageNote = base64Images.length > 1
      ? ` The recipe spans ${base64Images.length} photos/pages — combine them into a single recipe.`
      : '';

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          messages: [
            {
              role: 'user',
              content: [
                ...imageBlocks,
                {
                  type: 'text',
                  text: `Extract the recipe from ${base64Images.length > 1 ? 'these images' : 'this image'} and return it as JSON.${multiPageNote} The recipe is vegan — if it contains non-vegan ingredients, substitute them with vegan alternatives.

Return ONLY valid JSON in this exact format, no other text:
{
  "name": "Recipe Name",
  "ingredients": [
    {"name": "ingredient name (lowercase, singular where appropriate)", "amount": "numeric amount as string", "unit": "unit from the list below, or empty string if none"}
  ],
  "steps": ["Step 1 instruction", "Step 2 instruction"]
}

Valid units: ${knownUnits}
If the unit in the recipe doesn't match any of these, use the closest match or leave as empty string and include the unit in the amount field.

For ingredient names, use common simple names (e.g., "onion" not "medium yellow onion", "garlic" not "garlic cloves"). Keep the specific quantity info in the amount field.

Grocery store sections for reference (don't include in output, just for context on naming): ${sections}`,
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        if (response.status === 529 || response.status === 503) {
          throw new Error('The API is temporarily overloaded. Wait a moment and try again.');
        }
        if (response.status === 401) {
          await db.runAsync("DELETE FROM settings WHERE key = 'claude_api_key'");
          throw new Error('Invalid API key. Please try again with a valid key.');
        }
        const errBody = await response.text();
        throw new Error(`API error (${response.status}): ${errBody}`);
      }

      const data = await response.json();
      const text = data.content?.[0]?.text;
      if (!text) throw new Error('No response from API');

      // Extract JSON from the response (handle potential markdown code blocks)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Could not parse recipe from response');

      const parsed: ParsedRecipe = JSON.parse(jsonMatch[0]);

      if (!parsed.name || !parsed.ingredients?.length || !parsed.steps?.length) {
        throw new Error('Recipe appears incomplete. Try a clearer photo.');
      }

      // Navigate to new recipe screen with pre-filled data
      router.replace({
        pathname: '/recipe/new',
        params: { prefill: JSON.stringify(parsed) },
      });
    } catch (err: any) {
      setError(err.message || 'Failed to parse recipe');
      setLoading(false);
    }
  }

  return (
    <KeyboardAwareScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
    >
      {!loading && (
        <>
          {images.length === 0 && (
            <Text variant="bodyLarge" style={styles.description}>
              Take a photo of a recipe or choose one from your photo library.
              Works with cookbooks, handwritten recipes, and screenshots.
              {'\n\n'}For multi-page recipes, add up to 3 photos.
            </Text>
          )}

          {images.map((img, index) => (
            <View key={index} style={styles.previewRow}>
              <Image source={{ uri: img.uri }} style={styles.preview} resizeMode="contain" />
              <Button
                mode="text"
                icon="close"
                compact
                onPress={() => removeImage(index)}
                textColor="#D32F2F"
              >
                Remove
              </Button>
            </View>
          ))}

          {images.length < 3 && (
            <View style={styles.pickSection}>
              <Button
                mode={images.length === 0 ? 'contained' : 'outlined'}
                icon="camera"
                onPress={() => addImage(true)}
                style={styles.pickButton}
                contentStyle={styles.pickButtonContent}
              >
                {images.length === 0 ? 'Take Photo' : 'Add Another Photo'}
              </Button>
              <Button
                mode="outlined"
                icon="image"
                onPress={() => addImage(false)}
                style={styles.pickButton}
                contentStyle={styles.pickButtonContent}
              >
                {images.length === 0 ? 'Choose from Library' : 'Add from Library'}
              </Button>
            </View>
          )}

          {images.length > 0 && (
            <Button
              mode="contained"
              icon="text-recognition"
              onPress={submitPhotos}
              style={styles.submitButton}
              contentStyle={styles.pickButtonContent}
            >
              Read Recipe ({images.length} {images.length === 1 ? 'photo' : 'photos'})
            </Button>
          )}
        </>
      )}

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text variant="bodyMedium" style={styles.loadingText}>
            Reading recipe...
          </Text>
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text variant="bodyMedium" style={styles.errorText}>{error}</Text>
          {images.length > 0 && (
            <Button
              mode="contained"
              onPress={() => {
                setError(null);
                submitPhotos();
              }}
              style={styles.retryButton}
            >
              Retry
            </Button>
          )}
          <Button
            mode="outlined"
            onPress={() => {
              setImages([]);
              setError(null);
            }}
            style={styles.retryButton}
          >
            Start Over
          </Button>
        </View>
      )}
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
  description: {
    color: '#616161',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  pickSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 16,
    gap: 12,
  },
  pickButton: {
    borderRadius: 12,
    width: '100%',
  },
  pickButtonContent: {
    paddingVertical: 6,
  },
  previewRow: {
    alignItems: 'center',
    marginBottom: 8,
  },
  preview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
  },
  submitButton: {
    marginTop: 20,
    borderRadius: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 32,
  },
  loadingText: {
    color: '#757575',
  },
  errorContainer: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  errorText: {
    color: '#D32F2F',
    textAlign: 'center',
  },
  retryButton: {
    borderRadius: 12,
  },
});
