import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { AuthProvider } from '../hooks/useAuth';
import { useThemeColors } from '../theme/colors';

export default function RootLayout() {
  const colors = useThemeColors();
  const scheme = useColorScheme();

  return (
    <AuthProvider>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="lead/[id]"
          options={{
            headerShown: true,
            headerTitle: 'Detalhe do Lead',
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.text,
            headerTitleStyle: { fontWeight: '600' },
            presentation: 'modal',
          }}
        />
      </Stack>
    </AuthProvider>
  );
}
