import { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { StatusBadge } from '../../components/StatusBadge';
import { useThemeColors } from '../../theme/colors';
import { BASE_COLUMNS } from '../../lib/constants';
import type { SharkLead, CustomColumn, BaseColumn } from '../../lib/types';
import { Feather } from '@expo/vector-icons';

export default function LeadDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { userId } = useAuth();
  const colors = useThemeColors();
  const [lead, setLead] = useState<SharkLead | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [customColumns, setCustomColumns] = useState<CustomColumn[]>([]);
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [customNames, setCustomNames] = useState<Record<string, string>>({});

  // Monta e ordena as colunas
  const columns = useMemo(() => {
    let cols: (BaseColumn | CustomColumn)[] = [...BASE_COLUMNS, ...customColumns];
    if (columnOrder.length > 0) {
      const novosCol = cols.find(c => c.id === 'novos');
      const otherCols = cols.filter(c => c.id !== 'novos');
      otherCols.sort((a, b) => {
        let idxA = columnOrder.indexOf(a.id);
        let idxB = columnOrder.indexOf(b.id);
        if (idxA === -1) idxA = 999;
        if (idxB === -1) idxB = 999;
        return idxA - idxB;
      });
      cols = novosCol ? [novosCol, ...otherCols] : otherCols;
    }
    return cols;
  }, [customColumns, columnOrder]);

  useEffect(() => {
    if (id) fetchLead();
  }, [id]);

  const fetchLead = async () => {
    try {
      const { data, error } = await supabase
        .from('cupula_leads')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      const fetchedLead = data as SharkLead;
      setLead(fetchedLead);

      if (fetchedLead?.niche) {
        // Busca configurações de nomes de colunas e colunas customizadas
        const { data: settingsData } = await supabase
          .from('cupula_settings')
          .select('column_id, custom_name')
          .eq('niche', fetchedLead.niche);

        if (settingsData) {
          const namesMap: Record<string, string> = {};
          const userCustomCols: CustomColumn[] = [];
          let savedOrder: string[] = [];

          settingsData.forEach((item: any) => {
            if (item.column_id === 'column_order') {
              try {
                savedOrder = JSON.parse(item.custom_name);
              } catch {}
            } else if (item.column_id.startsWith('custom_')) {
              try {
                const meta = JSON.parse(item.custom_name);
                userCustomCols.push({
                  id: item.column_id,
                  title: meta.title || 'Nova Etapa',
                  color: meta.color || '#6366F1',
                  position: meta.position ?? 99,
                });
              } catch {
                userCustomCols.push({
                  id: item.column_id,
                  title: item.custom_name,
                  color: '#6366F1',
                  position: 99,
                });
              }
            } else {
              namesMap[item.column_id] = item.custom_name;
            }
          });

          setCustomNames(namesMap);
          setCustomColumns(userCustomCols.sort((a, b) => a.position - b.position));
          setColumnOrder(savedOrder);
        }
      }
    } catch (err) {
      console.error('Erro ao buscar lead:', err);
      Alert.alert('Erro', 'Não foi possível carregar o lead.');
    } finally {
      setLoading(false);
    }
  };

  const isMine = lead?.owner_id === userId;

  // Parse notas
  const parsedNotes = useMemo(() => {
    if (!lead?.notes) return { email: '', specs: [] };
    const parts = lead.notes.split('|');
    const emailParts = parts.filter(p => p.includes('📧') || p.includes('Email:') || p.includes('@'));
    const otherParts = parts.filter(p => !p.includes('📧') && !p.includes('Email:') && !p.includes('@'));
    const email = emailParts.map(p => p.replace(/📧/g, '').replace(/Email:/g, '').trim()).filter(Boolean).join('');
    const specs = otherParts.map(p => p.replace(/🔸/g, '').trim()).filter(Boolean);
    return { email, specs };
  }, [lead?.notes]);

  // Ações
  const handleWhatsApp = () => {
    if (!lead?.phone) return;
    const cleanPhone = lead.phone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    Linking.openURL(`https://wa.me/${phoneWithCountry}`);
  };

  const handleCall = () => {
    if (!lead?.phone) return;
    Linking.openURL(`tel:${lead.phone}`);
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!lead || !isMine) return;
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('cupula_leads')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', lead.id)
        .eq('owner_id', userId);

      if (error) throw error;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await fetchLead();
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível atualizar o status.');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Excluir Lead',
      `Tem certeza que deseja excluir "${lead?.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('cupula_leads')
                .delete()
                .eq('id', lead!.id)
                .eq('owner_id', userId);

              if (error) throw error;
              router.back();
            } catch (err) {
              Alert.alert('Erro', 'Não foi possível excluir o lead.');
            }
          },
        },
      ]
    );
  };

  const handleChangeStatus = () => {
    const options = columns
      .filter(c => c.id !== 'novos' && c.id !== lead?.status)
      .map(c => ({
        text: customNames[c.id] || c.title,
        onPress: () => handleStatusChange(c.id),
      }));

    Alert.alert('Mover para...', 'Escolha o novo status:', [
      ...options,
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!lead) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.textMuted }]}>Lead não encontrado</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.scrollContent}>
      {/* Header com nome e status */}
      <View style={styles.header}>
        <Text style={[styles.leadName, { color: colors.text }]}>{lead.name}</Text>
        <StatusBadge status={lead.status} customName={customNames[lead.status]} />
      </View>

      {/* Telefone */}
      {lead.phone && (
        <View style={[styles.infoRow, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Telefone</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>
            {isMine ? lead.phone : '••••••••••••'}
          </Text>
        </View>
      )}

      {/* E-mail */}
      {parsedNotes.email && (
        <View style={[styles.infoRow, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.infoLabel, { color: colors.textMuted }]}>E-mail</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>
            {isMine ? parsedNotes.email : '••••••••••••'}
          </Text>
        </View>
      )}

      {/* Especificações */}
      {parsedNotes.specs.length > 0 && (
        <View style={[styles.specsCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.specsTitle, { color: colors.textMuted }]}>Especificações</Text>
          {parsedNotes.specs.map((spec, i) => (
            <Text key={i} style={[styles.specItem, { color: colors.textSecondary }]}>• {spec}</Text>
          ))}
        </View>
      )}

      {/* Data de criação */}
      <View style={[styles.infoRow, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Chegou em</Text>
        <Text style={[styles.infoValue, { color: colors.text }]}>
          {new Date(lead.created_at).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>

      {/* Botões de ação */}
      {isMine && (
        <View style={styles.actionsContainer}>
          <Text style={[styles.actionsTitle, { color: colors.textMuted }]}>Ações</Text>

          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.whatsappButton]}
              onPress={handleWhatsApp}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Feather name="message-circle" size={16} color={colors.text} />
                <Text style={[styles.actionButtonText, { color: colors.text }]}>WhatsApp</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.callButton]}
              onPress={handleCall}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Feather name="phone" size={16} color={colors.text} />
                <Text style={[styles.actionButtonText, { color: colors.text }]}>Ligar</Text>
              </View>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.fullButton, styles.statusButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={handleChangeStatus}
            disabled={updating}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {!updating && <Feather name="refresh-cw" size={16} color={colors.text} />}
              <Text style={[styles.fullButtonText, { color: colors.text }]}>
                {updating ? 'Atualizando...' : 'Mudar Status'}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.fullButton, styles.deleteButton]}
            onPress={handleDelete}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Feather name="trash-2" size={16} color={colors.danger} />
              <Text style={[styles.fullButtonText, { color: colors.danger }]}>
                Excluir Lead
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 15,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  leadName: {
    fontSize: 22,
    fontWeight: '700',
    flex: 1,
    marginRight: 12,
  },
  infoRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
  },
  specsCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  specsTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  specItem: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 2,
  },
  actionsContainer: {
    marginTop: 16,
  },
  actionsTitle: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  whatsappButton: {
    backgroundColor: 'rgba(37, 211, 102, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(37, 211, 102, 0.3)',
  },
  callButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  fullButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  statusButton: {
    borderWidth: 1,
  },
  deleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.15)',
  },
  fullButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
