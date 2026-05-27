import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { useThemeColors } from '../theme/colors';

export default function IndexScreen() {
  const { session, loading, userEmail, checkAccess } = useAuth();
  const colors = useThemeColors();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const checkAndRedirect = async () => {
      if (!session) {
        router.replace('/(auth)/login');
      } else {
        if (userEmail) {
          const { hasAccess } = await checkAccess(userEmail);
          if (hasAccess) {
            router.replace('/(tabs)');
          } else {
            router.replace('/(auth)/restricted');
          }
        } else {
          router.replace('/(auth)/login');
        }
      }
    };

    checkAndRedirect();
  }, [session, loading, userEmail, checkAccess]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}
