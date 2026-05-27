import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '../theme/colors';

const STATUS_LABELS: Record<string, string> = {
  novos: 'Novo',
  contatados: 'Contatado',
  negociacao: 'Negociação',
  fechados: 'Fechado',
  perdidos: 'Perdido',
};

interface StatusBadgeProps {
  status: string;
  customName?: string;
}

export function StatusBadge({ status, customName }: StatusBadgeProps) {
  const colors = useThemeColors();

  const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    novos: { bg: colors.colNovosBg, text: colors.colNovos },
    contatados: { bg: colors.colContatadosBg, text: colors.colContatados },
    negociacao: { bg: colors.colNegociacaoBg, text: colors.colNegociacao },
    fechados: { bg: colors.colFechadosBg, text: colors.colFechados },
    perdidos: { bg: colors.colPerdidosBg, text: colors.colPerdidos },
  };

  const colorConfig = STATUS_COLORS[status] || { bg: colors.colCustomBg, text: colors.colCustom };
  const label = customName || STATUS_LABELS[status] || status;

  return (
    <View style={[styles.badge, { backgroundColor: colorConfig.bg }]}>
      <Text style={[styles.text, { color: colorConfig.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
