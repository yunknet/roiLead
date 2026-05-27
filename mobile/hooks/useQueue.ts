import { useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { SharkLead, TurnInfo, TurnUser } from '../lib/types';

interface UseQueueReturn {
  getTimeLeft: (lead: SharkLead, clockOffset: number) => number;
  getCurrentTurnUser: (turnInfo: TurnInfo | null, unclaimedLeads: SharkLead[]) => TurnUser | null;
  getMyPosition: (turnInfo: TurnInfo | null, currentUserId: string | null, currentTurnUserId?: string | null) => number;
  isMyTurn: (lead: SharkLead, currentUserId: string | null) => boolean;
  rotateTurns: () => Promise<void>;
}

export function useQueue(): UseQueueReturn {
  const rotatingRef = useRef(false);

  // Calcula o tempo restante do timer para um lead na fila
  // Replica EXATAMENTE a lógica do LeadQueueCard (linhas 98-114 do CupulaBoard.tsx)
  const getTimeLeft = useCallback((lead: SharkLead, clockOffset: number): number => {
    if (!lead.turn_expires_at || !lead.current_turn_user_id) return 0;

    const serverNow = Date.now() - clockOffset;
    const expiresAtMs = new Date(lead.turn_expires_at).getTime();
    const timeLeftSec = Math.max(0, Math.floor((expiresAtMs - serverNow) / 1000));

    return timeLeftSec;
  }, []);

  // Determina quem é o consultor da vez para o lead na frente da fila
  const getCurrentTurnUser = useCallback((
    turnInfo: TurnInfo | null,
    unclaimedLeads: SharkLead[]
  ): TurnUser | null => {
    if (!turnInfo?.active_users?.length || !unclaimedLeads.length) return null;

    const firstLead = unclaimedLeads[0];
    if (!firstLead.current_turn_user_id) return null;

    const turnUserId = firstLead.current_turn_user_id;
    const found = turnInfo.active_users.find(
      (u: TurnUser) => (u.id || u.user_id) === turnUserId
    );

    return found || null;
  }, []);

  // Calcula a posição do usuário na fila (1 = próximo, 2 = segundo, etc.)
  const getMyPosition = useCallback((
    turnInfo: TurnInfo | null,
    currentUserId: string | null,
    currentTurnUserId?: string | null
  ): number => {
    if (!turnInfo?.active_users?.length || !currentUserId) return -1;

    const _active = turnInfo.active_users;
    const currentUserIndex = _active.findIndex(
      (u: TurnUser) => (u.id || u.user_id) === currentUserId
    );

    if (currentUserIndex === -1) return -1;

    if (currentTurnUserId) {
      const currentOwnerIndex = _active.findIndex(
        (u: TurnUser) => (u.id || u.user_id) === currentTurnUserId
      );
      if (currentOwnerIndex !== -1) {
        return (currentUserIndex - currentOwnerIndex + _active.length) % _active.length + 1;
      }
    }

    return currentUserIndex + 1;
  }, []);

  // Verifica se é a vez do usuário logado para um determinado lead
  const isMyTurn = useCallback((lead: SharkLead, currentUserId: string | null): boolean => {
    if (!currentUserId || !lead.current_turn_user_id) return false;
    return lead.current_turn_user_id === currentUserId;
  }, []);

  // Chama o RPC para rotacionar os turnos quando o timer expira
  // Replica a lógica do useEffect no LeadQueueCard (linhas 124-137 do CupulaBoard.tsx)
  const rotateTurns = useCallback(async () => {
    if (rotatingRef.current) return;
    rotatingRef.current = true;

    try {
      await supabase.rpc('rotate_cupula_turns');
    } catch (error) {
      console.error('Erro ao rotacionar turnos:', error);
    } finally {
      // Pequeno delay para evitar chamadas duplicadas
      setTimeout(() => {
        rotatingRef.current = false;
      }, 2000);
    }
  }, []);

  return {
    getTimeLeft,
    getCurrentTurnUser,
    getMyPosition,
    isMyTurn,
    rotateTurns,
  };
}
