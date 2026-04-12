# 🎯 JWT Security Attack 20-Hour Mastery Plan

This plan is optimized around the **80/20 Rule**: prioritizing the 20% of JWT attack techniques that yield 80% of the critical vulnerabilities in real-world scenarios. 

The core high-value targets you will master:
1. `alg=none` (Unverified Signatures)
2. Weak HMAC secrets (Offline Brute-Forcing)
3. Algorithm Confusion (RS256 → HS256)
4. Header Injection (`jwk`, `jku`, `kid`)

## ⏱️ Structure (10 Sessions × 2 Hours)
Every session is exactly 2 hours long:
- **105 minutes**: Deep dive, practical examples, and hands-on lab work.
- **15 minutes**: Spaced-repetition review & structured summary to lock in knowledge.

---

## 🛠️ Session 1: JWT Anatomy & The Attacker's Mindset
**Focus:** Understanding what a JWT actually is, and setting up your tooling.

### 📝 Detailed Notes & Examples
*   **Structure:** Header, Payload, Signature. Separated by dots (`.`). Base64URL encoded (not Base64; `+`, `/`, and `=` are replaced or omitted).
*   **The Flaw in Design:** The Header and Payload are mathematically signed, but *not encrypted* (unless using JWE). Anyone can decode and read them.
*   **Tooling Arsenal:**
    *   **jwt.io**: The standard visual decoder.
    *   **Burp Suite JWT Editor Extension**: Crucial for intercepting and signing tokens on the fly. Allows you to generate RSA keys and automate key injections.
*   **Base64URL Encoding bypasses:** Sometimes WAFs catch plain base64, but base64url slips through.

### 📚 Best Resources
*   [JWT.io Debugger](https://jwt.io/)
*   [PortSwigger: JWT Basics](https://portswigger.net/web-security/jwt)

### 🔄 15-Minute Review
*   *Action:* Take a raw token from a bug bounty target, decode it manually in the terminal using `base64 -d`, and identify the user claims.
*   *Question:* What is the difference between JWS and JWE? (JWS = Signed, JWE = Encrypted).

---

## 🚫 Session 2: The `alg=none` Attack (Signature Bypass)
**Focus:** The most devastating and simple flaw in JWT implementations.

### 📝 Detailed Notes & Examples
*   **The Vulnerability:** JWT allows tokens to specify `"alg": "none"` in the header. Vulnerable libraries will see this, think "oh, no signature is required," and blindly accept the modified payload.
*   **Example Attack Flow:**
    1. Got token: `eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyIjoidGVzdCJ9.Sig...`
    2. Change header to: `{"alg":"none"}`
    3. Change payload to: `{"user":"admin"}`
    4. Base64URL encode both, join with a dot, and *leave the signature empty*: `eyJhbGciOiJub25lIn0.eyJ1c2VyIjoiYWRtaW4ifQ.` (Note the trailing dot!).
*   **Obfuscation:** If `none` is blocked, try `None`, `NONE`, `nOnE`. Relying on string-parsing filters for security often fails.

### 📚 Best Resources
*   PortSwigger Lab: *JWT authentication bypass via unverified signature*

### 🔄 15-Minute Review
*   *Action:* Explain to yourself why the trailing dot is required in a "none" token. (Because the spec requires `<header>.<payload>.<signature>`, so an empty signature is just the trailing dot).

---

## 🔓 Session 3: Offline Brute-Forcing (Weak HS256 Secrets)
**Focus:** Cracking symmetric keys when developers use weak passwords as HMAC secrets.

### 📝 Detailed Notes & Examples
*   **The Vulnerability:** HS256 uses a single symmetric secret. If the backend developer uses something like `secret123` or `company2024`, an attacker can guess it offline without sending a single packet to the server.
*   **How it Works:** You take the Target JWT, guess a password, generate a signature. If your generated signature matches the Target's signature, you found the key!
*   **Example Hashcat Command:**
    ```bash
    hashcat -a 0 -m 16500 jwt.txt rockyou.txt
    ```
    *(16500 is the Hashcat mode for JWT HS256)*
*   **Exploitation:** Once the secret is found, generate a new token with `"user": "admin"`, sign it using the cracked secret, and send it to the server.

### 📚 Best Resources
*   [jwt_tool by ticarpi](https://github.com/ticarpi/jwt_tool)
*   PortSwigger Lab: *JWT authentication bypass via weak signing key*

### 🔄 15-Minute Review
*   *Action:* Run Hashcat or John the Ripper on a dummy token.
*   *Question:* Why can't you brute-force RS256 this way? (Because RS256 uses a private key for signing; brute-forcing a 2048-bit RSA private key is mathematically infeasible).

---

## 🎭 Session 4: Algorithm Confusion (RS256 → HS256)
**Focus:** Tricking the server into verifying an asymmetric token using a symmetric algorithm.

### 📝 Detailed Notes & Examples
*   **The Vulnerability:** The server expects `RS256` (Asymmetric) and explicitly uses its Public Key to *verify* the signature. The attacker changes the header to `HS256` (Symmetric). 
*   **The Trick:** The flawed backend code takes the `HS256` algorithm requirement from the token, takes its own Public Key (which it intended to use for RS256 verification), and passes them both to the verification function. The function now uses the Public Key as an *HMAC secret*.
*   **Example Attack Flow:**
    1. Steal the server's Public Key (from `/jwks.json`, or extracting it).
    2. Change header to `{"alg": "HS256"}`.
    3. Modify payload to admin.
    4. Sign the token yourself using the *Server's Public Key string* as the HMAC secret!
*   **Caution:** The exact string format of the public key (newlines, PEM format) must perfectly match what the server is passing to the HMAC function.

### 📚 Best Resources
*   PortSwigger Lab: *JWT authentication bypass via algorithm confusion*

### 🔄 15-Minute Review
*   *Action:* Draw a diagram connecting the attacker, the token header, the backend logic, and the public key during an algorithm confusion attack.

---

## 📂 Session 5: Key ID (`kid`) Manipulation (Path Traversal / SQLi)
**Focus:** Exploiting dynamic key lookups.

### 📝 Detailed Notes & Examples
*   **The Vulnerability:** The `kid` header parameter tells the server "use key ID X to verify this". If the server uses this input insecurely (e.g., retrieving keys from a file system or database), it gets interesting.
*   **Path Traversal Example:**
    *   Change header: `{"kid": "../../../../../../dev/null"}`
    *   The server reads `/dev/null` as the key, meaning the secret key is perfectly empty (a null byte).
    *   Sign your forged token using an empty string as the secret!
*   **SQL Injection Example:**
    *   Change header: `{"kid": "nonexistent' UNION SELECT 'my_secret_key'--"}`
    *   The database returns `my_secret_key` to the application.
    *   Sign your token with `my_secret_key`!

### 📚 Best Resources
*   PortSwigger Lab: *JWT authentication bypass via flawed signature verification*

### 🔄 15-Minute Review
*   *Action:* Review how standard web vulnerabilities (LFI/SQLi) manifest inside unexpected vectors like a JWT header.

---

## 🔑 Session 6: JSON Web Keys (`jwk`) Header Injection
**Focus:** Injecting self-signed public keys directly into the token.

### 📝 Detailed Notes & Examples
*   **The Vulnerability:** The JWT spec allows embedding the Public Key *inside the token itself* using the `jwk` parameter. If a server blindly trusts this key to verify the token, the trust model is entirely broken.
*   **Example Attack Flow:**
    1. Generate your own RSA Keypair using Burp Suite JWT Editor.
    2. Change header to include your public key:
       ```json
       {
         "alg": "RS256",
         "jwk": { "kty": "RSA", "n": "YOUR_MODULUS", "e": "AQAB" }
       }
       ```
    3. Change payload to admin.
    4. Sign the token using your generated *Private Key*.
    5. The server sees the `jwk`, extracts it, and uses it to verify the signature. It returns `VALID`.

### 📚 Best Resources
*   PortSwigger Lab: *JWT authentication bypass via jwk header injection*

### 🔄 15-Minute Review
*   *Action:* Explain the concept of "Trust Boundaries" and how `jwk` injection is the ultimate trust boundary failure.

---

## 🌐 Session 7: JWK Set URL (`jku`) Header Injection
**Focus:** Remote key injection via SSRF/Open Redirects.

### 📝 Detailed Notes & Examples
*   **The Vulnerability:** The `jku` parameter tells the server to fetch the public key from a given URL.
*   **Example Attack Flow:**
    1. Host your own JWKS JSON file on `https://attacker.com/keys.json` containing your rogue public key.
    2. Change header to `{"jku": "https://attacker.com/keys.json"}`.
    3. Sign token with your rogue private key.
    4. Server fetches your public key, verifies the token, and grants access.
*   **Advanced Bypasses:** If the server enforces the `jku` to be from an internal server (e.g., `https://trusted.com/keys`), you can try:
    *   Open Redirects: `https://trusted.com/redirect?url=https://attacker.com/keys.json`
    *   SSRF: Bypassing filters using `@` bypasses `https://trusted.com@attacker.com/...`

### 📚 Best Resources
*   PortSwigger Lab: *JWT authentication bypass via jku header injection*

### 🔄 15-Minute Review
*   *Action:* Write down 3 common URL parser bypass techniques (e.g., `@`, double encoding) used to trick `jku` whitelists.

---

## 🔬 Session 8: Advanced Automation (`jwt_tool`)
**Focus:** Efficiency. Stop doing everything manually.

### 📝 Detailed Notes & Examples
*   **Tool:** `jwt_tool.py` is the Swiss Army knife for JWTs.
*   **Features:**
    *   Fuzz for `alg=none` variants.
    *   Perform dictionary attacks instantly.
    *   Inject payloads for XSS, SQLi, and SSRF directly into the claims.
*   **Commands to Memorize:**
    *   Decode: `python3 jwt_tool.py <TOKEN>`
    *   Run all automated exploitations: `python3 jwt_tool.py <TOKEN> -M pb`
    *   Bruteforce: `python3 jwt_tool.py <TOKEN> -d /usr/share/wordlists/rockyou.txt`

### 📚 Best Resources
*   [JWT Tool GitHub Repo & Wiki](https://github.com/ticarpi/jwt_tool/wiki)

### 🔄 15-Minute Review
*   *Action:* Set up `jwt_tool` on your machine. Run the `pb` (Playbook) mode against a dummy token and review the output logs to see how it works under the hood.

---

## 📖 Session 9: Real-world Case Studies & Bug Bounty
**Focus:** Tying concepts to real-world payout reports.

### 📝 Detailed Notes & Examples
*   **Study Bug Bounty Disclosures:**
    *   How HackerOne reports bypassed algorithms.
    *   How big companies misconfigured `kid` and allowed path traversal.
    *   XSS inside the JWT payload (e.g. `{"name": "<script>alert(1)</script>"}`). If an admin dashboard decodes and displays the JWT payload without sanitization, it's Stored XSS!
*   **Key Insight:** Developers often put *too much* data in JWTs. Look for PII, internal IDs, or roles that shouldn't be exposed.

### 📚 Best Resources
*   [PentesterLand Bug Bounty Writeups (Search "JWT")](https://pentester.land/writeups/)
*   Medium articles detailing "$5000 JWT Authentication Bypass".

### 🔄 15-Minute Review
*   *Action:* Find one real-world HackerOne report regarding JWT. Identify which of the top 20% techniques was used.

---

## 🛡️ Session 10: Capstone & Defense Strategy
**Focus:** Simulating an end-to-end attack and learning how to fix the code.

### 📝 Detailed Notes & Examples
*   **The Capstone Task:** Chain techniques. Steal an API key, use a weak JWT to escalate to admin, access the hidden panel.
*   **How to Actually Secure JWTs (Defense):**
    1. **Strict Algorithm Whitelisting:** The server MUST hardcode the allowed algorithm. `if (token.alg !== 'RS256') throw Error;`
    2. **Do Not Trust User Headers:** Ignore `jwk`, `jku`, and `kid` originating from the client token if possible. Server must use its own verified keys.
    3. **Strong Secrets:** Use 256-bit+ randomly generated strings for HS256 secrets.
*   **Architecture flaw:** JWTs cannot be easily revoked. If a token is stolen, the attacker has access until it expires. Short `exp` (expiration) times are crucial.

### 📚 Best Resources
*   [OWASP JSON Web Token Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)

### 🔄 15-Minute Review
*   *Action:* Write a 3-point checklist of things you would immediately check if you found a JWT in a professional penetration test.
