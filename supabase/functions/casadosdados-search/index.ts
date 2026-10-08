import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json();

    // The API key is defined here securely (or could be in Deno.env)
    const CASADOSDADOS_API_KEY = "36acdbe280cef04775b0b40d5e33902d0f2d98f5df2ec7da8547acd2820be5660a5cf157219f580ef9422a661a2100390e5ca63c4a634a8a81b8c4567b080b65";

    const response = await fetch("https://api.casadosdados.com.br/v5/cnpj/pesquisa?tipo_resultado=completo", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": CASADOSDADOS_API_KEY
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
