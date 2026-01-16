// frontend/shared/auth-fetch.js
// Implementação de SigV4 usando CryptoJS para compatibilidade com HTTP (Insecure Context)

window.authenticatedFetch = async (url, options = {}) => {
    const creds = window.API_CONFIG.credentials;
    
    // Se não houver credenciais, faz fetch normal
    if (!creds || !creds.accessKeyId) {
        console.warn("Sem credenciais AWS configuradas. Usando fetch normal.");
        return fetch(url, options);
    }

    // Se CryptoJS não carregou (fallback de segurança)
    if (typeof CryptoJS === 'undefined') {
        console.error("CryptoJS não encontrado! Verifique a conexão com a internet ou o CDN.");
        alert("Erro crítico: Biblioteca de segurança não carregada. Recarregue a página.");
        throw new Error("CryptoJS missing");
    }

    const method = options.method || 'GET';
    const region = window.API_CONFIG.region || 'us-west-2';
    const host = new URL(url).hostname;
    const path = new URL(url).pathname;
    const querystring = '';
    
    // Datas
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);

    // Helpers usando CryptoJS
    const sign = (key, msg) => CryptoJS.HmacSHA256(msg, key);
    const getSignatureKey = (key, date, regionName, serviceName) => {
        const kDate = sign("AWS4" + key, date);
        const kRegion = sign(kDate, regionName);
        const kService = sign(kRegion, serviceName);
        const kSigning = sign(kService, "aws4_request");
        return kSigning;
    };
    const sha256 = (msg) => CryptoJS.SHA256(msg).toString(CryptoJS.enc.Hex);

    // 1. Canonical Request
    const canonicalHeaders = `host:${host}\nx-amz-date:${amzDate}\nx-amz-security-token:${creds.sessionToken}\n`;
    const signedHeaders = 'host;x-amz-date;x-amz-security-token';
    const payloadHash = sha256(options.body || '');
    const canonicalRequest = `${method}\n${path}\n${querystring}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

    // 2. String to Sign
    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/${region}/lambda/aws4_request`;
    const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${sha256(canonicalRequest)}`;

    // 3. Signature
    const signingKey = getSignatureKey(creds.secretAccessKey, dateStamp, region, 'lambda');
    const signature = CryptoJS.HmacSHA256(stringToSign, signingKey).toString(CryptoJS.enc.Hex);

    // 4. Headers
    const authHeader = `${algorithm} Credential=${creds.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const newHeaders = new Headers(options.headers);
    newHeaders.set('x-amz-date', amzDate);
    newHeaders.set('x-amz-security-token', creds.sessionToken);
    newHeaders.set('Authorization', authHeader);

    return fetch(url, { ...options, headers: newHeaders });
};