export const NICHES = ['Consórcio', 'Administrativo'] as const;
export type Niche = typeof NICHES[number];
export type SharkStatus = string;

export interface SharkLead {
  id: string;
  niche: Niche;
  name: string;
  phone: string;
  notes: string | null;
  status: SharkStatus;
  owner_id: string | null;
  assigned_to: string | null;
  assigned_at: string | null;
  created_at: string;
  updated_at?: string;
  claimed_at: string | null;
  current_turn_user_id: string | null;
  turn_expires_at: string | null;
}

export interface TurnInfo {
  active_users: TurnUser[];
  base_turn_index: number;
  server_now: number;
}

export interface TurnUser {
  id?: string;
  user_id?: string;
  name: string;
  joined_at?: string;
  last_lead_at?: string | null;
}

export interface CupulaAccess {
  id: string;
  user_id: string;
  email: string;
  status: 'active' | 'inactive' | 'banned';
  full_name: string | null;
  niches: Niche[];
  last_lead_at: string | null;
}

export interface CustomColumn {
  id: string;
  title: string;
  color: string;
  position: number;
}

export interface BaseColumn {
  id: SharkStatus;
  title: string;
  color: string;
}
