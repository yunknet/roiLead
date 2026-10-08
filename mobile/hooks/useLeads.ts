import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { SharkLead, Niche, CustomColumn, TurnInfo } from '../lib/types';
import { REFRESH_INTERVAL_MS } from '../lib/constants';

interface UseLeadsReturn {
  leads: SharkLead[];
  loading: boolean;
  turnInfo: TurnInfo | null;
  clockOffset: number;
  customColumns: CustomColumn[];
  columnOrder: string[];
  customNames: Record<string, string>;
  noticeMessage: string | null;
  fetchLeads: () => Promise<void>;
  handleClaimLead: (leadId: string) => Promise<{ success: boolean; error?: string }>;
  handleStatusChange: (leadId: string, newStatus: string) => Promise<{ success: boolean; error?: string }>;
  handleDeleteLead: (leadId: string) => Promise<{ success: boolean; error?: string }>;
  fetchAuditData: () => Promise<any[]>;
  handleCreateColumn: () => Promise<{ success: boolean; error?: string }>;
  handleUpdateColumnName: (columnId: string, newName: string) => Promise<{ success: boolean; error?: string }>;
}

export function useLeads(selectedNiche: Niche | null, currentUserId: string | null): UseLeadsReturn {
  const [leads, setLeads] = useState<SharkLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [turnInfo, setTurnInfo] = useState<TurnInfo | null>(null);
  const [clockOffset, setClockOffset] = useState(0);
  const clockOffsetRef = useRef(0);
  const [customColumns, setCustomColumns] = useState<CustomColumn[]>([]);
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [customNames, setCustomNames] = useState<Record<string, string>>({});
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  // Replica EXATAMENTE o fetchLeads do CupulaBoard.tsx (linhas 589-716)
  const fetchLeads = useCallback(async () => {
    if (!selectedNiche) {
      setLoading(false);
      return;
    }

    try {
      // Garante que temos o ID do usuário para filtrar com precisão
      const { data: { user } } = await supabase.auth.getUser();
      const userId = currentUserId || user?.id;

      if (!userId) {
        setLoading(false);
        return;
      }

      // Busca os leads do nicho selecionado: APENAS os "novos" (sem dono) OU os que já são deste usuário
      // Isso garante que leads antigos não fiquem de fora do limite de 5.000 da API
      const { data, error } = await supabase
        .from('cupula_leads')
        .select('*, cupula_leads_private(phone, notes)')
        .eq('niche', selectedNiche)
        .or(`status.eq.novos,owner_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(5000);

      if (error) throw error;
      
      const mappedLeads = (data || []).map((lead: any) => {
        const privateData = Array.isArray(lead.cupula_leads_private) 
            ? lead.cupula_leads_private[0] 
            : lead.cupula_leads_private;
            
        return {
          ...lead,
          phone: privateData?.phone || lead.phone,
          notes: privateData?.notes || lead.notes
        };
      }) as SharkLead[];
      
      setLeads(mappedLeads);

      // Busca de quem é a vez na fila via RPC
      const { data: queueData, error: queueErr } = await supabase.rpc('get_cupula_queue', {
        niche_param: selectedNiche,
      });

      if (!queueErr && queueData) {
        // Busca direta do last_lead_at específico deste nicho (para exibição)
        const { data: accessData } = await supabase
          .from('cupula_last_leads')
          .select('user_id, last_lead_at')
          .eq('niche', selectedNiche);

        if (accessData) {
          const accessMap: Record<string, string> = {};
          accessData.forEach((row: any) => {
            accessMap[row.user_id] = row.last_lead_at;
          });

          // Mescla last_lead_at para exibição (NÃO reordena — a ordem fixa vem do banco)
          if (queueData.active_users) {
            queueData.active_users = queueData.active_users.map((u: any) => ({
              ...u,
              last_lead_at: accessMap[u.id] || accessMap[u.user_id] || null,
            }));
          }
        }

        setTurnInfo(queueData);

        // Clock sync: calcula a diferença entre o relógio local e o do servidor
        if (queueData.server_now) {
          const serverTime = Number(queueData.server_now);
          if (!isNaN(serverTime) && serverTime > 0) {
            const offset = Date.now() - serverTime;
            setClockOffset(offset);
            clockOffsetRef.current = offset;
          }
        }
      }

      // Busca configurações de nomes de colunas e colunas customizadas
      const { data: settingsData } = await supabase
        .from('cupula_settings')
        .select('column_id, custom_name')
        .eq('niche', selectedNiche);

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
              namesMap[item.column_id] = meta.title || 'Nova Etapa';
            } catch {
              userCustomCols.push({
                id: item.column_id,
                title: item.custom_name,
                color: '#6366F1',
                position: 99,
              });
              namesMap[item.column_id] = item.custom_name;
            }
          } else {
            namesMap[item.column_id] = item.custom_name;
          }
        });

        setCustomNames(namesMap);
        setCustomColumns(userCustomCols.sort((a, b) => a.position - b.position));
        setColumnOrder(savedOrder);
      }

      // Busca aviso ativo da Cúpula
      const { data: noticeData } = await supabase
        .from('cupula_notices')
        .select('message')
        .eq('niche', selectedNiche)
        .eq('is_active', true)
        .maybeSingle();

      setNoticeMessage(noticeData?.message?.trim() || null);
    } catch (error: any) {
      console.error('Erro ao puxar leads da Cúpula:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedNiche, currentUserId]);

  // Replica EXATAMENTE o handleClaimLead do CupulaBoard.tsx (linhas 719-749)
  const handleClaimLead = useCallback(async (leadId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.rpc('claim_cupula_lead', { target_lead_id: leadId });

      if (error) {
        console.error('Erro no RPC claim_cupula_lead:', error);
        return { success: false, error: error.message || 'Erro desconhecido ao pegar o lead.' };
      }

      // Atualiza o tempo da última captura ESPECÍFICO deste nicho
      const { data: { user } } = await supabase.auth.getUser();
      if (user && selectedNiche) {
        await supabase
          .from('cupula_last_leads')
          .upsert({
            user_id: user.id,
            niche: selectedNiche,
            last_lead_at: new Date().toISOString(),
          }, { onConflict: 'user_id,niche' });
      }

      fetchLeads();
      return { success: true };
    } catch (error: any) {
      console.error('Erro ao capturar lead:', error);
      return { success: false, error: 'Erro ao processar captura.' };
    }
  }, [selectedNiche, fetchLeads]);

  // Replica EXATAMENTE o handleStatusChange do CupulaBoard.tsx (linhas 936-953)
  const handleStatusChange = useCallback(async (
    leadId: string,
    newStatus: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('cupula_leads')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', leadId)
        .eq('owner_id', currentUserId); // Segurança redobrada: só muda se for o dono

      if (error) {
        console.error('Erro ao mudar status:', error);
        return { success: false, error: error.message };
      }

      fetchLeads();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: 'Erro ao mover o lead. Sem permissão ou falha de conexão.' };
    }
  }, [currentUserId, fetchLeads]);

  // Replica EXATAMENTE o handleDeleteLead do CupulaBoard.tsx (linhas 751-767)
  const handleDeleteLead = useCallback(async (leadId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('cupula_leads')
        .delete()
        .eq('id', leadId)
        .eq('owner_id', currentUserId);

      if (error) throw error;

      fetchLeads();
      return { success: true };
    } catch (error: any) {
      console.error('Erro ao deletar lead:', error);
      return { success: false, error: 'Erro ao deletar lead.' };
    }
  }, [currentUserId, fetchLeads]);

  const fetchAuditData = useCallback(async (): Promise<any[]> => {
    if (!selectedNiche) return [];
    try {
      const { data, error } = await supabase.rpc('get_cupula_audit', { niche_param: selectedNiche });
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Erro ao buscar auditoria:', err);
      return [];
    }
  }, [selectedNiche]);

  const handleCreateColumn = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!selectedNiche || !currentUserId) return { success: false, error: 'Usuário ou nicho não definido' };
    
    const columnId = `custom_${Date.now()}`;
    const position = customColumns.length > 0 
      ? Math.max(...customColumns.map(c => c.position)) + 1 
      : 1;

    const newCol = {
      id: columnId,
      title: 'Nova Etapa',
      color: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500',
      position
    };

    try {
      const { error } = await supabase
        .from('cupula_settings')
        .upsert({
          user_id: currentUserId,
          niche: selectedNiche,
          column_id: columnId,
          custom_name: JSON.stringify(newCol),
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,niche,column_id' });

      if (error) throw error;
      fetchLeads();
      return { success: true };
    } catch (error: any) {
      console.error('Erro ao adicionar coluna:', error);
      return { success: false, error: 'Erro ao adicionar etapa.' };
    }
  }, [selectedNiche, currentUserId, customColumns, fetchLeads]);

  const handleUpdateColumnName = useCallback(async (columnId: string, newName: string): Promise<{ success: boolean; error?: string }> => {
    if (!selectedNiche || !currentUserId || !newName.trim()) return { success: false, error: 'Dados inválidos' };

    try {
      let customNamePayload = newName.trim();

      if (columnId.startsWith('custom_')) {
        const customCol = customColumns.find(c => c.id === columnId);
        if (customCol) {
          customNamePayload = JSON.stringify({
            title: newName.trim(),
            color: customCol.color,
            position: customCol.position
          });
        }
      }

      const { error } = await supabase
        .from('cupula_settings')
        .upsert({
          user_id: currentUserId,
          niche: selectedNiche,
          column_id: columnId,
          custom_name: customNamePayload,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,niche,column_id' });

      if (error) throw error;
      fetchLeads();
      return { success: true };
    } catch (error: any) {
      console.error('Erro ao atualizar nome da coluna:', error);
      return { success: false, error: 'Erro ao atualizar nome da etapa.' };
    }
  }, [selectedNiche, currentUserId, customColumns, fetchLeads]);

  const handleDeleteColumn = useCallback(async (columnId: string): Promise<{ success: boolean; error?: string }> => {
    if (!selectedNiche || !currentUserId) return { success: false, error: 'Usuário ou nicho não definido' };
    
    try {
      const { error } = await supabase
        .from('cupula_settings')
        .delete()
        .eq('user_id', currentUserId)
        .eq('niche', selectedNiche)
        .eq('column_id', columnId);

      if (error) throw error;
      fetchLeads();
      return { success: true };
    } catch (error: any) {
      console.error('Erro ao deletar coluna:', error);
      return { success: false, error: 'Erro ao deletar etapa.' };
    }
  }, [selectedNiche, currentUserId, fetchLeads]);

  // Realtime + backup interval — Replica a lógica da web (linhas 565-581)
  useEffect(() => {
    if (!selectedNiche) return;

    fetchLeads();

    // Nome único de canal para evitar conflitos entre múltiplas abas usando o mesmo hook
    const channelId = `cupula-leads-${selectedNiche}-${Math.random().toString(36).substring(2, 9)}`;

    // Realtime: ouve TODAS as alterações na tabela cupula_leads
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cupula_leads' },
        () => {
          fetchLeads();
        }
      )
      .subscribe();

    // Backup interval: garante sincronia mesmo se o realtime falhar
    const interval = setInterval(fetchLeads, REFRESH_INTERVAL_MS);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [selectedNiche, fetchLeads]);

  return {
    leads,
    loading,
    turnInfo,
    clockOffset,
    customColumns,
    columnOrder,
    customNames,
    noticeMessage,
    fetchLeads,
    handleClaimLead,
    handleStatusChange,
    handleDeleteLead,
    fetchAuditData,
    handleCreateColumn,
    handleUpdateColumnName,
    handleDeleteColumn,
  };
}
