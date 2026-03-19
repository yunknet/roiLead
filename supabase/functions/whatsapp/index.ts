import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const supabaseClient = createClient(// Supabase API URL - env var exported by default.
      Deno.env.get('SUPABASE_URL') ?? '', // Supabase API Anon Key - env var exported by default.
      Deno.env.get('SUPABASE_ANON_KEY') ?? '', // Create client with Auth context of the user that called the function.
      {
        global: {
          headers: {
            Authorization: req.headers.get('Authorization')
          }
        }
      });
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({
        error: 'Unauthorized'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 401
      });
    }
    const reqBody = await req.json();
    const { action, instanceName = user.id, useN8n } = reqBody;
    const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL');
    // Usamos a chave global para criar/gerenciar instâncias
    const EVOLUTION_GLOBAL_KEY = Deno.env.get('EVOLUTION_GLOBAL_KEY');
    if (!EVOLUTION_API_URL || !EVOLUTION_GLOBAL_KEY) {
      throw new Error('Evolution API URL or Global Key not configured');
    }
    const headers = {
      'Content-Type': 'application/json',
      'apikey': EVOLUTION_GLOBAL_KEY
    };
    let result;
    // Sanitiza o ID: se já começar com user_, usa como está, senão adiciona o prefixo.
    // Também permite underscores na sanitização.
    const cleanName = instanceName.replace(/[^a-zA-Z0-9-_]/g, '');
    const instanceId = cleanName.startsWith('user_') ? cleanName : `user_${cleanName}`;
    let SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
    // Remove trailing slash if present
    if (SUPABASE_URL.endsWith('/')) {
      SUPABASE_URL = SUPABASE_URL.slice(0, -1);
    }
    const webhookSecret = Deno.env.get('EVOLUTION_WEBHOOK_SECRET');
    const secretSuffix = webhookSecret ? `?token=${webhookSecret}` : '';
    const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/whatsapp-webhook${secretSuffix}`;
    console.log(`Webhook URL: ${WEBHOOK_URL}`);
    switch (action) {
      case 'create_instance':
        console.log(`Creating instance: ${instanceId}`);
        try {
          // 1. Create Instance (minimal payload)
          const createRes = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              instanceName: instanceId,
              qrcode: true,
              integration: "WHATSAPP-BAILEYS"
            })
          });
          const createData = await createRes.json();
          console.log('Create Response:', JSON.stringify(createData));
          // 2. Always Set Webhook (regardless of create result, unless fatal)
          try {
            const finalWebhookUrl = WEBHOOK_URL;
            const finalEvents = ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "SEND_MESSAGE"];

            const webhookPayload: any = {
              webhook: {
                enabled: true,
                url: finalWebhookUrl,
                webhook_by_events: false,
                webhook_base64: true,
                events: finalEvents
              }
            };

            // Para a Evolution API V2, a opção de rejeitar ligacao e ignorar grupos
            // fica nas definições gerais da instância e não mais amarrado estritamente ao webhook Payload em algumas versões.
            const webhookRes = await fetch(`${EVOLUTION_API_URL}/webhook/set/${instanceId}`, {
              method: 'POST',
              headers: {
                ...headers,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(webhookPayload)
            });
            const webhookData = await webhookRes.json();
            console.log("Webhook Update Result:", JSON.stringify(webhookData));

            // Evolution v1 to v2: às vezes rejectCall/ignoreGroups precisam de endpoint de settings à parte.
            // Para garantir que funciona, caso a API exija chamada em /settings/set:
            if (useN8n) {
              try {
                await fetch(`${EVOLUTION_API_URL}/settings/set/${instanceId}`, {
                  method: 'POST',
                  headers: {
                    ...headers,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    rejectCall: true,
                    groupsIgnore: true, // Evolution API usa groupsIgnore e não ignoreGroups no endpoint /settings/set
                    readMessages: true,
                    readStatus: false
                  })
                });
              } catch (settingsErr) {
                console.log("Error updating exclusive N8N settings", settingsErr);
              }
            }

          } catch (webhookErr) {
            console.error("Error updating webhook:", webhookErr);
          }

          // 3. Handle Create Result
          if (createData?.qrcode || createData?.base64) {
            result = createData;
          } else if (createRes.status === 403 || createData?.error && createData?.error?.toLowerCase().includes('already exists')) {
            console.log(`Instance ${instanceId} already exists. Fetching connection...`);
            // Try to Connect (Get QR)
            const connectRes = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceId}`, {
              headers
            });
            const connectData = await connectRes.json();
            if (connectData?.base64 || connectData?.qrcode) {
              result = connectData;
            } else {
              // If Connect didn't return QR, maybe it's already connected. Check status.
              const statusRes = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${instanceId}`, {
                headers
              });
              const statusData = await statusRes.json();
              // Return combined info so frontend can decide
              result = {
                ...connectData,
                ...statusData,
                message: "Instance exists"
              };
            }
          } else {
            // Unknown error or success without QR
            result = createData;
          }

          // 4. Update the database with the instance name
          const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
          );

          const { error: dbError } = await supabaseAdmin
            .from('ai_agents')
            .upsert({ 
              user_id: user.id, 
              instance_name: instanceId,
              updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });

          if (dbError) {
            console.error("Error updating ai_agents instance_name:", dbError);
          } else {
            console.log(`Successfully updated database with instance_name: ${instanceId}`);
          }

        } catch (e) {
          throw new Error(`Failed to create instance: ${e.message}`);
        }
        break;
      case 'get_status':
        const statusRes = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${instanceId}`, {
          headers
        });
        result = await statusRes.json();
        break;
      case 'delete_instance':
        const delRes = await fetch(`${EVOLUTION_API_URL}/instance/delete/${instanceId}`, {
          method: 'DELETE',
          headers
        });
        result = await delRes.json();

        // 5. Limpa o banco de dados após deletar a instância
        const supabaseAdminClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        await supabaseAdminClient
          .from('ai_agents')
          .update({ instance_name: null })
          .eq('user_id', user.id);
        break;
      case 'send_message':
        const { number, text } = reqBody;
        if (!number || !text) throw new Error('Number and text are required');
        console.log(`Sending message to ${number} via ${instanceId}`);
        const sendRes = await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceId}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            number,
            text,
            delay: 1200,
            linkPreview: true
          })
        });
        result = await sendRes.json();
        break;
      case 'check_webhook':
        try {
          const findRes = await fetch(`${EVOLUTION_API_URL}/webhook/find/${instanceId}`, {
            headers
          });
          result = await findRes.json();
        } catch (e) {
          result = {
            error: e.message
          };
        }
        break;
      case 'set_webhook':
        try {
          const finalWebhookUrl = WEBHOOK_URL;
          const finalEvents = ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "SEND_MESSAGE"];

          // Configurações padrão de webhook na Evolution API V2
          const webhookPayload: any = {
            webhook: {
              enabled: true,
              url: finalWebhookUrl,
              webhook_by_events: false,
              webhook_base64: true,
              events: finalEvents
            }
          };

          const webhookRes = await fetch(`${EVOLUTION_API_URL}/webhook/set/${instanceId}`, {
            method: 'POST',
            headers: {
              ...headers,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(webhookPayload)
          });
          result = await webhookRes.json();

          // Manda as definições sempre (seja ativando ou desativando) para garantir Evolution API
          try {
            await fetch(`${EVOLUTION_API_URL}/settings/set/${instanceId}`, {
              method: 'POST',
              headers: {
                ...headers,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                rejectCall: useN8n ? true : false,
                groupsIgnore: useN8n ? true : false,
                readMessages: useN8n ? true : false,
                readStatus: false
              })
            });
          } catch (settingsErr) {
            console.log("Error updating exclusive N8N settings on set_webhook", settingsErr);
          }

        } catch (e) {
          result = {
            error: e.message
          };
        }
        break;
      default:
        throw new Error('Invalid action');
    }
    return new Response(JSON.stringify(result), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error("Function Error:", error);
    // Return 200 with error so frontend can display the message instead of generic "Bad Request"
    return new Response(JSON.stringify({
      error: error.message || "Unknown error occurred"
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  }
});
