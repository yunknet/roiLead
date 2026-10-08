import { View, Text, TouchableOpacity, StyleSheet, Alert, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import { useThemeColors } from '../../theme/colors';
import { Feather } from '@expo/vector-icons';

export default function ProfileScreen() {
  const { user, userEmail, accessInfo, signOut } = useAuth();
  const { pushEnabled, registerForPushNotifications, unregisterForPushNotifications } = useNotifications(user?.id || null);
  const colors = useThemeColors();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert(
      'Sair',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: async () => {
          await signOut();
          router.replace('/(auth)/login');
        } },
      ]
    );
  };

  const handleTogglePush = async () => {
    if (!pushEnabled) {
      await registerForPushNotifications();
    } else {
      await unregisterForPushNotifications();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
        <Feather name="user" size={24} color={colors.text} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Perfil</Text>
      </View>

      {/* Info do usuário */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={[styles.avatarContainer, { backgroundColor: colors.primary + '20' }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>
            {accessInfo?.full_name?.charAt(0)?.toUpperCase() || '?'}
          </Text>
        </View>
        <Text style={[styles.userName, { color: colors.text }]}>{accessInfo?.full_name || 'Sem nome'}</Text>
        <Text style={[styles.userEmail, { color: colors.textMuted }]}>{userEmail}</Text>
        {accessInfo?.niches && (
          <View style={styles.nichesContainer}>
            {accessInfo.niches.map(niche => (
              <View key={niche} style={[styles.nicheBadge, { backgroundColor: colors.primary + '15' }]}>
                <Text style={[styles.nicheBadgeText, { color: colors.primary }]}>{niche}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Configurações */}
      <View style={[styles.settingsCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <Text style={[styles.settingsTitle, { color: colors.textMuted }]}>Configurações</Text>

        <View style={styles.settingRow}>
          <View style={styles.settingTextContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Feather name="bell" size={16} color={colors.text} />
              <Text style={[styles.settingLabel, { color: colors.text }]}>Notificações Push</Text>
            </View>
            <Text style={[styles.settingDescription, { color: colors.textMuted }]}>
              Receba avisos quando for sua vez
            </Text>
          </View>
          <Switch
            value={pushEnabled}
            onValueChange={handleTogglePush}
            trackColor={{ false: colors.border, true: colors.primary + '60' }}
            thumbColor={pushEnabled ? colors.primary : colors.textDimmed}
          />
        </View>
      </View>

      {/* Botão de logout */}
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
        activeOpacity={0.7}
      >
        <Text style={[styles.logoutButtonText, { color: colors.danger }]}>Sair da conta</Text>
      </TouchableOpacity>

      <Text style={[styles.version, { color: colors.textDimmed }]}>Cúpula de Leads v1.0.0</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 60,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 12,
  },
  nichesContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  nicheBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  nicheBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  settingsCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  settingsTitle: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
  },
  logoutButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 24,
  },
});
