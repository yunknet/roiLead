import { KanbanBoard } from '@/components/crm/KanbanBoard';
import { toast } from 'sonner';

export default function Crm() {
  const handleOpenContact = async (phone: string) => {
    let cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone) {
      toast.error('Número de telefone não encontrado.');
      return;
    }
    if (cleanPhone.length <= 11) cleanPhone = `55${cleanPhone}`;
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
    toast.success('Abrindo contato...');
  };

  return (
    <div className="flex-1 overflow-hidden h-full flex flex-col p-4 sm:p-6 pb-2 w-full">
      <KanbanBoard onCallLead={handleOpenContact} />
    </div>
  );
}
