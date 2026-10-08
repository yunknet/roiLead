import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useThemeColors } from '../theme/colors';
import { StatusBadge } from './StatusBadge';
import type { SharkLead } from '../lib/types';
import { Feather } from '@expo/vector-icons';

interface CapturedLeadCardProps {
  lead: SharkLead;
  isMine?: boolean;
  onDelete?: (leadId: string) => void;
  onPress: (leadId: string) => void;
  customStatusName?: string;
  onStatusPress?: (leadId: string) => void;
}

export function CapturedLeadCard({
  lead,
  isMine = true,
  onDelete,
  onPress,
  customStatusName,
  onStatusPress
}: CapturedLeadCardProps) {
  const colors = useThemeColors();
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Parse das notas para extrair e-mail e especificações
  const parseNotes = (notes: string | null) => {
    if (!notes) return { email: '', specs: [] };
    const parts = notes.split('|');
    const emailParts = parts.filter(p => p.includes('📧') || p.includes('Email:') || p.includes('@'));
    const otherParts = parts.filter(p => !p.includes('📧') && !p.includes('Email:') && !p.includes('@'));
    const email = emailParts.map(p => p.replace(/📧/g, '').replace(/Email:/g, '').trim()).filter(Boolean).join('');
    
    const specs = otherParts.map(part => {
      let cleanPart = part.trim()
        .replace(/🔸 /g, '')
        .replace(/^Escolha [Oo]\s*/gi, '')
        .replace(/^Selecione [Oo]\s*/gi, '')
        .replace(/Tipo De Cons[oó\u0301]+rcio:?\s*/ig, '')
        .replace(/Valor.*?(Cr[eé\u0301]+dito\s*Desejado|Cr[eé\u0301]+dito):?\s*/ig, 'Crédito desejado: ')
        .replace(/🔸/g, '');

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

    return { email, specs };
  };

  const { email, specs } = parseNotes(lead.notes);
  const createdDate = new Date(lead.created_at).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });

  const handleCopyPhone = () => {
    Clipboard.setStringAsync(lead.phone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const handleCopyEmail = () => {
    if (email) {
      Clipboard.setStringAsync(email);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  const handleDelete = () => {
    if (!onDelete) return;
    Alert.alert(
      'Deletar Lead?',
      `Você tem certeza que deseja remover ${lead.name} do seu CRM? Esta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Confirmar Exclusão', style: 'destructive', onPress: () => onDelete(lead.id) }
      ]
    );
  };

  const handleWhatsApp = () => {
    const cleanPhone = lead.phone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const message = encodeURIComponent(`Olá ${lead.name}!`);
    Linking.openURL(`https://wa.me/${phoneWithCountry}?text=${message}`);
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
        isMine && { borderLeftWidth: 4, borderLeftColor: colors.primary }
      ]}
    >
      {/* Header: Nome + Delete (trash icon) */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.nameContainer} onPress={() => onPress(lead.id)} activeOpacity={0.7}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {lead.name}
          </Text>
          <Text style={[styles.date, { color: colors.textDimmed }]}>
            Capturado em {createdDate}
          </Text>
        </TouchableOpacity>
        <View style={styles.headerActions}>
          {onStatusPress && isMine ? (
            <TouchableOpacity onPress={() => onStatusPress(lead.id)} activeOpacity={0.7}>
              <StatusBadge status={lead.status} customName={customStatusName} />
            </TouchableOpacity>
          ) : (
            <StatusBadge status={lead.status} customName={customStatusName} />
          )}
          {isMine && onDelete && (
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <Feather name="trash-2" size={16} color={colors.danger || '#ef4444'} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Specs / Notas */}
      {specs.length > 0 ? (
        <View style={[styles.specsContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Feather name="list" size={12} color={colors.textMuted} />
            <Text style={[styles.specsLabel, { color: colors.textMuted, marginBottom: 0 }]}>ESPECIFICAÇÕES</Text>
          </View>
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

      {/* Contato Info / Copiar */}
      {isMine ? (
        <View style={styles.contactContainer}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <Feather name="unlock" size={14} color={colors.primary} />
            <Text style={[styles.contactLabel, { color: colors.primary, marginBottom: 0 }]}>Contato Liberado</Text>
          </View>
          
          <View style={styles.row}>
            <View style={[styles.infoBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.infoText, { color: colors.text }]}>{lead.phone}</Text>
            </View>
            <TouchableOpacity
              style={[styles.copyButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={handleCopyPhone}
            >
              <Feather name={copiedPhone ? "check" : "copy"} size={16} color={copiedPhone ? colors.success || '#22c55e' : colors.primary} />
            </TouchableOpacity>
          </View>

          {email ? (
            <View style={[styles.row, { marginTop: 6 }]}>
              <View style={[styles.infoBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.infoText, { color: colors.text, fontSize: 12 }]} numberOfLines={1}>
                  {email}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.copyButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={handleCopyEmail}
              >
                <Feather name={copiedEmail ? "check" : "copy"} size={16} color={copiedEmail ? colors.success || '#22c55e' : colors.primary} />
              </TouchableOpacity>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.whatsappButton, { backgroundColor: '#25D366' }]}
            onPress={handleWhatsApp}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Feather name="message-circle" size={16} color="#FFFFFF" />
              <Text style={styles.whatsappButtonText}>Chamar no Whats</Text>
            </View>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.lockedContainer, { backgroundColor: colors.surface, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
          <Feather name="lock" size={14} color={colors.textMuted} />
          <Text style={[styles.lockedText, { color: colors.textMuted }]}>
            Capturado por outro membro
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  nameContainer: {
    flex: 1,
    marginRight: 8,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  date: {
    fontSize: 11,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteButton: {
    padding: 6,
    borderRadius: 8,
  },
  deleteIcon: {
    fontSize: 16,
  },
  specsContainer: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    gap: 4,
  },
  specsLabel: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  specItem: {
    fontSize: 12,
    fontWeight: '600',
  },
  contactContainer: {
    gap: 8,
  },
  contactLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  row: {
    flexDirection: 'row',
    gap: 6,
  },
  infoBox: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    fontSize: 14,
    fontWeight: '700',
  },
  copyButton: {
    width: 44,
    height: 40,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyButtonText: {
    fontSize: 16,
  },
  whatsappButton: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  whatsappButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  lockedContainer: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
