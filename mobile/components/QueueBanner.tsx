import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '../theme/colors';
import type { TurnUser } from '../lib/types';
import { Feather } from '@expo/vector-icons';

interface QueueBannerProps {
  isMyTurn: boolean;
  currentTurnUser: TurnUser | null;
  myPosition: number;
  totalMembers: number;
}

export function QueueBanner({ isMyTurn, currentTurnUser, myPosition, totalMembers }: QueueBannerProps) {
  const colors = useThemeColors();
  const turnUserName = currentTurnUser?.name || 'Carregando...';

  if (isMyTurn) {
    return (
      <View style={[styles.container, styles.myTurn, { borderColor: 'rgba(34, 197, 94, 0.3)' }]}>
        <Feather name="zap" size={28} color={colors.success} style={styles.myTurnIcon} />
        <View style={styles.textContainer}>
          <Text style={[styles.myTurnTitle, { color: colors.success }]}>SUA VEZ!</Text>
          <Text style={[styles.myTurnSubtitle, { color: colors.success }]}>Capture o lead agora</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, styles.waiting, { borderColor: 'rgba(234, 179, 8, 0.2)' }]}>
      <Feather name="clock" size={24} color={colors.warning} style={styles.waitingIcon} />
      <View style={styles.textContainer}>
        <Text style={[styles.waitingTitle, { color: colors.warning }]}>Vez de: {turnUserName}</Text>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    gap: 12,
    borderWidth: 1,
  },
  myTurn: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  waiting: {
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
  },
  textContainer: {
    flex: 1,
  },
  myTurnIcon: {
    marginRight: 4,
  },
  myTurnTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
  },
  myTurnSubtitle: {
    fontSize: 13,
    opacity: 0.8,
    marginTop: 2,
  },
  waitingIcon: {
    marginRight: 4,
  },
  waitingTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  waitingSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
});
