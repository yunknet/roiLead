#!/bin/sh
# Script to inject environment variables into a JS file at runtime configuration
cat <<EOF > /usr/share/nginx/html/env-config.js
window._env_ = {
  VITE_SUPABASE_URL: "${VITE_SUPABASE_URL}",
  VITE_SUPABASE_ANON_KEY: "${VITE_SUPABASE_ANON_KEY}"
};
EOF
