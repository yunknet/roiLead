# Calculadora da Reforma Tributária (motor da Receita Federal)

Motor oficial e aberto da Receita Federal (licença MIT) que calcula CBS, IBS e Imposto Seletivo.
Repositório original: https://github.com/ReceitaFederal/calculadora-rtc-regime-regular

A tela fica no roiLead em **Dashboard → Calculadora Tributária** (`/dashboard/calculadora-tributaria`).
Ela é gratuita: exige login, mas não exige assinatura.

## Como funciona

```
navegador ──> roilead.com.br/api/calculadora/*  (nginx do site, com limite de 120 chamadas/min por IP)
                     └──> serviço "calculadora-rtc" na VPS (este Dockerfile, porta 8080)
```

- Não chama nenhum serviço do governo: as tabelas oficiais (NCM, NBS, CST, cClassTrib, alíquotas) vêm dentro do motor.
- Não tem custo por uso nem limite da Receita. O limite é a própria VPS. O serviço usa até cerca de 450 MB de RAM.

## Instalar no Easypanel (uma vez)

1. **Criar o serviço da calculadora.** No projeto do roiLead, crie um **App** chamado `calculadora-rtc`.
   - Source: GitHub, repositório `yunknet/roiLead`, branch de produção (`nova-versao`).
   - Build: **Dockerfile**, com **Build Path** `/services/calculadora-rtc`.
   - Não precisa de domínio: ele é usado só por dentro da VPS. A porta interna é `8080`.
   - Faça o Deploy. A primeira montagem leva alguns minutos.
2. **Ligar o site à calculadora.** No App do site (frontend), em **Environment**, adicione:
   `CALCULADORA_RTC_URL=http://<projeto>_calculadora-rtc:8080`
   O nome interno aparece no Easypanel, na aba do serviço. O formato é `projeto_servico`.
   Depois faça o Deploy do site.
   - Se a variável estiver ausente ou errada, o site continua funcionando e só a calculadora mostra "indisponível".
3. **(Opcional) Deploy automático.** No serviço `calculadora-rtc`, copie a URL de **Deploy Webhook**.
   No GitHub, salve essa URL como secret `EASYPANEL_DEPLOY_CALCULADORA`, em
   *Settings → Secrets and variables → Actions*.

## Atualização automática

O workflow `.github/workflows/calculadora-rtc-atualizar.yml` roda todo dia às 06:17:

1. Verifica se a Receita publicou uma versão nova (tag) do motor.
2. Se publicou, monta o motor novo e roda `testar.sh`. São 16 testes com as funções que a tela usa.
3. Se **todos passarem**, grava a versão em `VERSAO` na branch de produção e aciona o deploy pelo webhook.
4. Se **algum falhar**, não troca nada (a calculadora segue na versão atual) e abre uma *issue* no GitHub
   avisando que a atualização precisa ser feita à mão.

> O GitHub só executa tarefas agendadas a partir da branch padrão do repositório (`main`). O arquivo do workflow precisa estar nela.
> Para rodar na hora: GitHub → Actions → "Calculadora RTC - atualização automática" → *Run workflow*.

**Atualizar à mão:** troque o número em `VERSAO` (ex.: `1.8.0`), faça commit e depois o Deploy do serviço no Easypanel.

## Testar

```sh
sh services/calculadora-rtc/testar.sh http://localhost:8080
```

Para rodar em localhost junto com o site (`npm run dev`), deixe o motor na porta 8081:
`java -Dspring.profiles.active=offline -Dserver.port=8081 -jar api-regime-geral.jar`.
O Vite já repassa `/api/calculadora` para lá. Para usar outro endereço, defina `CALCULADORA_RTC_URL`.
