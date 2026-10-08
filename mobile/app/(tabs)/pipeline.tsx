import { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Dimensions,
  Alert,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useLeads } from '../../hooks/useLeads';
import { CapturedLeadCard } from '../../components/CapturedLeadCard';
import { useThemeColors } from '../../theme/colors';
import { BASE_COLUMNS } from '../../lib/constants';
import type { Niche, SharkLead, BaseColumn, CustomColumn } from '../../lib/types';
import { Feather } from '@expo/vector-icons';

const COLUMN_WIDTH = Math.min(300, Dimensions.get('window').width * 0.85);

export default function PipelineScreen() {
  const router = useRouter();
  const { userId, selectedNiche } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [editingColumn, setEditingColumn] = useState<string | null>(null);
  const [newColumnName, setNewColumnName] = useState('');
  const [isCreatingColumn, setIsCreatingColumn] = useState(false);
  const [isSavingColumn, setIsSavingColumn] = useState(false);
  const [isDeletingColumn, setIsDeletingColumn] = useState(false);
  const colors = useThemeColors();

  const {
    leads,
    loading,
    customColumns,
    columnOrder,
    customNames,
    fetchLeads,
    handleStatusChange,
    handleCreateColumn,
    handleUpdateColumnName,
    handleDeleteColumn,
  } = useLeads(selectedNiche as Niche | null, userId);

  // Filtra leads do nicho selecionado
  const filteredLeads = useMemo(() => {
    return leads.filter(l => l.niche === selectedNiche);
  }, [leads, selectedNiche]);

  // Monta e ordena as colunas (replica lógica da web linhas 1048-1060)
  const columns = useMemo(() => {
    // Na Pipeline do app, NÃO mostramos a coluna "novos", pois ela é exclusiva da aba Fila (Tráfego).
    let cols: (BaseColumn | CustomColumn)[] = [...BASE_COLUMNS, ...customColumns].filter(c => c.id !== 'novos');
    if (columnOrder.length > 0) {
      cols.sort((a, b) => {
        let idxA = columnOrder.indexOf(a.id);
        let idxB = columnOrder.indexOf(b.id);
        if (idxA === -1) idxA = 999;
        if (idxB === -1) idxB = 999;
        return idxA - idxB;
      });
    }
    return cols;
  }, [customColumns, columnOrder]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLeads();
    setRefreshing(false);
  };

  const handleLeadPress = (leadId: string) => {
    router.push(`/lead/${leadId}`);
  };

  const onStatusPress = (leadId: string, currentStatus: string) => {
    const options = columns
      .filter(c => c.id !== 'novos' && c.id !== currentStatus)
      .map(c => ({
        text: customNames[c.id] || c.title,
        onPress: () => handleStatusChange(leadId, c.id),
      }));

    Alert.alert('Mover para...', 'Escolha a nova etapa:', [
      ...options,
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const handleAddNewColumn = async () => {
    if (isCreatingColumn) return;
    setIsCreatingColumn(true);
    const { success, error } = await handleCreateColumn();
    if (success) {
      Alert.alert('Sucesso', 'Nova etapa criada! Você pode renomeá-la clicando no ícone de lápis.');
    } else {
      Alert.alert('Erro', error || 'Não foi possível criar.');
    }
    setIsCreatingColumn(false);
  };

  const saveColumnName = async () => {
    if (editingColumn && newColumnName.trim()) {
      setIsSavingColumn(true);
      await handleUpdateColumnName(editingColumn, newColumnName);
      setIsSavingColumn(false);
    }
    setEditingColumn(null);
    setNewColumnName('');
  };

  const confirmDeleteColumn = (columnId: string) => {
    Alert.alert(
      'Deletar Etapa',
      'Tem certeza que deseja excluir esta etapa permanentemente?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Deletar', 
          style: 'destructive', 
          onPress: async () => {
            setIsDeletingColumn(true);
            await handleDeleteColumn(columnId);
            setIsDeletingColumn(false);
            setEditingColumn(null);
          } 
        },
      ]
    );
  };

  // Cores das colunas
  const getColumnColor = (colId: string): string => {
    const colorMap: Record<string, string> = {
      novos: colors.colNovos,
      contatados: colors.colContatados,
      negociacao: colors.colNegociacao,
      fechados: colors.colFechados,
      perdidos: colors.colPerdidos,
    };
    return colorMap[colId] || colors.colCustom;
  };

  if (!selectedNiche) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>Selecione um nicho na aba Fila</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.headerContainer}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Feather name="trello" size={24} color={colors.text} />
          <Text style={[styles.headerTitle, { color: colors.text, marginBottom: 0 }]}>Pipeline</Text>
        </View>
        <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>{selectedNiche}</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalScroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {columns.map(col => {
          let colLeads = filteredLeads.filter(l =>
            l.status === col.id && l.owner_id === userId
          );

          // Novos: ordenar do mais antigo para o mais novo (ASC)
          if (col.id === 'novos') {
            colLeads = [...colLeads].sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
          }

          const colColor = getColumnColor(col.id);
          const displayTitle = customNames[col.id] || col.title;

          return (
            <View key={col.id} style={[styles.column, { backgroundColor: colors.surface }]}>
              {/* Column header */}
              <View style={[styles.columnHeader, { borderBottomColor: colColor }]}>
                <View style={[styles.columnDot, { backgroundColor: colColor }]} />
                <Text style={[styles.columnTitle, { color: colors.text }]} numberOfLines={1}>{displayTitle}</Text>
                
                {col.id !== 'novos' && (
                  <TouchableOpacity 
                    style={{ padding: 4, marginRight: 4 }} 
                    onPress={() => {
                      setNewColumnName(displayTitle);
                      setEditingColumn(col.id);
                    }}
                  >
                    <Feather name="edit-2" size={14} color={colors.textMuted} />
                  </TouchableOpacity>
                )}

                <View style={[styles.columnCount, { backgroundColor: colColor + '20' }]}>
                  <Text style={[styles.columnCountText, { color: colColor }]}>
                    {colLeads.length}
                  </Text>
                </View>
              </View>

              {/* Lead cards */}
              <ScrollView
                style={styles.columnScroll}
                showsVerticalScrollIndicator={false}
              >
                {colLeads.map(lead => (
                  <CapturedLeadCard
                    key={lead.id}
                    lead={lead}
                    onPress={handleLeadPress}
                    customStatusName={customNames[lead.status]}
                    onStatusPress={(id) => onStatusPress(id, lead.status)}
                  />
                ))}
                {colLeads.length === 0 && (
                  <Text style={[styles.emptyColText, { color: colors.textDimmed }]}>Nenhum lead</Text>
                )}
              </ScrollView>
            </View>
          );
        })}
        
        {/* Botão Nova Etapa */}
        <TouchableOpacity 
          style={[
            styles.newColumnButton, 
            { borderColor: colors.border },
            isCreatingColumn && { opacity: 0.5 }
          ]} 
          onPress={handleAddNewColumn}
          disabled={isCreatingColumn}
        >
          {isCreatingColumn ? (
            <ActivityIndicator size="small" color={colors.textMuted} />
          ) : (
            <Feather name="plus" size={24} color={colors.textMuted} />
          )}
          <Text style={[styles.newColumnText, { color: colors.textMuted }]}>
            {isCreatingColumn ? 'Criando...' : 'Nova Etapa'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal para Renomear Etapa */}
      <Modal visible={!!editingColumn} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Renomear Etapa</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              value={newColumnName}
              onChangeText={setNewColumnName}
              placeholder="Nome da etapa"
              placeholderTextColor={colors.textDimmed}
              autoFocus
            />
            <View style={styles.modalActions}>
              {/* Se for uma coluna customizada, exibe o botão de deletar (lado esquerdo) */}
              {editingColumn?.startsWith('custom_') ? (
                <TouchableOpacity 
                  style={[styles.modalButton, { flex: 0, paddingHorizontal: 16 }]} 
                  onPress={() => confirmDeleteColumn(editingColumn)}
                  disabled={isSavingColumn || isDeletingColumn}
                >
                  {isDeletingColumn ? (
                    <ActivityIndicator size="small" color={colors.danger} />
                  ) : (
                    <Feather name="trash-2" size={20} color={colors.danger} />
                  )}
                </TouchableOpacity>
              ) : <View style={{ flex: 1 }} />}

              <View style={{ flexDirection: 'row', gap: 12, flex: 1, justifyContent: 'flex-end' }}>
                <TouchableOpacity 
                  style={styles.modalButton} 
                  onPress={() => {
                    setEditingColumn(null);
                    setNewColumnName('');
                  }}
                  disabled={isSavingColumn || isDeletingColumn}
                >
                  <Text style={[styles.modalButtonText, { color: colors.textMuted }]}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalButton, { backgroundColor: colors.primary }]} 
                  onPress={saveColumnName}
                  disabled={isSavingColumn || isDeletingColumn}
                >
                  {isSavingColumn ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>Salvar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  horizontalScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  column: {
    width: COLUMN_WIDTH,
    borderRadius: 16,
    overflow: 'hidden',
    maxHeight: '100%',
  },
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 2,
    gap: 8,
  },
  columnDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  columnTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  columnCount: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  columnCountText: {
    fontSize: 12,
    fontWeight: '700',
  },
  columnScroll: {
    padding: 10,
    flex: 1,
  },
  emptyColText: {
    textAlign: 'center',
    fontSize: 12,
    paddingVertical: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
  },
  newColumnButton: {
    width: COLUMN_WIDTH,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginRight: 16,
  },
  newColumnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalButtonText: {
    fontWeight: '700',
    fontSize: 14,
  },
});
