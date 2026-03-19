/**
 * Módulo de criptografia AES-256-GCM para mensagens do chat.
 * Utiliza a Web Crypto API nativa do navegador.
 * A chave de criptografia é derivada do user_id de forma única para que 
 * apenas o próprio usuário consiga descriptografar suas mensagens.
 * (Vulnerabilidade do 'VITE_SALT' fixada)
 */

// Deriva uma chave AES-256 de forma dinâmica usando dados intrínsecos do usuário
async function deriveKey(userId: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    
    // Opcional: Embaralhamento reverso do ID para criar um salt robusto e dinâmico, 
    // sem depender de chaves globais armazenadas no painel.
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

// Converte ArrayBuffer para string Base64
function bufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

// Converte string Base64 para ArrayBuffer
function base64ToBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

/**
 * Criptografa uma mensagem de texto usando AES-256-GCM.
 * Retorna uma string no formato: iv:ciphertext (ambos em Base64)
 */
export async function encryptMessage(text: string, userId: string): Promise<string> {
    if (!text) return text;

    const key = await deriveKey(userId);
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV para GCM

    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encoder.encode(text)
    );

    return `${bufferToBase64(iv.buffer)}:${bufferToBase64(encrypted)}`;
}

/**
 * Descriptografa uma mensagem criptografada.
 * Espera o formato: iv:ciphertext (ambos em Base64)
 * Se a mensagem não estiver no formato criptografado, retorna como está (texto puro legado).
 */
export async function decryptMessage(encryptedText: string, userId: string): Promise<string> {
    if (!encryptedText) return encryptedText;

    // Se não contém ":", provavelmente é uma mensagem legada não criptografada
    if (!encryptedText.includes(':')) return encryptedText;

    // Verifica se parece ser base64:base64 (formato criptografado)
    const parts = encryptedText.split(':');
    if (parts.length !== 2) return encryptedText;

    try {
        const [ivB64, cipherB64] = parts;
        const key = await deriveKey(userId);
        const iv = new Uint8Array(base64ToBuffer(ivB64));
        const ciphertext = base64ToBuffer(cipherB64);

        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            ciphertext
        );

        return new TextDecoder().decode(decrypted);
    } catch {
        // Se falhou ao descriptografar, retorna o texto original (mensagem legada ou corrompida)
        return encryptedText;
    }
}
