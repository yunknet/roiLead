import { colors } from '../theme/colors';
import { BaseColumn } from './types';

export const BASE_COLUMNS: BaseColumn[] = [
  { id: 'novos', title: 'Novos', color: colors.colNovos },
  { id: 'contatados', title: 'Contatados', color: colors.colContatados },
  { id: 'negociacao', title: 'Negociação', color: colors.colNegociacao },
  { id: 'fechados', title: 'Fechados', color: colors.colFechados },
  { id: 'perdidos', title: 'Perdidos', color: colors.colPerdidos },
];

export const WHATSAPP_ADMIN_NUMBER = '5511922967021';

export const TIMER_DURATION_SECONDS = 180; // 3 minutos

export const REFRESH_INTERVAL_MS = 30000; // 30 segundos backup
