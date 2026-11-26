import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const Bloco = ({ titulo, children }: { titulo: string; children: React.ReactNode }) => (
  <section className="space-y-1.5">
    <h4 className="font-semibold text-foreground">{titulo}</h4>
    <div className="text-sm text-muted-foreground leading-relaxed space-y-1.5">{children}</div>
  </section>
);

/** Botão permanente "O que é?" da Calculadora Tributária. */
export function SobreCalculadora() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5" aria-label="O que é a Calculadora Tributária">
          <Info className="w-4 h-4 text-primary" />O que é?
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <DialogTitle>O que é a Calculadora Tributária?</DialogTitle>
          <DialogDescription>Simulador gratuito dos novos tributos da Reforma Tributária do Consumo.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <Bloco titulo="Para que serve">
            <p>A Reforma Tributária (Emenda Constitucional 132 e Lei Complementar 214/2025) troca PIS, Cofins, IPI, ICMS e ISS por três tributos novos:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><b className="text-foreground">CBS</b>: Contribuição sobre Bens e Serviços, da União.</li>
              <li><b className="text-foreground">IBS</b>: Imposto sobre Bens e Serviços, de estados e municípios (parte estadual e parte municipal).</li>
              <li><b className="text-foreground">IS</b>: Imposto Seletivo, sobre produtos prejudiciais à saúde ou ao meio ambiente (como bebidas, cigarros e veículos), a partir de 2027.</li>
            </ul>
            <p>A calculadora mostra quanto cada tributo dá numa venda de produto ou serviço, com as reduções e isenções da lei, e explica o cálculo passo a passo.</p>
          </Bloco>

          <Bloco titulo="Lucro Real/Presumido ou Simples Nacional">
            <p>No topo da página você escolhe o regime da empresa que está vendendo:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><b className="text-foreground">Lucro Real ou Presumido</b>: usa as alíquotas cheias da CBS e do IBS com as reduções da lei, calcula o Imposto Seletivo e gera o XML da nota.</li>
              <li><b className="text-foreground">Simples Nacional</b> (ME e EPP): a partir de 2027, a CBS e o IBS saem da alíquota efetiva do anexo da empresa (I a V). Ela depende do faturamento dos últimos 12 meses e do fator "r", e está no PGDAS-D ou com o contador. Também atende quem optou por pagar IBS e CBS por fora do Simples. O MEI não entra nesse cálculo.</li>
            </ul>
          </Bloco>

          <Bloco titulo="Para quem é">
            <p>Empresários, contadores, vendedores e quem emite nota fiscal. Use para formar preço, conferir o que vai sair na nota, comparar cenários e preparar a empresa para a transição, que vai de 2026 a 2033.</p>
          </Bloco>

          <Bloco titulo="Como usar">
            <ol className="list-decimal pl-5 space-y-1">
              <li>Informe a <b className="text-foreground">data</b>, a <b className="text-foreground">UF</b> e o <b className="text-foreground">município</b> da operação.</li>
              <li>Adicione os <b className="text-foreground">itens</b>. Busque o produto pelo NCM ou o serviço pelo NBS (pelo código ou pela descrição), escolha o CST e a classificação tributária e informe o valor.</li>
              <li>Clique em <b className="text-foreground">Calcular tributos</b>. Você vê o total, o detalhe por item, a memória de cálculo e pode gerar o XML do documento fiscal.</li>
            </ol>
            <p>Na aba <b className="text-foreground">Consultas e todas as funções</b> você consulta as tabelas oficiais (NCM, NBS, CST, classificações, alíquotas, fundamentação legal) e usa todas as funções da calculadora, incluindo base de cálculo, NFS-e e pedágio.</p>
          </Bloco>

          <Bloco titulo="Termos que aparecem">
            <ul className="list-disc pl-5 space-y-1">
              <li><b className="text-foreground">NCM</b>: código de 8 dígitos que identifica o produto.</li>
              <li><b className="text-foreground">NBS</b>: código de 9 dígitos que identifica o serviço.</li>
              <li><b className="text-foreground">CST</b>: situação tributária (ex.: 000 tributação integral, 200 alíquota reduzida).</li>
              <li><b className="text-foreground">cClassTrib</b>: classificação tributária dentro do CST, que define reduções e o artigo da lei.</li>
              <li><b className="text-foreground">Alíquota efetiva</b>: a alíquota depois das reduções.</li>
            </ul>
          </Bloco>

          <Bloco titulo="Alíquotas e datas">
            <p>Até 31/12/2026 é a fase de teste, com CBS de 0,9% e IBS de 0,1%; a calculadora aplica essas alíquotas sozinha. De 2027 em diante, informe as alíquotas no item. Quando a tabela oficial já trouxer as alíquotas de referência, elas são preenchidas automaticamente.</p>
          </Bloco>

          <Bloco titulo="De onde vêm os dados">
            <p>O cálculo usa o motor de código aberto da Calculadora de Tributos da Receita Federal (licença MIT), com as tabelas oficiais. Ele roda nos servidores do roiLead e é atualizado sempre que a Receita publica uma nova versão.</p>
            <p><b className="text-foreground">Importante:</b> é uma simulação. Não é um serviço oficial do governo e não substitui a orientação do seu contador.</p>
          </Bloco>

          <Bloco titulo="Quanto custa">
            <p>Nada. A calculadora é gratuita para qualquer pessoa com conta no roiLead, mesmo sem plano pago.</p>
          </Bloco>
        </div>
      </DialogContent>
    </Dialog>
  );
}
