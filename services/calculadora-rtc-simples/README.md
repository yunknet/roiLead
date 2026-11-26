# Calculadora da Reforma Tributária — Simples Nacional (motor da Receita Federal)

Motor oficial e aberto da Receita Federal (licença MIT) que calcula CBS e IBS das empresas do Simples Nacional.
Repositório original: https://github.com/ReceitaFederal/calculadora-rtc-simples-nacional

Na tela do roiLead ele aparece quando a pessoa escolhe **"Simples Nacional"** no topo da Calculadora Tributária.

## O que muda em relação ao regime regular

- Vale a partir de **01/01/2027**.
- A CBS e o IBS saem da **alíquota efetiva do anexo** da empresa (I a V). Ela depende do faturamento dos últimos 12 meses e do fator "r", e a pessoa informa os percentuais que estão no PGDAS-D.
- O MEI fica de fora do cálculo, por regra da Receita.
- As tabelas oficiais vêm do repositório do **regime regular** (`VERSAO_BANCO`), como manda o próprio projeto da Receita.

## Instalar no Easypanel (uma vez)

1. **Criar o serviço do Simples.** No projeto do roiLead, crie um **App** chamado `calculadora-rtc-simples`.
   - Source: GitHub, repositório `yunknet/roiLead`, branch de produção (`nova-versao`).
   - Build: **Dockerfile**, com **Build Path** `/services/calculadora-rtc-simples`.
   - Não precisa de domínio. A porta interna é `8082`.
   - Faça o Deploy.
2. **Ligar o site ao Simples.** No App do site, em **Environment**, adicione:
   `CALCULADORA_SN_URL=http://<projeto>_calculadora-rtc-simples:8082`
   Depois faça o Deploy do site.
   - Sem essa variável, só a parte do Simples mostra "indisponível". O resto continua funcionando.
3. **(Opcional) Deploy automático.** Copie a URL de **Deploy Webhook** do serviço.
   No GitHub, salve-a como secret `EASYPANEL_DEPLOY_CALCULADORA_SN`.

> **Easypanel reaproveita a montagem quando o commit não muda.** Se você corrigir o Caminho de Build depois de uma implantação, o próximo Deploy pode terminar em segundos e continuar rodando a versão antiga. Para forçar uma montagem nova, basta um commit novo na branch (ou usar "Rebuild"/limpar o cache do serviço, se disponível).

## Atualização automática

O mesmo workflow da calculadora (`.github/workflows/calculadora-rtc-atualizar.yml`) tem um passo para o Simples.

- Todo dia ele verifica se há versão nova do motor do Simples ou das tabelas oficiais.
- Se houver, monta, roda `testar.sh` (8 testes) e só troca de versão se tudo passar.
- Se algum teste falhar, não troca nada e abre uma *issue* no GitHub.

**Atualizar à mão:** troque o número em `VERSAO` (motor) ou em `VERSAO_BANCO` (tabelas). Depois faça commit e o Deploy no Easypanel.

## Testar

```sh
sh services/calculadora-rtc-simples/testar.sh http://localhost:8082
```

Em localhost, o Vite repassa `/api/calculadora-sn` para `http://localhost:8082`. Para usar outro endereço, defina `CALCULADORA_SN_URL`.
