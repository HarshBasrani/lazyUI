# LazyUI Pro 🚀

**The Constraint-Driven AI Compiler for Tailwind CSS.**

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://marketplace.visualstudio.com/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE.md)
[![Tailwind](https://img.shields.io/badge/Tailwind-Configured-38bdf8.svg)](https://tailwindcss.com/)

---

## ⚡ Why LazyUI?

Most AI tools hallucinate classes that don't exist (`text-shadow-lg`, `bg-navy-900`).
**LazyUI is different.** It is not an autocomplete—it is a **Compiler**.

It reads your project's `tailwind.config.js`, extracts your specific design tokens, and **forces** the AI to strictly adhere to your design system.

### 🚫 The Problem

> "Make a button."
> AI Output: `<button class="w-[350px] bg-[#123456]">` (Arbitrary values ❌)

### ✅ The LazyUI Solution

> "Make a button."
> LazyUI Output: `<button class="w-96 bg-slate-800">` (Design System Compliant ✅)

---

## ✨ Features

### 🧠 Context Awareness (Binocular Vision)

LazyUI reads the code **before and after** your cursor.

- Inside a `<ul>`? It generates `<li>` items.
- Inside a JS Object? It generates `key: value` properties.
- It never breaks your file structure.

### 🛡️ Smart Validation & Self-Healing

If the AI tries to use an invalid class (e.g., `text-giant`), LazyUI's **Validator Engine**:

1.  **Intercepts** the error.
2.  **Calculates** the closest valid match (e.g., `text-5xl`).
3.  **Forces** the AI to retry and fix it automatically.
4.  **Ships** only clean code.

### 🔒 Security First

- No `bg-[url(...)]` injections.
- No dangerous `<script>` tags.
- strict adherence to your configured colors and spacing.

---

## 🛠 Installation & Setup

1.  **Install the Extension** from the VS Code Marketplace.
2.  **Open Settings** (`Ctrl + ,`) and search for `lazyui`.
3.  **Configure your LLM:**
    - **API Key:** Your Groq or OpenAI Key.
    - **Model:** Recommended `llama-3.3-70b-versatile` (Fast & Smart).

---

## 🚀 Usage

1.  Open any file with a `tailwind.config.js` in the root.
2.  Place your cursor where you want code.
3.  Press `Ctrl + Shift + P` (Cmd + Shift + P on Mac).
4.  Run command: **`LazyUI: Generate`**.
5.  Type your prompt (e.g., _"A pricing card with a 'Best Value' badge"_).
6.  Watch it compile.

---

## ❓ Troubleshooting

**"Config Parse Error"**

- Ensure `tailwind.config.js` exists in the root of your workspace.
- LazyUI requires a config file to enforce constraints.

**"Strict Compliance Error"**

- This means the AI failed 3 times to meet your strict design rules. Try simplifying your prompt or checking if your requested colors actually exist in your config.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE.md).
