# ⚡ JWT Attack Forge

**JWT Attack Forge** is a high-performance, single-page security testing tool designed specifically for solving JWT (JSON Web Token) vulnerability labs, such as those in the **PortSwigger Web Security Academy**.

It transforms static JWT payloads into malicious tokens for various attack vectors using pure browser-based logic (Web Crypto API) and a modern, interactive Claim Builder.

## 🚀 Quick Start

### 1. Prerequisites
You only need a modern web browser. 

> [!IMPORTANT]
> **Run via Local Server:** Because this app uses the **Web Crypto API** for HMAC signing, it must be accessed via a secure context (e.g., `http://localhost`). 
> **Do not** simply double-click the `index.html` file (using the `file://` protocol), as the browser will disable cryptographic signing features for security reasons.

### 2. Run the Application
The best way to run this locally is using a simple static server:

```bash
# Using Node.js (npx)
npx -y serve .

# Or using Python 3
python -m http.server 8000
```

Once running, open your browser to `http://localhost:3000` (or the port provided).

---

## 🛠 Features

### 1. Dynamic Claim Builder
- **Interactive Interface:** Add, remove, and modify JWT claims on the fly.
- **Smart Type Conversion:** Automatically detects and converts `true`/`false` to Booleans and numbers to Integers.
- **Custom Keys:** Support for arbitrary custom claim keys.
- **Raw Overrides:** Advanced JSON injection for complex nested objects.

### 2. Supported Attack Vectors
The tool provides dedicated logic and step-by-step instructions for:
- **Unverified Signature:** Bypass filters when the server fails to verify signatures.
- **Algorithm: none:** Generate tokens with disabled signature verification.
- **Weak Secret Brute Force:** Re-sign tokens using a cracked HS256 secret.
- **JWK Header Injection:** Embed public keys directly in the header.
- **JKU Header Injection:** Reference external JWKS URLs.
- **KID Path Traversal:** Abuse the Key ID to sign with known file contents (e.g., `/dev/null`).
- **Algorithm Confusion:** Transform RS256 tokens into HS256 using the server's public key.
- **Algorithm Confusion (Derived):** Assist in deriving public keys from multiple tokens.

---

## 🏗 Technical Stack
- **HTML5/CSS3:** Modern "Glassmorphism" UI with responsive layouts and smooth animations.
- **Vanilla JavaScript:** Zero dependencies for maximum portability.
- **Web Crypto API:** Real-time HMAC-SHA256 signing performed locally in your browser.

---

## ⚠️ Security Warning & Disclaimer
**EDUCATIONAL USE ONLY.**

This tool was created for security researchers and students practicing in authorized environments like the PortSwigger Web Security Academy. 
- **DO NOT** use this tool for unauthorized access to systems you do not own.
- The authors are not responsible for any misuse or legal consequences of using this software

---

## 📖 Reference
For theory and practical labs, visit the [PortSwigger JWT Academy](https://portswigger.net/web-security/jwt).
