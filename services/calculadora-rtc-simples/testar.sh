#!/bin/sh
# Testa um motor do Simples Nacional em execução, com as funções que a tela do roiLead usa.
# Uso: ./testar.sh http://localhost:8082
# Sai com código 0 se tudo passou. É usado pelo atualizador automático antes de trocar de versão.

BASE="${1:-http://localhost:8082}/api"
FALHAS=0
# Testando pelo site, informe ORIGEM=https://roilead.com.br para enviar o Origin como o navegador faz
# (pega bloqueios de CORS). Direto no motor, deixe vazio: o motor recusa Origin de outro endereço.
ORIGEM="${ORIGEM:-}"
pedir() { if [ -n "$ORIGEM" ]; then curl -H "Origin: $ORIGEM" "$@"; else curl "$@"; fi; }
DATA=2027-03-15
TMP=$(mktemp -d)

ok()   { echo "  OK    $1"; }
erro() { echo "  FALHA $1"; FALHAS=$((FALHAS + 1)); }

checar() {
  nome="$1"; esperado="$2"; contem="$3"; shift 3
  codigo=$(pedir -s -m 60 -o "$TMP/resp" -w '%{http_code}' "$@")
  if [ "$codigo" = "$esperado" ] && grep -q -- "$contem" "$TMP/resp"; then ok "$nome"; else erro "$nome (HTTP $codigo) $(head -c 200 "$TMP/resp")"; fi
}

calcular() { # nome, texto esperado, json
  printf '%s' "$3" > "$TMP/op.json"
  checar "$1" 200 "$2" -X POST -H 'Content-Type: application/json' --data-binary "@$TMP/op.json" "$BASE/calculadora/observabilidade/simples-nacional/nao-assistido"
}

echo "Testando $BASE"
checar "versão"               200 '"versaoApp"' "$BASE/versao"
checar "documentação"         200 'nao-assistido' "$BASE/api-docs"
checar "atividades"           200 '"anexoSemFatorR"' "$BASE/calculadora/simples-nacional/atividades?data=$DATA"
checar "atividade por código" 200 '"codigo":"09"' "$BASE/calculadora/simples-nacional/atividades/09?data=$DATA"
checar "descrição de erro"    200 'VSN-001' "$BASE/calculadora/observabilidade/simples-nacional/erros?codigo=VSN-001"

calcular "cálculo NF-e (anexo I)" '"totalTributos"' \
  '{"id":"t1","versao":"3.0.0","data":"2027-03-15","tpDoc":"55","CRT":"1","aliquotasEfetivas":{"anexoI":{"pCBSSN":"1.1612","pIBSSN":"0.0129"}},"itens":[{"numero":1,"cAtivSN":"01","cClassTrib":"000001","ncm":"22030000","baseCalculo":"1000.00","valorImpostoSeletivo":"0.00"}]}'
calcular "cálculo NFS-e (fator R)" '"anexoAplicado":"III"' \
  '{"id":"t2","versao":"3.0.0","data":"2027-03-15","tpDoc":"91","opSimpNac":"3","regApIBSCBSSN":"1","regApTribSN":"1","aliquotasEfetivas":{"fatorR":true,"anexoIII":{"pCBSSN":"2.3874","pIBSSN":"0.0263","semRedistribuicaoISS":{"pCBSSN":"2.3591","pIBSSN":"0.0260"}},"anexoV":{"pCBSSN":"3.1","pIBSSN":"0.03"}},"itens":[{"numero":1,"cAtivSN":"09","cClassTrib":"000001","nbs":"101011100","baseCalculo":"5000.00","tribISSQN":"1","tpRetISSQN":"1"}]}'
calcular "IBS/CBS por fora do Simples" 'SOMENTE_RECEITA' \
  '{"id":"t3","versao":"3.0.0","data":"2027-03-15","tpDoc":"55","CRT":"1","tpRegimeIBSCBS":"1","itens":[{"numero":1,"cClassTrib":"000001","ncm":"22030000","baseCalculo":"1000.00","valorImpostoSeletivo":"0.00"}]}'

rm -rf "$TMP"
if [ "$FALHAS" -eq 0 ]; then echo "TODOS OS TESTES PASSARAM"; exit 0; fi
echo "$FALHAS TESTE(S) FALHARAM"; exit 1
