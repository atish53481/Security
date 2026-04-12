What are JWTs?
JSON web tokens (JWTs) is standardized way for sending cryptographically signed JSON data between systems. end information ("claims") of users as part of authentication, session handling, and access control mechanisms. 

A JWT consists of 3 parts: a header, a payload, and a signature. These are each separated by a dot, as shown in the following example: 

eyJraWQiOiI5MTM2ZGRiMy1jYjBhLTRhMTktYTA3ZS1lYWRmNWE0NGM4YjUiLCJhbGciOiJSUzI1NiJ9.eyJpc3MiOiJwb3J0c3dpZ2dlciIsImV4cCI6MTY0ODAzNzE2NCwibmFtZSI6IkNhcmxvcyBNb250b3lhIiwic3ViIjoiY2FybG9zIiwicm9sZSI6ImJsb2dfYXV0aG9yIiwiZW1haWwiOiJjYXJsb3NAY2FybG9zLW1vbnRveWEubmV0IiwiaWF0IjoxNTE2MjM5MDIyfQ.SYZBPIBg2CRjXAJ8vCER0LA_ENjII1JakvNQoP-Hw6GG1zfl4JyngsZReIfqRvIAEi5L4HV0q7_9qGhQZvy9ZdxEJbwTxRs_6Lb-fZTDpW6lKYNdMyjw45_alSCZ1fypsMWz_2mTpQzil0lOtps5Ei_z7mM7M8gCwe_AGpI53JxduQOaB5HkT5gVrv9cKu9CsW5MS6ZbqYXpGyOG5ehoxqm8DL5tFYaW3lB50ELxi0KsuTKEbD0t5BCl0aCR2MBJWAbN-xeLwEenaqBiwPVvKixYleeDQiBEIylFdNNIMviKRgXiYuAvMziVPbwSgkZVHeEdF5MQP1Oe2Spac-6IfA

The header and payload parts of a JWT are just base64url-encoded JSON objects. The header contains metadata about the token itself, while the payload contains the actual "claims" about the user. For example, you can decode the payload from the token above to reveal the following claims: 
{ "iss": "portswigger", "exp": 1648037164, "name": "Carlos Montoya", "sub": "carlos", "role": "blog_author", "email": "carlos@carlos-montoya.net", "iat": 1516239022 }

In most cases, this data can be easily read or modified by anyone with access to the token. Therefore, the security of any JWT-based mechanism is heavily reliant on the cryptographic signature. 

JWT signature
Server send the JWT with help of Secret key (Signature) by hashing the Header & Payload. None of Data can't be tampered because as the signature derived from token  by changing the single byte of header or payload as result in mismatch in signature & Without knowing the server's secret signing key, it shouldn't be possible to generate the correct signature for a given header or payload. 

        JWT
    |                            |
    JWS                         JWE
🔐 JWS (JSON Web Signature) Purpose: Ensure integrity + authenticity (data is not tampered and sender is verified) 
👉 With JWS: • Data is signed, NOT encrypted • Anyone can read the payload • But they can’t modify it without breaking the signature 
📌 How it works: • Header + Payload + Signature • Signature created using: ○ Secret key (HMAC) ○ Public/Private key (RSA, ECDSA) 
📌 Example use: • Authentication tokens (login sessions) • API authorization (Bearer tokens) ✅ Key benefit: ✔ Detects tampering ✔ Verifies sender ❌ Payload is visible (not confidential)

🔒 JWE (JSON Web Encryption) Purpose: Ensure confidentiality (data is hidden/encrypted) 
👉 With JWE: • Data is encrypted • Only the intended receiver can decrypt and read it 
📌 How it works: • Header + Encrypted Key + IV + Ciphertext + Auth Tag 
📌 Example use: • Sensitive data transmission (PII, banking data) • Secure API communication ✅ Key benefit: ✔ Keeps data secret ✔ Prevents unauthorized access

 JWS vs JWE (Simple Comparison) 
 Feature JWS 📝 JWE 
 🔐 Purpose Signature Encryption Data readable? Yes No Security focus Integrity + Authenticity Confidentiality Use case Auth tokens Sensitive data Performance Faster Slightly slower

🧠 Easy way to remember: 
• JWS = Signed → “Trust it” 
• JWE = Encrypted → “Hide it”

🚀 Real-world scenario (important for interviews) 
• Login token → JWS 
• Sending Aadhaar / payment data → JWE 
• High security systems → JWE + JWS together

# Attack1 : JWT Authentication bypass via unverified signature
(can use for RS256 and HS256)

#Chance 1#
If Server don't store JWT then there is less possible who is actual user? 
If don't verify the signature then nothing can stop attack

#Chance 2#
Server Side Sometime Developer confuse to use verify() and decode() method in JWT then use decode() for safer side


# JWT authentication bypass via flawed signature verification 
(can use for RS256 and HS256)
Server  not verify the signature properly

In JWT header contains alg parameter, alg tell server which alg was used to sign the token & alg it need to use when verifying the signature
{ "alg": "HS256", "typ": "JWT" }
JWTs can be signed using a range of different algorithms, but can also be left unsigned. **In this case, the alg parameter is set to none, which indicates a so-called "unsecured JWT"**. This make ,servers usually reject tokens with no signature. However, as this kind of filtering relies on string parsing, you can sometimes bypass these filters using classic obfuscation techniques (use none alog), such as mixed capitalization and unexpected encodings. 


# JWT authentication bypass via weak signing key (Brute-forcing secret keys)
Can use for HS256 as it have one secret key

IF JWT use algorithms, such as HS256 (HMAC + SHA-256)  then we get secret key it will like the password this secrert can guess by Brute Force.
**This attack only perfrom when algo is HS256 not on RS256**
beacause RS256 use Public Key to sign the token and Private Key to verify the token
Short answer: **Yes—but in different ways.**
Weak signing keys mainly affect **HS256**


## JWT header parameter injections

🧠 First: Difference between HS256 and RS256
🔑 HS256 (Symmetric)
One secret key
sign + verify = SAME secret
🔐 RS256 (Asymmetric)
Two keys
Private key → sign  
Public key → verify
🎯 Now: Which header parameter is used where?
🔑 HS256 (what is actually used)
👉 Mostly uses: kid

Why?
Because server may have multiple secrets:
key1 → secret123  
key2 → secret456  
So JWT:
{ "alg": "HS256", "kid": "key1" }
👉 Server uses kid to select secret

💥 Vulnerability in HS256
If server trusts kid:
👉 Attacker changes:
{ "alg": "HS256", "kid": "mysecret" }
👉 Then signs token using:
secret = "mysecret"
👉 If server uses that → ✅ bypass

❗ Important
👉 jku and jwk are NOT commonly used in HS256
🔐 RS256 (what is actually used)

👉 Uses:
(JSON Web key Set URL) jku ✅
(JSON Web key) jwk ✅
(Key ID) kid ✅ -Server used key for verification


💥 Vulnerabilities in RS256
1. 🌐 jku (most common)
{ "alg": "RS256", "jku": "https://attacker.com/key.json" }
👉 Server downloads key → attacker controls it → 💥

2. 📦 jwk
{ "alg": "RS256", "jwk": { attacker public key } }
👉 Server uses embedded key → 💥

3. 🔑 kid
{ "alg": "RS256", "kid": "key1" }
👉 Used to select correct public key

🧠 Final Simple Table
| Feature         | HS256                    | RS256                          |
|-----------------|--------------------------|---------------------------------|
| Key type        | Same secret              | Public/Private                  |
| Main parameter  | kid                      | jku, jwk, kid                   |
| Attack type     | Secret confusion via kid | Key injection via URL/key       |
| Risk level      | Medium                   | High                            |

### ❌ Vulnerable Flow with `jwk`

Attacker:

1. Generates **their own RSA key pair**
2. Puts **their public key inside `jwk`**
3. Signs token using **their private key**

```json
{
  "alg": "RS256",
  "jwk": {
    "kty": "RSA",
    "n": "attacker-modulus",
    "e": "AQAB"
  }
}
```

👉 If server trusts `jwk`:

* It uses attacker’s public key
* Signature becomes **VALID**

💥 Result:

> Attacker creates **self-signed JWT** → **Authentication bypass**


# 📦 Your Given Header (Explained)

```json
{
  "kid": "ed2Nf8sb-sD6ng0-scs5390g-fFD8sfxG",
  "typ": "JWT",
  "alg": "RS256",
  "jwk": {
    "kty": "RSA",
    "e": "AQAB",
    "kid": "ed2Nf8sb-sD6ng0-scs5390g-fFD8sfxG",
    "n": "yy1wpYmffgXBxhAUJzHHocCuJolwDqql75ZWuCQ_cb33K2vh9m"
  }
}
```

### Field meaning:

| Field | Meaning                                    |
| ----- | ------------------------------------------ |
| `alg` | Signing algorithm → RS256 (asymmetric RSA) |
| `kid` | Key identifier                             |
| `jwk` | Public key embedded in token               |
| `kty` | Key type → RSA                             |
| `e`   | Public exponent (usually `AQAB` = 65537)   |
| `n`   | Modulus → main part of RSA public key      |

---

# 🔁 2. Normal (Secure) JWT Flow

### Without `jwk`:

1. Server issues JWT
2. Signs with **private key**
3. Client sends token back
4. Server verifies using **trusted public key (stored internally)**

👉 Key point:

> Server controls the key → safe

---

# ⚠️ 3. What changes with `jwk`?

With `jwk`, the token says:

> “Use THIS key (inside me) to verify me”

👉 Now the **key comes from the token itself**

---

# 💣 4. The Vulnerability (Core Issue)

If server logic is like:

```text
if jwk exists in header:
    use jwk to verify signature
```

👉 Then:

* The attacker controls the key
* The attacker controls the signature
* The server trusts both

❌ This breaks the entire trust model

---

# 🔥 5. Attack: Injecting Self-Signed JWT

## Step 1: Attacker generates their own RSA key pair

* Private key → used to sign
* Public key → placed in `jwk`

---

## Step 2: Create malicious payload

Example:

```json
{
  "user": "admin"
}
```

---

## Step 3: Create JWT header with attacker key

```json
{
  "alg": "RS256",
  "jwk": {
    "kty": "RSA",
    "e": "AQAB",
    "n": "ATTACKER_PUBLIC_KEY"
  }
}
```

---

## Step 4: Sign JWT

* Use attacker **private key**
* Signature becomes valid for attacker key

---

## Step 5: Send to vulnerable server

---

## Step 6: Server verifies

Server does:

1. Extract `jwk` from token
2. Uses it as public key
3. Verifies signature → ✅ valid

👉 Server thinks:

> “Signature is correct → token is trusted”

❌ But attacker created everything

---

# 🧠 6. Why this works (Important Concept)

This is a **trust boundary failure**.

👉 JWT security assumes:

* Signing key is trusted
* Verification key is trusted

But here:

* Attacker supplies both

---

# 🔍 7. Visual Flow

### Secure:

```text
Server → signs → Client → verifies using trusted key
```

### Vulnerable:

```text
Attacker → creates token + key → Server trusts attacker key → access granted
```

---

# ⚠️ 8. Real-world impact

If exploited, attacker can:

* Become **admin**
* Bypass authentication
* Access protected APIs
* Impersonate any user

---

# 🛡️ 9. How to prevent this

### ✅ Correct approach:

* Ignore `jwk` in header
* Use only:

  * Hardcoded public key
  * Trusted JWKS endpoint (controlled)

---

### ❌ Never do:

```text
use token.header.jwk directly
```

---
# 🔗 10. Related attacks (connect this topic)

* `jku` injection → fetch key from attacker URL
* `kid` manipulation → trick key lookup
* `alg` confusion → change algorithm

---

# 🎯 11. Interview-ready explanation

> “In jwk injection, an attacker embeds their own public key inside the JWT header and signs the token with the corresponding private key. If the server trusts the jwk from the token, it verifies the signature using the attacker’s key, allowing full token forgery.”

---

now let say for JWT we dont get any jwk. jku, kid then what to do to get it?

Short answer: **you don’t “get” `jwk` / `jku` / `kid` from the server if they aren’t there—you try to *introduce or influence them*** and see how the server behaves.

Let’s go step by step, in a practical pentesting mindset.

---

# 🔍 1. First: Understand what you have

If your JWT header looks like:

```json
{
  "alg": "RS256",
  "typ": "JWT"
}
```

👉 Then:

* No key reference is exposed
* Server is likely using **internal key storage**

---

# 🎯 2. What you should try (real testing approach)

## ✅ Test 1: Add `kid` manually

Modify header:

```json
{
  "alg": "RS256",
  "kid": "test"
}
```

👉 Why?

* Some servers use `kid` to **lookup keys**
* If vulnerable → may allow:

  * Path traversal (`../../key`)
  * SQL injection (rare but possible)
  * Key confusion

---

## ✅ Test 2: Inject your own `jwk`

Even if not present originally, try adding:

```json
{
  "alg": "RS256",
  "jwk": {
    "kty": "RSA",
    "e": "AQAB",
    "n": "YOUR_PUBLIC_KEY"
  }
}
```

👉 Goal:

* Check if server **accepts attacker-supplied key**

### Result:

* ✅ If accepted → **critical vulnerability**
* ❌ If ignored → server is safe (for this vector)

---

## ✅ Test 3: Add `jku` (external key URL)

```json
{
  "alg": "RS256",
  "jku": "https://attacker.com/jwks.json"
}
```

👉 Host your own JWKS file:

```json
{
  "keys": [
    {
      "kty": "RSA",
      "e": "AQAB",
      "n": "YOUR_PUBLIC_KEY"
    }
  ]
}
```

👉 Goal:

* Check if server fetches keys from your URL

---

# 🔥 3. Important mindset (this is key)

👉 These parameters are:

* **Optional**
* **Attacker-controlled**

So even if they are not present:

> You can still **add them manually and test behavior**

---

# 🧠 4. What decides success?

It depends on server implementation:

| Behavior                | Result        |
| ----------------------- | ------------- |
| Ignores unknown headers | ❌ Safe        |
| Uses `jwk` from token   | 💣 Vulnerable |
| Fetches from `jku`      | 💣 Vulnerable |
| Uses `kid` insecurely   | 💣 Vulnerable |

---

# ⚠️ 5. Don’t forget this (very important)

If none of these work, try other JWT attacks:

### 🔹 Algorithm confusion

Change:

```json
"alg": "RS256" → "HS256"
```

Use public key as HMAC secret

---

### 🔹 `alg: none` attack

```json
"alg": "none"
```

(remove signature)

---

### 🔹 Weak secret (HS256)

Bruteforce secret key

---

# 🔎 6. Real pentesting workflow

1. Decode JWT
2. Identify algorithm
3. Try:

   * Add `kid`
   * Add `jwk`
   * Add `jku`
4. Re-sign token
5. Send request
6. Observe response

---

# 🎯 Final Answer (Interview-ready)

> “If `jwk`, `jku`, or `kid` are not present in a JWT, an attacker can still try injecting them manually in the header to test whether the server improperly trusts these parameters. If the server uses attacker-controlled values for key selection or verification, it can lead to JWT forgery.”

---
** how we come to knoe that jwk keader injectino is possible here? **

That’s the right question — this is exactly what separates a beginner from a real pentester.

You don’t randomly try JWK injection. You identify signals that tell you it might work.

Let’s break it down like a senior AppSec engineer would during a real test.

🧠 HOW DO YOU KNOW JWK HEADER INJECTION IS POSSIBLE?

You infer it from behavior + misconfig clues, not guess blindly.

🔍 1. FIRST CLUE — JWT HEADER ANALYSIS

You decode the token (in Burp Suite or manually):

{
  "alg": "RS256",
  "kid": "2eac68af-910b-4804-ad61-351b9db23a52"
}
🚨 What should trigger your brain?
✅ RS256 algorithm
Means asymmetric crypto
Server uses public key to verify

👉 That opens door for:

JWK injection
JKU attack
Key confusion
✅ Presence of kid
"kid": "some-id"

👉 This is a BIG signal

Why?

Server likely:

Uses kid to select key dynamically
Fetches key from:
DB
File system
Remote JWKS endpoint

👉 Dynamic key lookup = attack surface

🔍 2. SECOND CLUE — SERVER BEHAVIOR TESTING

Now you don’t assume — you probe

🧪 Test 1 — Add JWK Header

Modify token header:

{
  "alg": "RS256",
  "kid": "2eac...",
  "jwk": {
    "kty": "RSA",
    "n": "test",
    "e": "AQAB"
  }
}

👉 Send request

🧠 Observe response:
Result	Meaning
❌ Invalid signature	Server ignores JWK
⚠️ Different error	Server processing JWK
✅ Success	VULNERABLE
🔍 3. THIRD CLUE — ERROR-BASED DISCOVERY

You intentionally break things:

🧪 Modify kid
"kid": "../../../../etc/passwd"
Observe:
500 error → file access attempt
SQL error → DB lookup
Different response → dynamic behavior

👉 Confirms:
Server uses header values internally

🔍 4. FOURTH CLUE — TRY JKU FIRST

Before JWK, pros test:

"jku": "http://attacker.com/jwks.json"
Why?

Because:

Many apps support remote key fetching
If JKU works → JWK often also works
🔍 5. FIFTH CLUE — NO KEY PINNING

If server:

Doesn’t restrict keys
Doesn’t validate issuer
Doesn’t whitelist keys

👉 It may accept any key you provide

🧠 REAL PENTEST THINKING FLOW

Here’s exactly how an expert thinks:

🧩 Step-by-step reasoning:
JWT found ✅
Algorithm = RS256 ✅
kid present ✅

👉 Conclusion: dynamic key handling likely

Try:
Modify payload → fails ❌
👉 Signature verified
Try:
JKU → test remote key
JWK → inline key

👉 Observe behavior

If server:
Accepts your key
👉 AUTH BYPASS
🔥 WHEN JWK INJECTION IS POSSIBLE (SUMMARY)

You suspect it when:

✅ RS256 / asymmetric algorithm
✅ kid present
✅ External key usage possible
✅ Server behavior changes when header modified
✅ No strict key validation


# 🔗 What is `jku`?

### 👉 `jku` = **JSON Web Key URL**

It is a **header parameter inside JWT** that tells the server:

> “Hey, go to this URL and download the public keys to verify me.”

---

## Injecting Self-Signed JWT via jku parameter

# 📦 What is a JWK Set?

Think of it like:

👉 A **JSON file containing public keys**

Example:

```json
{
  "keys": [
    {
      "kty": "RSA",
      "e": "AQAB",
      "kid": "abc123",
      "n": "xyz..."
    }
  ]
}
```

---

# 🧠 Normal (Secure) Flow

1. JWT comes to server
2. Server sees:

```json
"jku": "https://trusted-site.com/jwks.json"
```

3. Server:

   * Downloads keys from trusted site
   * Verifies token

✅ Safe if URL is trusted

---

# 🚨 Attack (Simple Explanation)

### Step-by-step:

### 1. Attacker creates their own key pair

* Private key → to sign token
* Public key → to share

---

### 2. Attacker hosts their own JWK Set

Example:

```
https://attacker.com/jwks.json
```

---

### 3. Attacker modifies JWT header

```json
{
  "alg": "RS256",
  "jku": "https://attacker.com/jwks.json",
  "kid": "attacker-key"
}
```

---

### 4. Attacker signs token with THEIR private key

Payload:

```json
{
  "sub": "administrator"
}
```

---

### 5. Server receives token 😱

If server is vulnerable:

* It **blindly trusts jku URL**
* Fetches keys from attacker site
* Uses attacker public key
* Signature becomes VALID ✅

---

# 🎯 Result

👉 Attacker becomes **admin without real credentials**

---

# ⚠️ Why this vulnerability happens

Because server:

* ❌ Does NOT validate `jku` domain
* ❌ Trusts any external URL
* ❌ Doesn’t whitelist trusted sources

---

# 🧠 Easy Analogy

Think like this:

👉 Server says:

> “Give me your ID, I’ll verify it from your website”

Attacker says:

> “Sure 😎 here’s my website”

Server:

> “Looks valid, you are admin!”

---

# 🔥 Key Terms (Interview Ready)

* JWK → JSON Web Key
* JWK Set → List of keys
* `jku` → URL to fetch keys
* Attack → **JWK Injection / jku abuse**

---

# 🔐 How to Prevent

* Only allow **trusted domains**
* Ignore `jku` from token
* Use **fixed key (hardcoded or config)**
* Validate `kid` properly

---


# 🔗 What is `jku`?

### 👉 `jku` = **JSON Web Key URL**

It is a **header parameter inside JWT** that tells the server:

> “Hey, go to this URL and download the public keys to verify me.”

---

# 📦 What is a JWK Set?

Think of it like:

👉 A **JSON file containing public keys**

Example:

```json
{
  "keys": [
    {
      "kty": "RSA",
      "e": "AQAB",
      "kid": "abc123",
      "n": "xyz..."
    }
  ]
}
```

---

# 🧠 Normal (Secure) Flow

1. JWT comes to server
2. Server sees:

```json
"jku": "https://trusted-site.com/jwks.json"
```

3. Server:

   * Downloads keys from trusted site
   * Verifies token

✅ Safe if URL is trusted

---

# 🚨 Attack (Simple Explanation)

### Step-by-step:

### 1. Attacker creates their own key pair

* Private key → to sign token
* Public key → to share

---

### 2. Attacker hosts their own JWK Set

Example:

```
https://attacker.com/jwks.json
```

---

### 3. Attacker modifies JWT header

```json
{
  "alg": "RS256",
  "jku": "https://attacker.com/jwks.json",
  "kid": "attacker-key"
}
```

---

### 4. Attacker signs token with THEIR private key

Payload:

```json
{
  "sub": "administrator"
}
```

---

### 5. Server receives token 😱

If server is vulnerable:

* It **blindly trusts jku URL**
* Fetches keys from attacker site
* Uses attacker public key
* Signature becomes VALID ✅

---

# 🎯 Result

👉 Attacker becomes **admin without real credentials**

---

# ⚠️ Why this vulnerability happens

Because server:

* ❌ Does NOT validate `jku` domain
* ❌ Trusts any external URL
* ❌ Doesn’t whitelist trusted sources

---

# 🧠 Easy Analogy

Think like this:

👉 Server says:

> “Give me your ID, I’ll verify it from your website”

Attacker says:

> “Sure 😎 here’s my website”

Server:

> “Looks valid, you are admin!”

---

# 🔥 Key Terms (Interview Ready)

* JWK → JSON Web Key
* JWK Set → List of keys
* `jku` → URL to fetch keys
* Attack → **JWK Injection / jku abuse**

---

# 🔐 How to Prevent

* Only allow **trusted domains**
* Ignore `jku` from token
* Use **fixed key (hardcoded or config)**
* Validate `kid` properly

---


# 🔗 What is `jku`?

### 👉 `jku` = **JSON Web Key URL**

It is a **header parameter inside JWT** that tells the server:

> “Hey, go to this URL and download the public keys to verify me.”

---

# 📦 What is a JWK Set?

Think of it like:

👉 A **JSON file containing public keys**

Example:

```json
{
  "keys": [
    {
      "kty": "RSA",
      "e": "AQAB",
      "kid": "abc123",
      "n": "xyz..."
    }
  ]
}
```

---

# 🧠 Normal (Secure) Flow

1. JWT comes to server
2. Server sees:

```json
"jku": "https://trusted-site.com/jwks.json"
```

3. Server:

   * Downloads keys from trusted site
   * Verifies token

✅ Safe if URL is trusted

---

# 🚨 Attack (Simple Explanation)

### Step-by-step:

### 1. Attacker creates their own key pair

* Private key → to sign token
* Public key → to share

---

### 2. Attacker hosts their own JWK Set

Example:

```
https://attacker.com/jwks.json
```

---

### 3. Attacker modifies JWT header

```json
{
  "alg": "RS256",
  "jku": "https://attacker.com/jwks.json",
  "kid": "attacker-key"
}
```

---

### 4. Attacker signs token with THEIR private key

Payload:

```json
{
  "sub": "administrator"
}
```

---

### 5. Server receives token 😱

If server is vulnerable:

* It **blindly trusts jku URL**
* Fetches keys from attacker site
* Uses attacker public key
* Signature becomes VALID ✅

---

# 🎯 Result

👉 Attacker becomes **admin without real credentials**

---

# ⚠️ Why this vulnerability happens

Because server:

* ❌ Does NOT validate `jku` domain
* ❌ Trusts any external URL
* ❌ Doesn’t whitelist trusted sources

---

# 🧠 Easy Analogy

Think like this:

👉 Server says:

> “Give me your ID, I’ll verify it from your website”

Attacker says:

> “Sure 😎 here’s my website”

Server:

> “Looks valid, you are admin!”

---

# 🔥 Key Terms (Interview Ready)

* JWK → JSON Web Key
* JWK Set → List of keys
* `jku` → URL to fetch keys
* Attack → **JWK Injection / jku abuse**

---

# 🔐 How to Prevent

* Only allow **trusted domains**
* Ignore `jku` from token
* Use **fixed key (hardcoded or config)**
* Validate `kid` properly

---
## SSRF via jku parameter
🔐 First: What the app is trying to do

In a jku scenario (from above):

👉 Server tries to protect itself like:

if "trusted.com" in jku_url:
    allow()
else:
    block()

This is called a whitelist check ❌ (but implemented poorly)

🧠 Problem: URL parsing confusion

Different parts of the system:

Validation logic (filter)
Actual HTTP request (real fetch)

👉 These may interpret URL differently

🔗 Now connect to jku attack

You (attacker/tester) want:
👉 Server to fetch your malicious JWKS
👉 But filter only allows: trusted.com

So you trick it 😎

🚨 Bypass Techniques (with jku context)
🔹 1. @ (Credentials trick)
Input:
https://trusted.com@evil.com/jwks.json
What happens:
Component	Sees
Filter	✅ contains trusted.com
Actual request	❌ goes to evil.com

👉 Because:

trusted.com is treated as username
Real host = evil.com
🔹 2. # (Fragment trick)
https://evil.com#trusted.com
What happens:
Component	Sees
Filter	✅ sees trusted.com
Browser/server	❌ ignores fragment

👉 Real request goes to:

https://evil.com
🔹 3. Subdomain trick
https://trusted.com.evil.com/jwks.json
What happens:
Component	Sees
Filter	✅ contains trusted.com
DNS	❌ actual domain = evil.com
🔹 4. URL Encoding trick
https://evil.com%23trusted.com

or

https://trusted.com%40evil.com
What happens:
Filter checks raw string
Server decodes → different meaning
🔹 5. Double Encoding (Advanced)
%2523 → decoded twice → #

👉 Some systems decode twice → confusion

🔥 Combine with jku Attack

Now apply to your JWT:

{
  "alg": "RS256",
  "kid": "attacker-key",
  "jku": "https://trusted.com@evil.com/jwks.json"
}
💣 Full Attack Flow

App checks:

if "trusted.com" in jku → ✅

App fetches:

https://trusted.com@evil.com/jwks.json
Actually goes to:
👉 evil.com
Gets attacker’s key
Verifies attacker’s JWT
💥 Authentication bypass
🧠 Why this works (simple)


## Injecting self signed JWT's via kid parameter
this attack possible with HS256


# 🧠 SIMPLE IDEA FIRST

👉 The **`kid` (Key ID)** tells the server:

> “Hey, use THIS key to verify my JWT”

---

# 🔑 NORMAL FLOW (SAFE CASE)

1. Server has keys stored somewhere (file / DB)
2. JWT comes with:

```json
{
  "kid": "key1"
}
```

3. Server:

* Finds `key1`
* Uses it to verify signature

✅ All good

---

# 🚨 WHAT GOES WRONG (VULNERABILITY)

The problem is:

👉 **`kid` is just a string — no strict rules**

So developers sometimes do things like:

```python
key = open(kid).read()
```

OR

```sql
SELECT key FROM keys WHERE id = kid
```

👉 That means **you control what key server loads**

---

# 💥 ATTACK IDEA (VERY SIMPLE)

You trick the server into using a key **you control or predict**

---

# 🔴 CASE 1 — Directory Traversal via `kid`

You send:

```json
{
  "kid": "../../../../etc/passwd"
}
```

👉 Server tries:

```python
open("../../../../etc/passwd")
```

💥 Now server is using **system file as key**

---

# 🔴 CASE 2 — Using `/dev/null` (MOST IMPORTANT)

👉 `/dev/null` = special file in Linux
👉 It always returns **empty content**

---

## 🔥 Attack Trick

1. Set:

```json
{
  "kid": "/dev/null",
  "alg": "HS256"
}
```

2. Server reads:

```python
key = open("/dev/null").read()
```

👉 key = `""` (empty string)

---

3. You sign JWT using **empty secret**:

```python
jwt.encode(payload, "", algorithm="HS256")
```

---

4. Server verifies:

* Uses empty string as secret ✅
* Signature matches ✅

💥 **YOU BYPASS AUTHENTICATION**

---

# 🧠 WHY THIS WORKS

Because:

| Problem                        | Impact                 |
| ------------------------------ | ---------------------- |
| `kid` not validated            | You control key source |
| File read allowed              | You choose file        |
| HS256 allowed                  | You can sign token     |
| Predictable file (`/dev/null`) | You know the secret    |

---

# 📌 SUPER SIMPLE ANALOGY

Think of it like:

* Server asks: “Which key should I use?”
* You reply: “Go read this file → `/dev/null`”
* That file is empty → so password = empty
* You also use empty password
