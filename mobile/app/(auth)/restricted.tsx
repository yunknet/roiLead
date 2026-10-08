import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useThemeColors } from '../../theme/colors';
import { WHATSAPP_ADMIN_NUMBER } from '../../lib/constants';
import { Feather } from '@expo/vector-icons';

export default function RestrictedScreen() {
  const { signOut } = useAuth();
  const colors = useThemeColors();
  const router = useRouter();

  const handleContactAdmin = () => {
    const message = encodeURIComponent('Olá! Gostaria de solicitar acesso à Cúpula de Leads.');
    Linking.openURL(`https://wa.me/${WHATSAPP_ADMIN_NUMBER}?text=${message}`);
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Feather name="lock" size={64} color={colors.danger} style={{ marginBottom: 24 }} />
      <Text style={[styles.title, { color: colors.text }]}>Acesso Restrito</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        Você não tem permissão para acessar a Cúpula de Leads. Entre em contato com o administrador para solicitar acesso.
      </Text>

      <TouchableOpacity style={styles.whatsappButton} onPress={handleContactAdmin} activeOpacity={0.8}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Feather name="message-circle" size={18} color="#FFFFFF" />
          <Text style={styles.whatsappButtonText}>Falar com Administrador</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut} activeOpacity={0.8}>
        <Text style={[styles.logoutButtonText, { color: colors.textDimmed }]}>Sair</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  icon: {
    fontSize: 64,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  whatsappButton: {
    backgroundColor: '#25D366',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginBottom: 16,
    width: '100%',
    alignItems: 'center',
  },
  whatsappButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  logoutButton: {
    paddingVertical: 12,
  },
  logoutButtonText: {
    fontSize: 14,
  },
});
