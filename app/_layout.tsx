import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { DatabaseProvider } from '@/db/DatabaseProvider';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

const theme = {
  ...MD3LightTheme,
  roundness: 12,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#2E7D32',
    primaryContainer: '#E8F5E9',
    secondary: '#558B2F',
    secondaryContainer: '#F1F8E9',
    surface: '#FFFFFF',
    surfaceVariant: '#F5F5F5',
    background: '#FAFAFA',
    outline: '#E0E0E0',
  },
};

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <PaperProvider theme={theme}>
      <DatabaseProvider>
        <Stack
          screenOptions={{
            headerShadowVisible: false,
            headerStyle: { backgroundColor: '#FAFAFA' },
            headerTintColor: '#2E7D32',
            contentStyle: { backgroundColor: '#FAFAFA' },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="recipe/new" options={{ title: 'New Recipe', presentation: 'modal' }} />
          <Stack.Screen name="recipe/[id]" options={{ title: '', headerBackTitle: 'Back' }} />
          <Stack.Screen name="recipe/from-photo" options={{ title: 'Recipe from Photo', presentation: 'modal' }} />
          <Stack.Screen name="recipe/edit" options={{ title: 'Edit Recipe', presentation: 'modal' }} />
        </Stack>
      </DatabaseProvider>
    </PaperProvider>
  );
}
