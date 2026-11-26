#!/bin/sh
# Gera, na inicialização do container do site, os trechos do nginx que ligam o site aos
# serviços da Calculadora da Reforma Tributária:
#
#   CALCULADORA_RTC_URL = motor do regime regular   (ex.: http://roilead_calculadora-rtc:8080)
#   CALCULADORA_SN_URL  = motor do Simples Nacional (ex.: http://roilead_calculadora-rtc-simples:8082)
#   (só esquema, host e porta)
#
#   /api/calculadora/*     -> regime regular  (repassado igual)
#   /api/api-docs          -> documentação do regime regular
#   /api/calculadora-sn/*  -> Simples Nacional (vira /api/* no serviço)
#
# Segurança: se uma variável faltar ou o trecho gerado for inválido, aquela rota só responde 503.
# O resto do site nunca deixa de subir por causa disso.

PASTA=/etc/nginx/snippets
mkdir -p "$PASTA"

RESOLVER=$(awk '/^nameserver/ { print $2; exit }' /etc/resolv.conf 2>/dev/null)
[ -z "$RESOLVER" ] && RESOLVER=127.0.0.11
case "$RESOLVER" in *:*) RESOLVER="[$RESOLVER]" ;; esac

normalizar() {
  u="$1"
  case "$u" in http://*|https://*) ;; *) u="http://$u" ;; esac
  # Mantém só esquema://host:porta.
  printf '%s' "$u" | sed -E 's#^(https?://[^/]+).*#\1#'
}

indisponivel() { # arquivo, motivo, locations...
  arquivo="$1"; motivo="$2"; shift 2
  : > "$arquivo"
  for loc in "$@"; do
    cat >> "$arquivo" <<EOF
location $loc {
    default_type application/json;
    add_header Cache-Control "no-store" always;
    return 503 '{"status":503,"title":"Calculadora indisponível","detail":"$motivo"}';
}
EOF
  done
}

bloco() { # location, destino, regra de reescrita (opcional)
  cat <<EOF
location $1 {
    limit_req zone=calculadora burst=60 nodelay;
    limit_req_status 429;
    client_max_body_size 2m;
    # Resolve o nome a cada requisição: o site sobe mesmo se a calculadora estiver fora.
    resolver $RESOLVER valid=30s ipv6=off;
    set \$calculadora_destino $2;
    $3
    proxy_pass \$calculadora_destino;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    # Nomes internos do Easypanel têm "_" (ex.: sites_calculadora), que o Tomcat recusa (400). Usa um Host válido.
    proxy_set_header Host localhost;
    # O navegador manda Origin: https://roilead.com.br. O motor do Simples trata isso como outro site e
    # recusa (403 "Invalid CORS request"). Para o motor o pedido vem do próprio site, então não repassa.
    proxy_set_header Origin "";
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_ssl_server_name on;
    proxy_connect_timeout 5s;
    proxy_read_timeout 60s;
}
EOF
}

# Testa a configuração; se falhar, troca o trecho pelo de 503.
validar() { # arquivo, nome, locations...
  arquivo="$1"; nome="$2"; shift 2
  if saida=$(nginx -t 2>&1); then
    echo "50-calculadora: $nome ativo"
  else
    echo "50-calculadora: o nginx recusou a configuração de $nome; responderá 503. Erro do nginx:"
    printf '%s\n' "$saida" | sed 's/^/50-calculadora:   /'
    indisponivel "$arquivo" "Configuração recusada pelo nginx (veja o log do site, linhas 50-calculadora)." "$@"
  fi
}

# Começa com as duas rotas em 503 para que cada teste valide só a sua parte.
indisponivel "$PASTA/calculadora.conf" "Variável CALCULADORA_RTC_URL não definida no App do site." /api/calculadora/ "= /api/api-docs"
indisponivel "$PASTA/calculadora-sn.conf" "Variável CALCULADORA_SN_URL não definida no App do site." /api/calculadora-sn/

# ---- Regime regular ----
if [ -n "${CALCULADORA_RTC_URL:-}" ]; then
  URL=$(normalizar "$CALCULADORA_RTC_URL")
  { bloco /api/calculadora/ "$URL" ""; bloco "= /api/api-docs" "$URL" ""; } > "$PASTA/calculadora.conf"
  validar "$PASTA/calculadora.conf" "regime regular -> $URL" /api/calculadora/ "= /api/api-docs"
else
  echo "50-calculadora: CALCULADORA_RTC_URL não definida; /api/calculadora responderá 503"
fi

# ---- Simples Nacional ----
if [ -n "${CALCULADORA_SN_URL:-}" ]; then
  URL=$(normalizar "$CALCULADORA_SN_URL")
  bloco /api/calculadora-sn/ "$URL" 'rewrite ^/api/calculadora-sn/(.*)$ /api/$1 break;' > "$PASTA/calculadora-sn.conf"
  validar "$PASTA/calculadora-sn.conf" "Simples Nacional -> $URL" /api/calculadora-sn/
else
  echo "50-calculadora: CALCULADORA_SN_URL não definida; /api/calculadora-sn responderá 503"
fi
exit 0
