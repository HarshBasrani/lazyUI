# LazyUI Pro 🚀
![demo](https://github.com/user-attachments/assets/c6dc4f45-61fd-4cc1-8f2c-26cd2ab94065)
**The Constraint-Driven AI Compiler for Tailwind CSS.**

[![Version](https://img.shields.io/badge/version-1.0.3-blue.svg)](https://marketplace.visualstudio.com/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE.md)
[![Tailwind](https://img.shields.io/badge/Tailwind-Configured-38bdf8.svg)](https://tailwindcss.com/)

---

## ⚡ Why LazyUI?

Most AI tools hallucinate classes that don't exist (`text-shadow-lg`, `bg-navy-900`).
**LazyUI is different.** It is not an autocomplete—it is a **Compiler**.

It reads your project's `tailwind.config.js`, extracts your specific design tokens, and **forces** the AI to strictly adhere to your design system.

### 🛡️ Why it's Safe (The Anti-Hallucination Engine)

Most AI tools guess classes. LazyUI uses a **local compilation engine** to enforce your constraints.

**New in v1.0.3:**
* **🔒 Prefix Locking:** The engine strictly locks semantic prefixes. It will never swap a `text-` class for a `bg-` class, preventing accidental layout breaks.
* **🎯 Confidence Threshold:** Built-in Levenshtein validator (default 0.8). If the AI isn't 80% sure of a match, it aborts rather than guessing.
* **⚡ Zero Latency:** Runs entirely locally. No API calls for validation.

---

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
2.  **Calculates** the closest valid match (e.g., `text-5xl`) using Levenshtein distance.
3.  **Forces** the AI to retry and fix it automatically.
4.  **Ships** only clean code.

### 🔒 Security First

- No `bg-[url(...)]` injections.
- No dangerous `<script>` tags.
- Strict adherence to your configured colors and spacing.

---

## 🛠 Installation & Setup

1.  **Install the Extension** from the VS Code Marketplace.
2.  **Open Settings** (`Ctrl + ,`) and search for `lazyui`.
3.  **Configure your LLM:**
    - **API Key:** Your Groq or OpenAI Key.
    - **Model:** Recommended `llama-3.3-70b-versatile` (Fast & Smart).

---

## 🚀 Usage

1.  Open any file with a `tailwind.config.js` in the
