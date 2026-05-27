import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
  useColorScheme,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useThemeColors } from '../../theme/colors';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [authError, setAuthError] = useState('');
  const { signIn, signUp, signInWithGoogle, checkAccess } = useAuth();
  const colors = useThemeColors();
  const scheme = useColorScheme();
  const router = useRouter();

  const logoSrc = scheme === 'dark'
    ? require('../../public/cupula-logo-dark.png')
    : require('../../public/cupula-logo.png');

  const handleAuth = async () => {
    setAuthError('');
    if (!email.trim() || !password.trim()) {
      setAuthError('Preencha o e-mail e a senha.');
      return;
    }

    setLoading(true);
    try {
      const formattedEmail = email.trim().toLowerCase();
      const { error } = isLoginMode 
        ? await signIn(formattedEmail, password)
        : await signUp(formattedEmail, password);

      if (error) {
        let errorMessage = error;
        if (error.includes('Invalid login credentials')) {
          errorMessage = 'E-mail ou senha incorretos.';
        } else if (error.includes('User already registered')) {
          errorMessage = 'Este e-mail já está cadastrado.';
        } else if (error.includes('Password should be at least')) {
          errorMessage = 'A senha deve ter pelo menos 6 caracteres.';
        }

        setAuthError(errorMessage);
        return;
      }

      // Verifica se o usuário tem acesso à Cúpula
      const { hasAccess } = await checkAccess(formattedEmail);

      if (hasAccess) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)/restricted');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Erro desconhecido.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setAuthError('');
    setLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setAuthError(error);
      } else {
        // Quando a autenticação volta pro app, o useEffect no (index) e useAuth deve capturar
        // Mas podemos forçar o redirecionamento aqui garantindo que checkAccess vai rodar
        // Se a sessão for definida, vamos para o root e ele decide
        router.replace('/');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Erro desconhecido com Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {/* Logo / Título */}
        <View style={styles.header}>
          <Image source={logoSrc} style={styles.logo} resizeMode="contain" />
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {isLoginMode ? 'Acesse seu painel de leads qualificados' : 'Crie sua conta para acessar os leads'}
          </Text>
        </View>

        {/* Botão Google */}
        <TouchableOpacity
          style={[styles.googleButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
          onPress={handleGoogle}
          disabled={loading}
        >
          <AntDesign name="google" size={20} color={colors.text} style={{ marginRight: 10 }} />
          <Text style={[styles.googleButtonText, { color: colors.text }]}>
            {isLoginMode ? 'Entrar com Google' : 'Cadastrar com Google'}
          </Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={[styles.line, { backgroundColor: colors.border }]} />
          <Text style={[styles.dividerText, { color: colors.textDimmed, backgroundColor: colors.background }]}>
            Ou continue com e-mail
          </Text>
        </View>

        {/* Formulário */}
        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>E-mail</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text,
                }
              ]}
              placeholder="seu@email.com"
              placeholderTextColor={colors.textDimmed}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setAuthError('');
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Senha</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text,
                }
              ]}
              placeholder="••••••••"
              placeholderTextColor={colors.textDimmed}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setAuthError('');
              }}
              secureTextEntry
              editable={!loading}
              onSubmitEditing={handleAuth}
            />
          </View>

          {!!authError && (
            <Text style={[styles.errorText, { color: colors.danger || '#ef4444' }]}>
              {authError}
            </Text>
          )}

          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: colors.primary },
              loading && styles.buttonDisabled
            ]}
            onPress={handleAuth}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.buttonText}>{isLoginMode ? 'Entrar' : 'Criar Conta'}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Switch Mode */}
        <TouchableOpacity
          style={styles.switchModeContainer}
          onPress={() => setIsLoginMode(!isLoginMode)}
          disabled={loading}
        >
          <Text style={[styles.switchModeText, { color: colors.textMuted }]}>
            {isLoginMode ? 'Não tem uma conta? ' : 'Já tem uma conta? '}
            <Text style={{ color: colors.primary, fontWeight: '600' }}>
              {isLoginMode ? 'Criar conta' : 'Fazer login'}
            </Text>
          </Text>
        </TouchableOpacity>

        <Text style={[styles.footer, { color: colors.textDimmed }]}>roiLead © 2026</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 250,
    height: 75,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    position: 'relative',
    height: 20,
  },
  line: {
    position: 'absolute',
    width: '100%',
    height: 1,
  },
  dividerText: {
    paddingHorizontal: 10,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  form: {
    gap: 20,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  button: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  switchModeContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  switchModeText: {
    fontSize: 14,
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 32,
  },
});
