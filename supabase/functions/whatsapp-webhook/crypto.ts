/**
 * Módulo de criptografia AES-256-GCM para mensagens do chat (Deno/Edge Functions).
 * Utiliza a Web Crypto API nativa do Deno.
 */

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

export async function encryptMessage(text: string, userId: string): Promise<string> {
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
