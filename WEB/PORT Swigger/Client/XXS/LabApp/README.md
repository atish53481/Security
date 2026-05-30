# PortSwigger Inspired XSS Labs

This local lab environment contains multiple Reflected XSS challenges.

## How to Start
1. Run `npm install` (first time only).
2. Run `npm start`.
3. Open [http://localhost:3000](http://localhost:3000).

---

## Lab 1: Basic Reflected XSS
**Vulnerability:** Input is reflected directly into the HTML body without encoding.
**Identification:** Input `<b>hello</b>`. If it appears bold, it's vulnerable.
**Goal:** Call `alert(1)`.

---

## Lab 2: WAF - Blocked Tags & Attributes (Practitioner)
**Vulnerability:** Reflected XSS protected by a WAF that blocks most tags and attributes.
**Goal:** Call `print()` without user interaction.

### Solving Lab 2
1. **Identify Allowed Tags:** Use Burp Intruder with a list of HTML tags (from the [XSS Cheat Sheet](https://portswigger.net/web-security/cross-site-scripting/cheat-sheet)). You will find that `<body...>` is allowed (returns 200), while others like `<script>` return 400.
2. **Identify Allowed Attributes:** Use Burp Intruder to test events on the `<body>` tag. You will find that `onresize` is allowed.
3. **Craft the Exploit:** Since `onresize` needs the window to be resized to trigger, you can use an `<iframe>` and change its width/height on load.
4. **Exploit Server:** Use the built-in Exploit Server (`/exploit`) to deliver the payload:
   ```html
   <iframe src="http://localhost:3000/lab/blocked-tags?search=%22%3E%3Cbody%20onresize=print()%3E" onload=this.style.width='100px'></iframe>
   ```

## Troubleshooting
- Use Port **3000**.
- Ensure `node_modules` are installed.
