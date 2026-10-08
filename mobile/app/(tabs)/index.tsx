import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Image,
  useColorScheme,
  Modal,
  Vibration,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../hooks/useAuth';
import { useLeads } from '../../hooks/useLeads';
import { useQueue } from '../../hooks/useQueue';
import { NicheSelector } from '../../components/NicheSelector';
import { QueueBanner } from '../../components/QueueBanner';
import { LeadQueueCard } from '../../components/LeadQueueCard';
import { CapturedLeadCard } from '../../components/CapturedLeadCard';
import { useThemeColors } from '../../theme/colors';
import type { Niche, SharkLead, TurnUser } from '../../lib/types';
import { supabase } from '../../lib/supabase';
import { Feather } from '@expo/vector-icons';

// Helper de formatação de tempo relativo (getTimeAgo)
const getTimeAgo = (dateStr: string | null): string => {
  if (!dateStr) return 'Aguardando primeira captura';
  const now = new Date();
  const past = new Date(dateStr);
  const diffMs = now.getTime() - past.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Agora mesmo';
  if (diffMin < 60) return `${diffMin}m atrás`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h atrás`;
  return past.toLocaleDateString('pt-BR');
};

export default function QueueScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = useThemeColors();
  const { userId, userEmail, accessInfo, checkAccess, selectedNiche, setSelectedNiche } = useAuth();
  const [loadingNiche, setLoadingNiche] = useState<Niche | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [timerTick, setTimerTick] = useState(0);

  // Modais de membros e auditoria
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditData, setAuditData] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Modais de Termos de Uso
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [acceptingTerms, setAcceptingTerms] = useState(false);

  useEffect(() => {
    if (userId) {
      const checkTerms = async () => {
        try {
          const { data } = await supabase
            .from('profiles')
            .select('terms_accepted')
            .eq('id', userId)
            .single();
          if (data && !data.terms_accepted) {
            setShowTermsModal(true);
          }
        } catch (err) {
          console.error("Erro ao checar termos:", err);
        }
      };
      checkTerms();
    }
  }, [userId]);

  const handleAcceptTerms = async () => {
    setAcceptingTerms(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          terms_accepted: true,
          terms_accepted_at: new Date().toISOString()
        })
        .eq('id', userId!);
        
      if (error) throw error;
      setShowTermsModal(false);
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível aceitar os termos.');
    } finally {
      setAcceptingTerms(false);
    }
  };

  const handleDeclineTerms = async () => {
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  };

  const logoSrc = scheme === 'dark'
    ? require('../../public/cupula-logo-dark.png')
    : require('../../public/cupula-logo.png');

  const iconSrc = scheme === 'dark'
    ? require('../../public/cupula-icon-dark.png')
    : require('../../public/cupula-icon.png');

  const {
    leads,
    loading,
    turnInfo,
    clockOffset,
    noticeMessage,
    fetchLeads,
    handleClaimLead,
    handleDeleteLead,
    fetchAuditData,
  } = useLeads(selectedNiche, userId);

  const { getTimeLeft, getCurrentTurnUser, getMyPosition, isMyTurn, rotateTurns } = useQueue();

  // Timer local de 1s para o countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setTimerTick(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Leads sem dono na fila (Novos) ordenados do mais antigo para o mais novo
  const unclaimedLeads = useMemo(() => {
    return leads
      .filter(l => l.status === 'novos' && !l.owner_id && l.niche === selectedNiche)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [leads, selectedNiche]);

  // Leads pertencentes ao consultor logado
  const myLeads = useMemo(() => {
    return leads.filter(l => l.owner_id === userId && l.status !== 'novos');
  }, [leads, userId]);

  // Próximo consultor na fila
  const nextUserInLine = useMemo(() => {
    if (!turnInfo?.active_users || turnInfo.active_users.length === 0) return null;
    const nextIndex = (turnInfo.base_turn_index ?? 0) % turnInfo.active_users.length;
    const member = turnInfo.active_users[nextIndex];
    return {
      name: member.name,
      status: 'Próximo na fila',
      isCurrentUser: (member.id || member.user_id) === userId,
      queuePosition: nextIndex + 1
    };
  }, [turnInfo, userId]);

  const firstLead = unclaimedLeads[0];
  const isFirstLeadMyTurn = firstLead ? isMyTurn(firstLead, userId) : false;
  const currentTurnUser = getCurrentTurnUser(turnInfo, unclaimedLeads);
  const myPosition = getMyPosition(turnInfo, userId, firstLead?.current_turn_user_id);
  const totalMembers = turnInfo?.active_users?.length || 0;

  // Alerta vibratório ao se tornar a vez do usuário
  const notifiedRef = useRef(false);
  useEffect(() => {
    if (isFirstLeadMyTurn && !notifiedRef.current) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Vibration.vibrate([0, 500, 250, 500]);
      notifiedRef.current = true;
    }
    if (!isFirstLeadMyTurn) {
      notifiedRef.current = false;
    }
  }, [isFirstLeadMyTurn]);

  // Rotação de turnos
  useEffect(() => {
    if (firstLead && getTimeLeft(firstLead, clockOffset) <= 0 && firstLead.current_turn_user_id) {
      rotateTurns().then(() => fetchLeads());
    }
  }, [timerTick, firstLead, clockOffset]);

  // Seleção de nicho
  const handleSelectNiche = async (niche: Niche) => {
    setLoadingNiche(niche);
    try {
      if (!userEmail) return;
      const { hasAccess } = await checkAccess(userEmail, niche);
      if (hasAccess) {
        setSelectedNiche(niche);
      } else {
        Alert.alert('Acesso Negado', 'Você não tem permissão para acessar este nicho.');
      }
    } catch (err) {
      Alert.alert('Erro', 'Falha ao verificar acesso.');
    } finally {
      setLoadingNiche(null);
    }
  };

  // Captura de lead
  const handleClaim = async (leadId: string) => {
    setClaiming(true);
    try {
      const { success, error } = await handleClaimLead(leadId);
      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('✅ Sucesso', 'Lead capturado com sucesso!');
      } else {
        Alert.alert('Erro', error || 'Não foi possível capturar o lead.');
      }
    } finally {
      setClaiming(false);
    }
  };

  // Pull-to-refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLeads();
    setRefreshing(false);
  };

  // Auditoria
  const handleOpenAudit = async () => {
    setShowAuditModal(true);
    setLoadingAudit(true);
    try {
      const data = await fetchAuditData();
      setAuditData(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAudit(false);
    }
  };

  // Detalhe do lead
  const handleLeadPress = (leadId: string) => {
    router.push(`/lead/${leadId}`);
  };

  // Renderiza seletor de nicho
  if (!selectedNiche) {
    const availableNiches = accessInfo?.niches || [];
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <NicheSelector
          availableNiches={availableNiches}
          onSelect={handleSelectNiche}
          loadingNiche={loadingNiche}
        />
      </View>
    );
  }

  // Renderiza loading inicial do nicho
  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>Carregando cúpula...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Header Barra */}
      <View style={[styles.headerBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => setSelectedNiche(null)} style={styles.backButton}>
          <Text style={[styles.backButtonText, { color: colors.textMuted }]}>← Trocar Nicho</Text>
        </TouchableOpacity>
        <Image source={logoSrc} style={styles.headerLogo} resizeMode="contain" />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Niche Title Row */}
        <View style={styles.titleRow}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>Cúpula de {selectedNiche}</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Dispute os leads em tempo real
            </Text>
          </View>
        </View>

        {/* Quick Actions Row: Auditoria, Membros */}
        <View style={styles.quickActionsRow}>

          <TouchableOpacity
            style={[styles.actionBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setShowMembersModal(true)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Feather name="users" size={14} color={colors.textSecondary} />
              <Text style={[styles.actionBadgeText, { color: colors.textSecondary }]}>
                Fila ({totalMembers})
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={handleOpenAudit}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Feather name="clipboard" size={14} color={colors.textSecondary} />
              <Text style={[styles.actionBadgeText, { color: colors.textSecondary }]}>
                Auditoria
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Next user indicator banner */}
        {nextUserInLine && (
          <View
            style={[
              styles.nextUserBanner,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
              nextUserInLine.isCurrentUser && {
                backgroundColor: 'rgba(34, 197, 94, 0.08)',
                borderColor: 'rgba(34, 197, 94, 0.25)',
              }
            ]}
          >
            <View style={[styles.nextCircle, { backgroundColor: colors.success }]}>
              <Text style={styles.nextCircleText}>{nextUserInLine.queuePosition}</Text>
            </View>
            <View style={styles.nextTextContainer}>
              <Text
                style={[
                  styles.nextUserName,
                  { color: colors.text },
                  nextUserInLine.isCurrentUser && { color: colors.success }
                ]}
              >
                {nextUserInLine.name} {nextUserInLine.isCurrentUser && '(Você)'}
              </Text>
              <Text style={[styles.nextUserStatus, { color: colors.success }]}>
                {nextUserInLine.status}
              </Text>
            </View>
          </View>
        )}

        {/* Aviso Cúpula */}
        {noticeMessage && (
          <View style={[styles.noticeContainer, { backgroundColor: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.2)', flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
            <Feather name="bell" size={16} color={colors.danger} />
            <Text style={[styles.noticeText, { color: colors.danger, flex: 1 }]}>{noticeMessage}</Text>
          </View>
        )}

        {/* Banner da Fila Status */}
        {unclaimedLeads.length > 0 && (
          <QueueBanner
            isMyTurn={isFirstLeadMyTurn}
            currentTurnUser={currentTurnUser}
            myPosition={myPosition}
            totalMembers={totalMembers}
          />
        )}

        {/* Fila de Leads */}
        {unclaimedLeads.length > 0 && (
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Feather name="inbox" size={18} color={colors.text} />
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>
                Fila de Leads ({unclaimedLeads.length})
              </Text>
            </View>
            {unclaimedLeads.map(lead => {
              const timeLeft = getTimeLeft(lead, clockOffset);
              const leadIsMyTurn = isMyTurn(lead, userId);
              const turnUser = turnInfo?.active_users?.find(
                (u: TurnUser) => (u.id || u.user_id) === lead.current_turn_user_id
              ) || null;

              return (
                <LeadQueueCard
                  key={lead.id}
                  lead={lead}
                  isMyTurn={leadIsMyTurn}
                  timeLeftSec={timeLeft}
                  turnUser={turnUser}
                  onClaim={handleClaim}
                  onPress={handleLeadPress}
                  claiming={claiming}
                />
              );
            })}
          </View>
        )}

        {/* Meus Leads */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Feather name="crosshair" size={18} color={colors.text} />
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>
              Meus Leads ({myLeads.length})
            </Text>
          </View>
          {myLeads.length > 0 ? (
            myLeads.map(lead => (
              <CapturedLeadCard
                key={lead.id}
                lead={lead}
                onPress={handleLeadPress}
                onDelete={async (id) => {
                  const { success, error } = await handleDeleteLead(id);
                  if (success) {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  } else {
                    Alert.alert('Erro', error || 'Não foi possível deletar o lead.');
                  }
                }}
              />
            ))
          ) : (
            <View style={[styles.emptyBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.emptyBoxText, { color: colors.textMuted }]}>
                Nenhum lead capturado ainda.
              </Text>
            </View>
          )}
        </View>

        {/* Fila vazia total */}
        {unclaimedLeads.length === 0 && myLeads.length === 0 && (
          <View style={styles.emptyContainer}>
            <Feather name="inbox" size={48} color={colors.textSecondary} style={{ marginBottom: 16 }} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Nenhum lead no momento</Text>
            <Text style={[styles.emptySubtext, { color: colors.textDimmed }]}>Puxe para baixo para atualizar</Text>
          </View>
        )}
      </ScrollView>

      {/* ================= MODAL FILA DE CONSULTORES ================= */}
      <Modal visible={showMembersModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Feather name="users" size={20} color={colors.text} />
                <Text style={[styles.modalTitle, { color: colors.text }]}>Consultores na Fila</Text>
              </View>
              <TouchableOpacity onPress={() => setShowMembersModal(false)} style={styles.closeButton}>
                <Text style={[styles.closeButtonText, { color: colors.textDimmed }]}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalDescription, { color: colors.textMuted }]}>
              A distribuição de turnos segue ordem circular fixa. Cada lead vai para o próximo da fila.
            </Text>

            <ScrollView style={styles.modalScroll}>
              {turnInfo?.active_users?.map((member: any, idx: number) => {
                const isCurrentUser = (member.id || member.user_id) === userId;
                const isNextInLine = idx === ((turnInfo.base_turn_index ?? 0) % turnInfo.active_users.length);
                const hasActiveLead = leads.some(l =>
                  (l.current_turn_user_id === member.user_id || l.current_turn_user_id === member.id) &&
                  l.status === 'novos' &&
                  !l.owner_id &&
                  l.niche === selectedNiche
                );

                return (
                  <View
                    key={member.user_id || member.id}
                    style={[
                      styles.memberItem,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                      hasActiveLead && {
                        backgroundColor: 'rgba(37, 99, 235, 0.08)',
                        borderColor: 'rgba(37, 99, 235, 0.25)',
                      },
                      isNextInLine && !hasActiveLead && {
                        backgroundColor: 'rgba(34, 197, 94, 0.08)',
                        borderColor: 'rgba(34, 197, 94, 0.25)',
                      }
                    ]}
                  >
                    <View
                      style={[
                        styles.memberCircle,
                        { backgroundColor: colors.border },
                        hasActiveLead && { backgroundColor: colors.primary },
                        isNextInLine && !hasActiveLead && { backgroundColor: colors.success }
                      ]}
                    >
                      <Text style={[styles.memberCircleText, (hasActiveLead || isNextInLine) && { color: '#FFFFFF' }]}>
                        {idx + 1}
                      </Text>
                    </View>
                    <View style={styles.memberInfo}>
                      <Text style={[styles.memberName, { color: colors.text }, isCurrentUser && { fontWeight: '800' }]}>
                        {member.name} {isCurrentUser && '(Você)'}
                      </Text>
                      <Text style={[styles.memberTime, { color: colors.textMuted }]}>
                        {member.last_lead_at
                          ? `Última captura: ${getTimeAgo(member.last_lead_at)}`
                          : 'Aguardando primeira captura'}
                      </Text>
                    </View>
                    {hasActiveLead && (
                      <Text style={[styles.memberStatusText, { color: colors.primary }]}>
                        Capturando
                      </Text>
                    )}
                    {isNextInLine && !hasActiveLead && (
                      <Text style={[styles.memberStatusText, { color: colors.success }]}>
                        Próximo
                      </Text>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ================= MODAL AUDITORIA DIÁRIA ================= */}
      <Modal visible={showAuditModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Feather name="clipboard" size={20} color={colors.text} />
                <Text style={[styles.modalTitle, { color: colors.text }]}>Auditoria Diária</Text>
              </View>
              <TouchableOpacity onPress={() => setShowAuditModal(false)} style={styles.closeButton}>
                <Text style={[styles.closeButtonText, { color: colors.textDimmed }]}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalDescription, { color: colors.textMuted }]}>
              Logs de leads que passaram pela sua vez hoje. Reseta automaticamente à meia-noite.
            </Text>

            {loadingAudit ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 40 }} />
            ) : (
              <ScrollView style={styles.modalScroll}>
                {(() => {
                  const myAuditData = auditData.filter(entry => entry.user_id === userId);

                  if (myAuditData.length === 0) {
                    return (
                      <View style={styles.emptyContainer}>
                        <Text style={[styles.emptyText, { color: colors.textMuted }]}>Nenhum turno registrado hoje</Text>
                        <Text style={[styles.emptySubtext, { color: colors.textDimmed }]}>
                          Os registros surgem quando leads passam pela sua vez.
                        </Text>
                      </View>
                    );
                  }

                  const captured = myAuditData.filter(e => e.was_captured);
                  const notCaptured = myAuditData.filter(e => !e.was_captured);

                  return (
                    <View style={styles.auditContainer}>
                      {/* Section: Capturados */}
                      <View style={[styles.auditSection, { borderColor: 'rgba(34, 197, 94, 0.2)' }]}>
                        <View style={[styles.auditSectionHeader, { backgroundColor: 'rgba(34, 197, 94, 0.08)' }]}>
                          <Text style={[styles.auditSectionTitle, { color: colors.success }]}>
                            Capturados ({captured.length})
                          </Text>
                        </View>
                        <View style={styles.auditList}>
                          {captured.length === 0 ? (
                            <Text style={[styles.auditEmptyText, { color: colors.textDimmed }]}>Nenhum</Text>
                          ) : (
                            captured.map((entry, idx) => {
                              const timeStr = entry.claimed_at
                                ? new Date(entry.claimed_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                                : '--:--';
                              return (
                                <View key={idx} style={styles.auditRow}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Feather name="check-circle" size={14} color={colors.success} />
                                    <Text style={[styles.auditLeadName, { color: colors.text }]}>{entry.lead_name}</Text>
                                  </View>
                                  <Text style={[styles.auditTime, { color: colors.textMuted }]}>{timeStr}</Text>
                                </View>
                              );
                            })
                          )}
                        </View>
                      </View>

                      {/* Section: Não Capturados */}
                      <View style={[styles.auditSection, { borderColor: 'rgba(239, 68, 68, 0.2)' }]}>
                        <View style={[styles.auditSectionHeader, { backgroundColor: 'rgba(239, 68, 68, 0.08)' }]}>
                          <Text style={[styles.auditSectionTitle, { color: colors.danger }]}>
                            Não Capturados ({notCaptured.length})
                          </Text>
                        </View>
                        <View style={styles.auditList}>
                          {notCaptured.length === 0 ? (
                            <Text style={[styles.auditEmptyText, { color: colors.textDimmed }]}>Nenhum</Text>
                          ) : (
                            notCaptured.map((entry, idx) => {
                              const timeStr = entry.created_at
                                ? new Date(entry.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                                : '--:--';
                              return (
                                <View key={idx} style={styles.auditRow}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Feather name="x-circle" size={14} color={colors.danger} />
                                    <Text style={[styles.auditLeadName, { color: colors.text }]}>{entry.lead_name}</Text>
                                  </View>
                                  <Text style={[styles.auditTime, { color: colors.textMuted }]}>{timeStr}</Text>
                                </View>
                              );
                            })
                          )}
                        </View>
                      </View>
                    </View>
                  );
                })()}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal de Termos de Uso (Bloqueante) */}
      <Modal visible={showTermsModal} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border, padding: 24, maxWidth: 400 }]}>
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 8 }}>Termos de Uso</Text>
              <Text style={{ fontSize: 14, color: colors.textMuted }}>
                Para continuar usando o roiLead, você precisa aceitar nossos termos de uso.
              </Text>
            </View>

            <ScrollView style={{ maxHeight: 250, backgroundColor: colors.background, padding: 12, borderRadius: 8, marginBottom: 20 }}>
              <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.text, marginBottom: 4 }}>1. Coleta de Dados e Privacidade</Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 8, lineHeight: 20 }}>
                Ao continuar, você autoriza o roiLead a coletar e armazenar seu endereço de e-mail e número de telefone para fins de identificação, acesso aos serviços do plano e comunicação sobre atualizações da plataforma.
              </Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 16, lineHeight: 20 }}>
                O roiLead não compartilha essas informações com terceiros, exceto quando necessário para processar pagamentos através dos nossos parceiros.
              </Text>

              <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.text, marginBottom: 4 }}>2. Comunicação e Transparência</Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 8, lineHeight: 20 }}>
                Ao aceitar estes termos, você está ciente de que não enviaremos e-mails de marketing ou promoções externas, mas poderemos usar o seu e-mail e telefone para contatos referentes exclusivamente ao funcionamento, cobranças ou suporte da sua conta roiLead.
              </Text>
            </ScrollView>

            <View style={{ flexDirection: 'column', gap: 10 }}>
              <TouchableOpacity 
                style={{ backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 8, alignItems: 'center' }}
                onPress={handleAcceptTerms}
                disabled={acceptingTerms}
              >
                {acceptingTerms ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Sim, eu aceito</Text>}
              </TouchableOpacity>
              <TouchableOpacity 
                style={{ backgroundColor: 'transparent', paddingVertical: 14, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: colors.border }}
                onPress={handleDeclineTerms}
                disabled={acceptingTerms}
              >
                <Text style={{ color: colors.text, fontWeight: '600', fontSize: 16 }}>Recusar e Sair</Text>
              </TouchableOpacity>
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
  headerBar: {
    height: 100,
    paddingTop: 45,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  backButton: {
    paddingVertical: 6,
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  headerLogo: {
    width: 120,
    height: 38,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  actionBadge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  nextUserBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    gap: 12,
  },
  nextCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextCircleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  nextTextContainer: {
    flex: 1,
  },
  nextUserName: {
    fontSize: 13,
    fontWeight: '700',
  },
  nextUserStatus: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
  noticeContainer: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  noticeText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  emptyBox: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
  },
  emptyBoxText: {
    fontSize: 13,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopWidth: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  closeButton: {
    padding: 6,
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  modalScroll: {
    marginBottom: 20,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },
  memberCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberCircleText: {
    fontSize: 13,
    fontWeight: '800',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
  },
  memberTime: {
    fontSize: 11,
    marginTop: 2,
  },
  memberStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  // Audit Modal
  auditContainer: {
    gap: 16,
  },
  auditSection: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  auditSectionHeader: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  auditSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  auditList: {
    padding: 12,
    gap: 8,
  },
  auditRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  auditLeadName: {
    fontSize: 13,
    fontWeight: '600',
  },
  auditTime: {
    fontSize: 11,
  },
  auditEmptyText: {
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 8,
  },
});
