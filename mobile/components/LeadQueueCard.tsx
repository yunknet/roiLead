import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useThemeColors } from '../theme/colors';
import type { SharkLead, TurnUser } from '../lib/types';
import { Feather } from '@expo/vector-icons';

interface LeadQueueCardProps {
  lead: SharkLead;
  isMyTurn: boolean;
  timeLeftSec: number;
  turnUser: TurnUser | null;
  onClaim: (leadId: string) => void;
  onPress: (leadId: string) => void;
  claiming: boolean;
}

export function LeadQueueCard({
  lead,
  isMyTurn,
  timeLeftSec,
  turnUser,
  onClaim,
  onPress,
  claiming,
}: LeadQueueCardProps) {
  const colors = useThemeColors();
  const m = Math.floor(timeLeftSec / 60);
  const s = timeLeftSec % 60;
  const timerStr = `${m}:${s.toString().padStart(2, '0')}`;
  const turnUserName = turnUser?.name || 'Membro';

  // Hora de chegada formatada
  const arrivalTime = lead.created_at
    ? new Date(lead.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : '--:--';

  // Processamento e limpeza das especificações
  const cleanSpecs = (notes: string | null) => {
    if (!notes) return [];
    const parts = notes.split('|');
    const otherParts = parts.filter(p => !p.includes('📧') && !p.includes('Email:') && !p.includes('@'));

    return otherParts.map(part => {
      let cleanPart = part.trim()
        .replace(/🔸 /g, '')
        .replace(/^Escolha [Oo]\s*/gi, '')
        .replace(/^Selecione [Oo]\s*/gi, '')
        .replace(/Tipo De Cons[oó\u0301]+rcio:?\s*/ig, '')
        .replace(/Valor.*?(Cr[eé\u0301]+dito\s*Desejado|Cr[eé\u0301]+dito):?\s*/ig, 'Crédito desejado: ');

      if (cleanPart.includes('Crédito desejado:')) {
        cleanPart = cleanPart
          .replace(/_r\$/gi, ' R$ ')
          .replace(/até/gi, 'Até ')
          .replace(/acima_de/gi, 'Acima de ')
          .replace(/acima de/gi, 'Acima de ')
          .replace(/_/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      }
      return cleanPart;
    }).filter(Boolean);
  };

  const specs = cleanSpecs(lead.notes);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        }
      ]}
      onPress={() => onPress(lead.id)}
      activeOpacity={0.7}
    >
      {/* Header: Dados ocultos + Horário */}
      <View style={styles.header}>
        <View style={[styles.lockBadge, { backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
          <Feather name="lock" size={10} color={colors.textMuted} />
          <Text style={[styles.lockText, { color: colors.textMuted }]}>Dados ocultos</Text>
        </View>
        <Text style={[styles.arrivalText, { color: colors.textMuted }]}>
          Chegou às {arrivalTime}
        </Text>
      </View>

      {/* Título: Nome do lead */}
      <View style={styles.titleContainer}>
        <View style={[styles.pulseDot, { backgroundColor: isMyTurn ? colors.success : colors.textDimmed }]} />
        <Text style={[styles.leadName, { color: colors.text }]} numberOfLines={1}>
          {lead.name}
        </Text>
      </View>

      {/* Notes / Especificações */}
      {specs.length > 0 ? (
        <View
          style={[
            styles.specsContainer,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            }
          ]}
        >
          {specs.map((spec, idx) => (
            <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
              <View style={{ marginTop: 2 }}>
                <Feather name="chevron-right" size={12} color={colors.primary} />
              </View>
              <Text style={[styles.specItem, { color: colors.textSecondary, flex: 1 }]}>
                {spec}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Fila Status Box */}
      <View
        style={[
          styles.statusBox,
          isMyTurn
            ? styles.statusBoxActive
            : [styles.statusBoxWaiting, { backgroundColor: colors.surface, borderColor: colors.border }]
        ]}
      >
        <Text
          style={[
            styles.statusLabel,
            isMyTurn ? { color: 'rgba(255, 255, 255, 0.8)' } : { color: colors.textMuted }
          ]}
        >
          STATUS DA FILA
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Feather name={isMyTurn ? "crosshair" : "clock"} size={14} color={isMyTurn ? '#FFFFFF' : colors.textSecondary} />
          <Text
            style={[
              styles.statusTitle,
              isMyTurn ? { color: '#FFFFFF' } : { color: colors.textSecondary }
            ]}
          >
            {isMyTurn ? `Sua vez, ${turnUserName}!` : `Vez de: ${turnUserName}`}
          </Text>
        </View>
        <View
          style={[
            styles.timerBadge,
            isMyTurn
              ? { backgroundColor: 'rgba(255, 255, 255, 0.2)', borderColor: 'rgba(255, 255, 255, 0.3)' }
              : { backgroundColor: colors.background, borderColor: colors.border }
          ]}
        >
            <Feather name="clock" size={12} color={isMyTurn ? '#FFFFFF' : colors.warning} />
            <Text
              style={[
                styles.timerText,
                isMyTurn ? { color: '#FFFFFF' } : { color: colors.warning }
              ]}
            >
              Expira em {timerStr}
            </Text>
        </View>
      </View>

      {/* Action Button */}
      {isMyTurn ? (
        <TouchableOpacity
          style={[
            styles.claimButton,
            { backgroundColor: colors.primary },
            claiming && styles.claimButtonDisabled
          ]}
          onPress={() => onClaim(lead.id)}
          disabled={claiming}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {!claiming && <Feather name="check-circle" size={16} color="#FFFFFF" />}
            <Text style={styles.claimButtonText}>
              {claiming ? 'CAPTURANDO...' : 'CAPTURAR AGORA'}
            </Text>
          </View>
        </TouchableOpacity>
      ) : (
        <View style={[styles.disabledButton, { backgroundColor: colors.surface, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }]}>
          <Feather name="clock" size={14} color={colors.textDimmed} />
          <Text style={[styles.disabledButtonText, { color: colors.textDimmed }]}>
            Aguardando...
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  lockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  lockText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  arrivalText: {
    fontSize: 11,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  leadName: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  specsContainer: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    gap: 6,
  },
  specItem: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
  },
  statusBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
    marginBottom: 14,
    gap: 4,
  },
  statusBoxActive: {
    backgroundColor: '#2563EB', // Blue 600
    borderColor: '#3B82F6',
  },
  statusBoxWaiting: {},
  statusLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 4,
  },
  timerText: {
    fontSize: 11,
    fontWeight: '700',
  },
  claimButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },
  claimButtonDisabled: {
    opacity: 0.6,
  },
  claimButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  disabledButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  disabledButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
