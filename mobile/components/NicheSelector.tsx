import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Image, useColorScheme } from 'react-native';
import { useThemeColors } from '../theme/colors';
import type { Niche } from '../lib/types';
import { Feather } from '@expo/vector-icons';

interface NicheSelectorProps {
  availableNiches: Niche[];
  onSelect: (niche: Niche) => void;
  loadingNiche: Niche | null;
}

export function NicheSelector({ availableNiches, onSelect, loadingNiche }: NicheSelectorProps) {
  const colors = useThemeColors();
  const scheme = useColorScheme();

  const logoSrc = scheme === 'dark'
    ? require('../public/cupula-logo-dark.png')
    : require('../public/cupula-logo.png');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Image source={logoSrc} style={styles.logo} resizeMode="contain" />
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Selecione o nicho contratado para acessar a cúpula e disputar leads em tempo real.
        </Text>
      </View>

      <View style={styles.nicheList}>
        {availableNiches.map((niche) => {
          const isConsorcio = niche === 'Consórcio';
          return (
            <TouchableOpacity
              key={niche}
              style={[
                styles.nicheButton,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                }
              ]}
              onPress={() => onSelect(niche)}
              disabled={loadingNiche !== null}
              activeOpacity={0.7}
            >
              <View style={styles.nicheContent}>
                <View style={[styles.iconContainer, { backgroundColor: isConsorcio ? 'rgba(34, 197, 94, 0.1)' : 'rgba(59, 130, 246, 0.1)' }]}>
                  <Feather name={isConsorcio ? "dollar-sign" : "settings"} size={22} color={isConsorcio ? colors.success : colors.primary} />
                </View>
                <View style={styles.nicheTextContainer}>
                  <Text style={[styles.nicheName, { color: colors.text }]}>{niche}</Text>
                  <Text style={[styles.nicheDescription, { color: colors.textMuted }]}>
                    {isConsorcio ? 'Leads de consórcio qualificados' : 'Painel de leads administrativo'}
                  </Text>
                </View>
                {loadingNiche === niche ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <Text style={[styles.nicheArrow, { color: colors.textDimmed }]}>›</Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 240,
    height: 70,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  nicheList: {
    gap: 16,
  },
  nicheButton: {
    borderWidth: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  nicheContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nicheEmoji: {
    fontSize: 24,
  },
  nicheTextContainer: {
    flex: 1,
  },
  nicheName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  nicheDescription: {
    fontSize: 12,
  },
  nicheArrow: {
    fontSize: 28,
    fontWeight: '300',
  },
});
