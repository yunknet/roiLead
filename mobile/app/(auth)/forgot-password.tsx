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
  Image,
  useColorScheme,
  ScrollView,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useThemeColors } from '../../theme/colors';

export default function ForgotPasswordScreen() {
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const colors = useThemeColors();
  const scheme = useColorScheme();
  const router = useRouter();

  const logoSrc = scheme === 'dark'
    ? require('../../public/cupula-logo-dark.png')
    : require('../../public/cupula-logo.png');

  const handleSendCode = async () => {
    setErrorMsg('');
    if (!email.trim()) {
      setErrorMsg('Informe o e-mail cadastrado.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          shouldCreateUser: false,
        },
      });

      if (error) throw error;

      setStep('otp');
      Alert.alert('Sucesso', 'Código enviado! Verifique seu e-mail.');
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Erro ao enviar código: ' + (err.message || 'Desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setErrorMsg('');
    
    if (password !== confirmPassword) {
      setErrorMsg('As senhas não coincidem.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (otp.length !== 8) {
      setErrorMsg('Digite o código de 8 dígitos recebido no e-mail.');
      return;
    }

    setLoading(true);
    try {
      // 1. Verifica o OTP para logar a sessão
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: otp,
        type: 'email',
      });

      if (verifyError) throw verifyError;

      // 2. Atualiza a senha da sessão logada
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) throw updateError;

      Alert.alert('Sucesso', 'Senha alterada com sucesso!');
      
      // Envia pro login de volta
      await supabase.auth.signOut();
      router.replace('/(auth)/login');
      
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Erro ao alterar senha: ' + (err.message || 'Código inválido'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        
        <TouchableOpacity 
          style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 30 }}
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={20} color={colors.textMuted} />
          <Text style={{ color: colors.textMuted, marginLeft: 8, fontSize: 16 }}>Voltar para Login</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Image source={logoSrc} style={styles.logo} resizeMode="contain" />
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {step === 'email' 
              ? 'Informe seu e-mail para receber um código de recuperação.' 
              : `Digite o código enviado para ${email} e sua nova senha.`}
          </Text>
        </View>

        {step === 'email' ? (
          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>E-mail cadastrado</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }
                ]}
                placeholder="seu@email.com"
                placeholderTextColor={colors.textDimmed}
                value={email}
                onChangeText={(text) => { setEmail(text); setErrorMsg(''); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>

            {!!errorMsg && (
              <Text style={[styles.errorText, { color: colors.danger || '#ef4444' }]}>{errorMsg}</Text>
            )}

            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary }, loading && styles.buttonDisabled]}
              onPress={handleSendCode}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Enviar Código</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Código de Verificação (8 dígitos)</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text, fontSize: 18, letterSpacing: 4, textAlign: 'center' }
                ]}
                placeholder="00000000"
                placeholderTextColor={colors.textDimmed}
                value={otp}
                onChangeText={(text) => { setOtp(text); setErrorMsg(''); }}
                keyboardType="number-pad"
                maxLength={8}
                editable={!loading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Nova Senha</Text>
              <View style={{ position: 'relative' }}>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text, paddingRight: 50 }
                  ]}
                  placeholder="Mínimo 6 caracteres"
                  placeholderTextColor={colors.textDimmed}
                  value={password}
                  onChangeText={(text) => { setPassword(text); setErrorMsg(''); }}
                  secureTextEntry={!showPassword}
                  editable={!loading}
                />
                <TouchableOpacity 
                  style={{ position: 'absolute', right: 15, top: '50%', transform: [{ translateY: -10 }] }}
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                >
                  <Feather name={showPassword ? "eye-off" : "eye"} size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Confirmar Nova Senha</Text>
              <View style={{ position: 'relative' }}>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text, paddingRight: 50 }
                  ]}
                  placeholder="Confirme a senha"
                  placeholderTextColor={colors.textDimmed}
                  value={confirmPassword}
                  onChangeText={(text) => { setConfirmPassword(text); setErrorMsg(''); }}
                  secureTextEntry={!showConfirmPassword}
                  editable={!loading}
                />
                <TouchableOpacity 
                  style={{ position: 'absolute', right: 15, top: '50%', transform: [{ translateY: -10 }] }}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  activeOpacity={0.7}
                >
                  <Feather name={showConfirmPassword ? "eye-off" : "eye"} size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            {!!errorMsg && (
              <Text style={[styles.errorText, { color: colors.danger || '#ef4444' }]}>{errorMsg}</Text>
            )}

            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary }, loading && styles.buttonDisabled]}
              onPress={handleResetPassword}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Alterar Senha</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={{ alignItems: 'center', marginTop: 16 }}
              onPress={() => setStep('email')}
              disabled={loading}
            >
              <Text style={{ color: colors.textMuted, fontSize: 14 }}>Voltar para E-mail</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
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
  formContainer: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  button: {
    height: 54,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  errorText: {
    fontSize: 13,
    marginBottom: 16,
    textAlign: 'center',
  },
});
