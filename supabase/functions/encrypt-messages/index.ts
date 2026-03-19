import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

async function deriveKey(userId: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const dynamicSalt = userId.split('').reverse().join('') + userId;

    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(userId),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
    );

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: encoder.encode(dynamicSalt),
            iterations: 100000,
            hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

function bufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

async function encryptMessage(text: string, userId: string): Promise<string> {
    if (!text) return text;
    const key = await deriveKey(userId);
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encoder.encode(text)
    );
    return `${bufferToBase64(iv.buffer)}:${bufferToBase64(encrypted)}`;
}

serve(async (req: Request) => {
    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        // Busca TODAS as mensagens que NÃO estão criptografadas
        // Mensagens criptografadas possuem o formato "base64:base64" (contém exatamente um ":")
        // Mensagens legadas são texto puro
        const { data: messages, error } = await supabase
            .from('chat_messages')
            .select('id, message, user_id')
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Erro ao buscar mensagens:', error);
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }

        let encrypted = 0;
        let skipped = 0;

        for (const msg of (messages || [])) {
            if (!msg.message) {
                skipped++;
                continue;
            }

            // Verifica se já está criptografada (formato base64:base64)
            const parts = msg.message.split(':');
            if (parts.length === 2) {
                try {
                    atob(parts[0]);
                    atob(parts[1]);
                    skipped++;
                    continue; // Já está criptografada
                } catch {
                    // Não é base64, precisa criptografar
                }
            }

            // Criptografa a mensagem
            const encryptedText = await encryptMessage(msg.message, msg.user_id);

            const { error: updateError } = await supabase
                .from('chat_messages')
                .update({ message: encryptedText })
                .eq('id', msg.id);

            if (updateError) {
                console.error(`Erro ao atualizar mensagem ${msg.id}:`, updateError);
            } else {
                encrypted++;
            }
        }

        console.log(`✅ Migração concluída: ${encrypted} mensagens criptografadas, ${skipped} já estavam ok`);

        return new Response(JSON.stringify({
            success: true,
            encrypted,
            skipped,
            total: (messages || []).length
        }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200
        });

    } catch (err: any) {
        console.error('Erro na migração:', err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
});
