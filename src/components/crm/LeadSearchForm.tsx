import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Search, Filter } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export function LeadSearchForm({ onSearchComplete }: { onSearchComplete?: () => void }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    busca_textual: "",
    uf: "",
    municipio: "",
    ddd: "",
    capital_minimo: "",
    capital_maximo: "",
    data_inicio: "",
    data_fim: "",
    excluir_mei: false,
    excluir_simples: false,
    com_email: true,
    com_telefone: true,
    somente_celular: false,
    quantidade: "50"
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado.");

      // Mount payload for Casa dos Dados API
      const payload: any = {
        situacao_cadastral: ["ATIVA"],
        limite: parseInt(formData.quantidade),
        pagina: 1,
        mais_filtros: {
          com_email: formData.com_email,
          com_telefone: formData.com_telefone,
          somente_celular: formData.somente_celular
        }
      };

      if (formData.busca_textual) {
        payload.busca_textual = [{
          texto: [formData.busca_textual],
          tipo_busca: "exata",
          razao_social: true,
          nome_fantasia: true,
          nome_socio: true
        }];
      }

      if (formData.uf) payload.uf = formData.uf.split(",").map(s => s.trim().toUpperCase());
      if (formData.municipio) payload.municipio = formData.municipio.split(",").map(s => s.trim().toUpperCase());
      if (formData.ddd) payload.ddd = formData.ddd.split(",").map(s => s.trim());

      if (formData.capital_minimo || formData.capital_maximo) {
        payload.capital_social = {
          minimo: formData.capital_minimo ? parseInt(formData.capital_minimo) : 0,
          maximo: formData.capital_maximo ? parseInt(formData.capital_maximo) : 0
        };
      }

      if (formData.data_inicio || formData.data_fim) {
        payload.data_abertura = {
          inicio: formData.data_inicio || "1900-01-01",
          fim: formData.data_fim || new Date().toISOString().split("T")[0]
        };
      }

      if (formData.excluir_mei) {
        payload.mei = { optante: false, excluir_optante: true };
      }
      if (formData.excluir_simples) {
        payload.simples = { optante: false, excluir_optante: true };
      }

      // API Call via our Edge Function to hide API Key
      const { data, error } = await supabase.functions.invoke('casadosdados-search', {
        body: payload
      });

      if (error) throw error;
      
              // Save search history
        const fetchedLeads = data?.cnpjs || [];
        if (fetchedLeads.length > 0) {
          const { error: insertError } = await supabase.from('lead_requests').insert({
            user_id: user.id,
            request_details: `Busca no sistema: ${formData.busca_textual} ${formData.municipio}`,
            leads_data: fetchedLeads,
          });
          
          if (insertError) {
            console.error("Erro no insert:", insertError);
            throw new Error("Erro ao salvar histórico: " + insertError.message);
          }
        }
  
        toast.success(`Busca concluída! ${fetchedLeads.length} empresas encontradas.`);
      
      if (onSearchComplete) {
        setTimeout(() => onSearchComplete(), 2000);
      }
      
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao realizar busca.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 mb-8 shadow-sm">
      <div className="flex items-center gap-2 mb-6">
        <Search className="w-5 h-5 text-primary" />
        <h3 className="text-xl font-bold text-foreground">Nova Busca de Leads</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="busca_textual">Palavra-chave (Nicho, Razão Social, etc)</Label>
            <Input 
              id="busca_textual" 
              name="busca_textual" 
              placeholder="Ex: Engenharia Civil, Restaurante..." 
              value={formData.busca_textual}
              onChange={handleInputChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="uf">Estado(s) (Sigla, ex: SP, RJ)</Label>
            <Input 
              id="uf" 
              name="uf" 
              placeholder="Ex: SP, MG" 
              value={formData.uf}
              onChange={handleInputChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="municipio">Município(s)</Label>
            <Input 
              id="municipio" 
              name="municipio" 
              placeholder="Ex: São Paulo, Campinas" 
              value={formData.municipio}
              onChange={handleInputChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ddd">DDD(s)</Label>
            <Input 
              id="ddd" 
              name="ddd" 
              placeholder="Ex: 11, 19" 
              value={formData.ddd}
              onChange={handleInputChange}
            />
          </div>

          <div className="space-y-2">
            <Label>Capital Social</Label>
            <div className="flex gap-2">
              <Input 
                name="capital_minimo" 
                placeholder="Mínimo (R$)" 
                type="number"
                value={formData.capital_minimo}
                onChange={handleInputChange}
              />
              <Input 
                name="capital_maximo" 
                placeholder="Máximo (R$)" 
                type="number"
                value={formData.capital_maximo}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Data de Abertura</Label>
            <div className="flex gap-2">
              <Input 
                name="data_inicio" 
                type="date"
                value={formData.data_inicio}
                onChange={handleInputChange}
              />
              <Input 
                name="data_fim" 
                type="date"
                value={formData.data_fim}
                onChange={handleInputChange}
              />
            </div>
          </div>
        </div>

        <div className="bg-secondary/50 p-4 rounded-lg space-y-4 border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold text-sm">Filtros Avançados</span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="excluir_mei" 
                name="excluir_mei"
                checked={formData.excluir_mei}
                onCheckedChange={(c) => setFormData(p => ({ ...p, excluir_mei: !!c }))}
              />
              <Label htmlFor="excluir_mei" className="cursor-pointer">Excluir MEI</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="excluir_simples" 
                name="excluir_simples"
                checked={formData.excluir_simples}
                onCheckedChange={(c) => setFormData(p => ({ ...p, excluir_simples: !!c }))}
              />
              <Label htmlFor="excluir_simples" className="cursor-pointer">Excluir Simples Nacional</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="somente_celular" 
                name="somente_celular"
                checked={formData.somente_celular}
                onCheckedChange={(c) => setFormData(p => ({ ...p, somente_celular: !!c }))}
              />
              <Label htmlFor="somente_celular" className="cursor-pointer">Somente Celular</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="com_email" 
                name="com_email"
                checked={formData.com_email}
                onCheckedChange={(c) => setFormData(p => ({ ...p, com_email: !!c }))}
              />
              <Label htmlFor="com_email" className="cursor-pointer">Com E-mail</Label>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-2">
          <div className="flex items-center gap-3 w-full sm:w-auto bg-secondary/30 p-2 px-4 rounded-lg border border-border">
            <Label htmlFor="quantidade" className="whitespace-nowrap">Quantidade de Empresas:</Label>
            <Input
              id="quantidade"
              name="quantidade"
              type="number"
              min="1"
              max="1000"
              value={formData.quantidade}
              onChange={(e) => setFormData(p => ({ ...p, quantidade: e.target.value }))}
              className="w-20 h-9"
            />
          </div>

          <Button type="submit" size="lg" disabled={loading} className="w-full sm:w-auto">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
            Minerar Leads
          </Button>
        </div>
      </form>
    </div>
  );
}


