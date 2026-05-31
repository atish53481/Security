# 👻 GHOST SSRF Master App

Welcome to the **GHOST SSRF Master App**! This is a "one-shot" reference and payload generation tool designed to help you solve all PortSwigger SSRF labs with ease.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the App
```bash
npm run dev
```

### 3. Access the Dashboard
Open [http://localhost:5173/](http://localhost:5173/) in your browser.

---

## ✨ Features

- **Direct Payloads**: Copy-paste solutions for all 7 PortSwigger SSRF labs.
*   **Visual Diagrams**: Custom-built Mermaid charts to explain complex "Expert" bypasses.
- **Storytelling**: Simple "analogies" for each lab to ensure zero confusion.
- **Premium Design**: Dark-mode dashboard with glassmorphism and real-time payload generation.

---

## 📁 Repository Structure

- `/src`: Application source code (React + Vite).
- `/public`: Static assets.
- **[PAYLOADS.md](./PAYLOADS.md)**: The original detailed documentation of SSRF techniques and bypasses.
- **[Details.md](../Details.md)**: Visual guide with Mermaid diagrams for general SSRF concepts.
- **[Intro.md](../Intro.md)**: A beginner-friendly introduction narrative for SSRF.

---

## 🔒 Safety First
Always replace placeholder values like `[YOUR-ID]` or `[IP]` in the payloads with your actual lab environment variables before executing.

> [!TIP]
> Use the **"Expert: Whitelist Bypass"** section to understand how URL parser confusion works at a deep level.
