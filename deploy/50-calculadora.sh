#!/bin/sh
# Gera, na inicialização do container do site, o trecho do nginx que liga
# /api/calculadora/* ao serviço da Calculadora da Reforma Tributária.
#
#   CALCULADORA_RTC_URL = endereço interno do serviço no Easypanel, só host e porta.
#                         Ex.: http://roilead_calculadora-rtc:8080
#
# Segurança: se a variável faltar ou o trecho gerado for inválido, grava um trecho
# que só responde 503 nessa rota. O resto do site nunca deixa de subir por causa disso.

DESTINO=/etc/nginx/snippets/calculadora.conf
mkdir -p /etc/nginx/snippets

indisponivel() {
  cat > "$DESTINO" <<'EOF'
location /api/calculadora/ {
    default_type application/json;
    return 503 '{"status":503,"title":"Calculadora indisponível","detail":"O serviço da calculadora não está configurado."}';
}
location = /api/api-docs {
    default_type application/json;
    return 503 '{"status":503,"title":"Calculadora indisponível"}';
}
EOF
}

URL="${CALCULADORA_RTC_URL:-}"
if [ -z "$URL" ]; then
  echo "50-calculadora: CALCULADORA_RTC_URL não definida; /api/calculadora responderá 503"
  indisponivel
  exit 0
fi

case "$URL" in http://*|https://*) ;; *) URL="http://$URL" ;; esac
# Mantém só esquema://host:porta (o caminho /api/... é repassado igual ao recebido).
URL=$(printf '%s' "$URL" | sed -E 's#^(https?://[^/]+).*#\1#')

RESOLVER=$(awk '/^nameserver/ { print $2; exit }' /etc/resolv.conf 2>/dev/null)
[ -z "$RESOLVER" ] && RESOLVER=127.0.0.11
case "$RESOLVER" in *:*) RESOLVER="[$RESOLVER]" ;; esac

bloco() {
  cat <<EOF
location $1 {
    limit_req zone=calculadora burst=60 nodelay;
    limit_req_status 429;
    client_max_body_size 2m;
    # Resolve o nome a cada requisição: o site sobe mesmo se a calculadora estiver fora.
    resolver $RESOLVER valid=30s ipv6=off;
    set \$calculadora_destino $URL;
    proxy_pass \$calculadora_destino;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_ssl_server_name on;
    proxy_connect_timeout 5s;
    proxy_read_timeout 60s;
    proxy_intercept_errors off;
}
EOF
}

{ bloco /api/calculadora/; bloco "= /api/api-docs"; } > "$DESTINO"

if nginx -t -q 2>/dev/null; then
  echo "50-calculadora: /api/calculadora -> $URL"
else
  echo "50-calculadora: configuração gerada inválida; /api/calculadora responderá 503"
  indisponivel
fi
exit 0
