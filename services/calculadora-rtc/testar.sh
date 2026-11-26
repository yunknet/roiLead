#!/bin/sh
# Testa um motor da calculadora em execução, usando as mesmas funções que a tela do roiLead usa.
# Uso: ./testar.sh http://localhost:8080
# Sai com código 0 se tudo passou. É usado pelo atualizador automático antes de trocar de versão.

BASE="${1:-http://localhost:8080}/api"
FALHAS=0
HOJE=$(date +%Y-%m-%d)

ok()   { echo "  OK    $1"; }
erro() { echo "  FALHA $1"; FALHAS=$((FALHAS + 1)); }

# status esperado + texto que precisa aparecer na resposta
checar() {
  nome="$1"; esperado="$2"; contem="$3"; shift 3
  resp=$(curl -s -m 60 -w '\n%{http_code}' "$@")
  codigo=$(printf '%s' "$resp" | tail -n1)
  corpo=$(printf '%s' "$resp" | sed '$d')
  if [ "$codigo" = "$esperado" ] && printf '%s' "$corpo" | grep -q -- "$contem"; then ok "$nome"; else erro "$nome (HTTP $codigo) $(printf '%s' "$corpo" | head -c 200)"; fi
}

echo "Testando $BASE"
checar "versão"                 200 '"versaoApp"'          "$BASE/calculadora/dados-abertos/versao"
checar "documentação (OpenAPI)" 200 '/calculadora/regime-geral' "$BASE/api-docs"
checar "UFs"                    200 '"sigla":"MG"'         "$BASE/calculadora/dados-abertos/ufs"
checar "municípios"             200 '3106200'              "$BASE/calculadora/dados-abertos/ufs/municipios?siglaUf=MG"
checar "CST CBS/IBS"            200 'classificacoesTributarias' "$BASE/calculadora/dados-abertos/situacoes-tributarias/cbs-ibs?data=$HOJE"
checar "CST IS"                 200 'classificacoesTributarias' "$BASE/calculadora/dados-abertos/situacoes-tributarias/is?data=2027-03-10"
checar "NCMs vigentes"          200 '"ncm"'                "$BASE/calculadora/dados-abertos/ncm/vigentes?data=$HOJE"
checar "lista NBS"              200 '"codigo"'             "$BASE/calculadora/dados-abertos/nbs/lista?data=$HOJE"
checar "detalhe NCM"            200 'tributadoPeloImpostoSeletivo' "$BASE/calculadora/dados-abertos/ncm?ncm=22030000&data=$HOJE"
checar "NCM aplicável"          200 '"valido"'             "$BASE/calculadora/dados-abertos/classificacoes-tributarias/ncm-aplicavel?cClassTrib=000001&ncm=22030000&dataOcorrenciaFatoGerador=$HOJE"
checar "tipos de XML"           200 '"mnemonico"'          "$BASE/calculadora/xml/generate"
checar "descrição de erro"      200 'REG-011'              "$BASE/calculadora/observabilidade/erros?codigo=REG-011"

OPERACAO='{"id":"teste-roilead","versao":"1.0.0","dhFatoGerador":"2027-03-10T10:00:00-03:00","municipio":4314902,"uf":"RS","itens":[{"numero":1,"ncm":"22030000","cst":"000","cClassTrib":"000001","quantidade":12,"unidade":"LT","impostoSeletivo":{"cst":"000","cClassTrib":"000001","baseCalculo":150.00,"quantidade":12,"unidade":"LT","impostoInformado":15.00},"aliquotasNominais":{"cbs":8.8,"ibsEstadual":0.05,"ibsMunicipal":0.05,"impostoSeletivo":{"adValorem":10.0}}},{"numero":2,"nbs":"122011200","cst":"200","cClassTrib":"200028","baseCalculo":1200.00,"aliquotasNominais":{"cbs":8.8,"ibsEstadual":0.05,"ibsMunicipal":0.05}}]}'
checar "cálculo regime geral"   200 '"IBSCBSTot"' -X POST -H 'Content-Type: application/json' -d "$OPERACAO" "$BASE/calculadora/regime-geral"
checar "cálculo observabilidade" 200 '"estadoItem"' -X POST -H 'Content-Type: application/json' -d "$OPERACAO" "$BASE/calculadora/observabilidade/regime-geral"

TMP=$(mktemp -d)
curl -s -m 60 -X POST -H 'Content-Type: application/json' -d "$OPERACAO" "$BASE/calculadora/regime-geral" -o "$TMP/roc.json"
curl -s -m 60 -X POST -H 'Content-Type: application/json' --data-binary "@$TMP/roc.json" "$BASE/calculadora/xml/generate?tipo=nfe" -o "$TMP/grupo.xml"
if grep -q '<IBSCBS>' "$TMP/grupo.xml"; then ok "gerar XML NF-e"; else erro "gerar XML NF-e $(head -c 200 "$TMP/grupo.xml")"; fi
checar "validar XML NF-e"       200 'true' -X POST -H 'Content-Type: application/xml' --data-binary "@$TMP/grupo.xml" "$BASE/calculadora/xml/validate?tipo=nfe&subtipo=grupo"
rm -rf "$TMP"

if [ "$FALHAS" -eq 0 ]; then echo "TODOS OS TESTES PASSARAM"; exit 0; fi
echo "$FALHAS TESTE(S) FALHARAM"; exit 1
