import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export default function Settings() {
  const { userProfile, setUserProfile } = useOutletContext<any>();
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempFirstName, setTempFirstName] = useState(userProfile?.firstName || '');
  const [tempLastName, setTempLastName] = useState(userProfile?.lastName || '');
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [tempEmail, setTempEmail] = useState(userProfile?.email || '');
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phone, setPhone] = useState(userProfile?.phone_number || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleSaveName = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from('profiles').update({ first_name: tempFirstName, last_name: tempLastName, updated_at: new Date().toISOString() }).eq('id', user.id);
      if (error) throw error;
      setUserProfile((prev: any) => prev ? ({ ...prev, firstName: tempFirstName, lastName: tempLastName }) : null);
      setIsEditingName(false);
      toast.success('Nome atualizado com sucesso!');
    } catch (err: any) { toast.error('Erro ao atualizar nome: ' + err.message); }
  };

  const handleSaveEmail = async () => {
    try {
      if (!tempEmail || !tempEmail.includes('@')) { toast.error('Formato de e-mail inválido'); return; }
      const { error } = await supabase.rpc('change_user_email', { new_email: tempEmail });
      if (error) throw error;
      toast.success('E-mail atualizado com sucesso!');
      setIsEditingEmail(false);
      setUserProfile((prev: any) => prev ? ({ ...prev, email: tempEmail }) : null);
    } catch (err: any) { toast.error(err.message || 'Erro ao atualizar e-mail.'); }
  };

  const handleSavePhone = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      if (userProfile?.last_phone_update) {
        const lastUpdate = new Date(userProfile.last_phone_update);
        const diffDays = (new Date().getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays < 15) { toast.error(`Você só pode alterar o telefone novamente em ${Math.ceil(15 - diffDays)} dia(s).`); return; }
      }
      const currentDate = new Date().toISOString();
      const { error } = await supabase.from('profiles').update({ phone_number: phone, last_phone_update: currentDate, updated_at: currentDate }).eq('id', user.id);
      if (error) throw error;
      toast.success('Telefone atualizado com sucesso!');
      setIsEditingPhone(false);
      setUserProfile((prev: any) => prev ? ({ ...prev, phone_number: phone, last_phone_update: currentDate }) : null);
    } catch (err: any) { toast.error('Erro ao atualizar telefone: ' + err.message); }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) return toast.error('As senhas não coincidem!');
    if (newPassword.length < 6) return toast.error('A senha deve ter pelo menos 6 caracteres.');
    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Senha alterada com sucesso!');
      setNewPassword(''); setConfirmPassword('');
    } catch (error: any) { toast.error('Erro ao alterar senha.'); } finally { setIsChangingPassword(false); }
  };

  return (
    <div className="flex-1 p-4 sm:p-6 overflow-y-auto w-full">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-foreground">Configurações</h2>
          <p className="text-muted-foreground">Gerencie seu perfil e preferências.</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 sm:p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">Informações Pessoais</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Nome Completo</label>
                <div className="flex gap-2">
                  <Input value={tempFirstName} readOnly={!isEditingName} onChange={(e) => setTempFirstName(e.target.value)} className="bg-muted/50 w-1/2" placeholder="Nome" />
                  <Input value={tempLastName} readOnly={!isEditingName} onChange={(e) => setTempLastName(e.target.value)} className="bg-muted/50 w-1/2" placeholder="Sobrenome" />
                  {!isEditingName ? <Button variant="outline" onClick={() => { setTempFirstName(userProfile?.firstName || ''); setTempLastName(userProfile?.lastName || ''); setIsEditingName(true); }}>Editar</Button> : <div className="flex gap-2"><Button variant="outline" onClick={() => { setIsEditingName(false); setTempFirstName(userProfile?.firstName || ''); setTempLastName(userProfile?.lastName || ''); }}>Cancelar</Button><Button onClick={handleSaveName}>Salvar</Button></div>}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">E-mail</label>
                <div className="flex gap-2">
                  <Input value={tempEmail} readOnly={!isEditingEmail} onChange={(e) => setTempEmail(e.target.value)} className="bg-muted/50" />
                  {!isEditingEmail ? <Button variant="outline" onClick={() => { setTempEmail(userProfile?.email || ''); setIsEditingEmail(true); }}>Alterar</Button> : <div className="flex gap-2"><Button variant="outline" onClick={() => { setIsEditingEmail(false); setTempEmail(userProfile?.email || ''); }}>Cancelar</Button><Button onClick={handleSaveEmail}>Salvar</Button></div>}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Telefone</label>
                <div className="flex gap-2">
                  <Input value={phone} readOnly={!isEditingPhone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 00000-0000" className="bg-muted/50" />
                  {!isEditingPhone ? <Button variant="outline" onClick={() => setIsEditingPhone(true)}>Editar</Button> : <div className="flex gap-2"><Button variant="outline" onClick={() => { setIsEditingPhone(false); setPhone(userProfile?.phone_number || ''); }}>Cancelar</Button><Button onClick={handleSavePhone}>Salvar</Button></div>}
                </div>
              </div>
            </div>
          </div>
          <div className="pt-6 border-t border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">Segurança</h3>
            <div className="space-y-4">
              <div className="space-y-2"><label className="text-sm font-medium text-foreground">Nova Senha</label><Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="bg-muted/50" /></div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Confirmar Nova Senha</label>
                <div className="flex gap-2">
                  <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="bg-muted/50" />
                  <Button onClick={handleChangePassword} disabled={isChangingPassword || !newPassword || !confirmPassword}>{isChangingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Atualizar'}</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
