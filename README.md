# ♾️ LifeLink

A premium, privacy-first Chrome Extension designed to track your digital attention, analyze focus cycles, and generate visual, print-ready "Internet Receipts" of your daily web productivity.

---

## ✨ Features

*   **🕵️ Gentle Activity Awareness**: Background worker that intelligently monitors tab focus and active browsing duration.
*   **💤 Respectful Idle Detection**: Integrated with the Chrome Idle API to automatically pause tracking when you step away from your keyboard.
*   **🏷️ Smart Category Classification**: Custom rules to dynamically categorize domain visits into **Deep Focus**, **Active Learning**, or **Leisure Browsing**.
*   **📊 Telemetry & Diagnostics**: Real-time status panel showing local database usage, message listener status, and service worker integrity logs.
*   **🧾 Attention Receipts**: A sleek, retro-modern, CSS-animated digital receipt summarizing your focus metrics, ready for sharing or printing.
*   **🔒 Local Sandbox Guarantee**: 100% of your browsing history and settings are stored locally on your machine (`chrome.storage.local` and `localStorage`). **No cloud sync, no tracking, no external APIs.**

---

## 🛠️ Technology Stack

*   **Bundler**: [Vite](https://vite.dev/) (Multi-page configuration for Extension HTML files + custom background configuration)
*   **Frontend**: [React 18](https://react.dev/) with [TypeScript](https://www.typescriptlang.org/)
*   **Styling**: [Tailwind CSS v3](https://tailwindcss.com/) with custom glassmorphism components
*   **Visuals**: [Recharts](https://recharts.org/) for digital day category charts

---

## 📂 Project Structure

```text
Lifelink/
├── dist/                      # Compiled production assets (Chrome Extension folder)
├── public/                    # Static assets (gorgeous 3D logo icons & manifest.json)
└── src/
    ├── background/            # Manifest V3 service worker (concurrency queue & tracking hook)
    ├── components/            # Reusable UI parts (Category Chart, Receipt Card, Score Card)
    ├── lib/                   # Business logic (Activity Analytics, Category Classifier)
    ├── pages/                 # Full pages (Dashboard/New Tab, Extension Popup, Settings, Status)
    ├── styles/                # Themes (Pastel Light, Midnight Dark Glass)
    ├── types/                 # Consolidated TypeScript type contracts
    └── utils/                 # Storage sync and event dispatch utilities
```

---

## 🚀 Getting Started

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org/) installed.

### 2. Install Dependencies
```bash
npm install
```

### 3. Build the Extension
To bundle the frontend components, HTML targets, and background script concurrently:
```bash
npm run build
```

### 4. Load the Extension into Google Chrome
1.  Open Chrome and navigate to `chrome://extensions/`.
2.  Enable **Developer mode** (toggle in the top-right corner).
3.  Click **Load unpacked** in the top-left.
4.  Select the **`dist`** folder generated in the project root.

---

## 💻 Developer Commands

*   `npm run dev`: Starts the local Vite development server (useful for testing component layouts in isolation).
*   `npm run build`: Packages and generates the final extension directory structure under `/dist`.
*   `npx tsc --noEmit`: Performs a strict project-wide TypeScript compilation check.

---

## 🛡️ Privacy Policy & Security

*   **Hidden Zones**: Customize a domain blacklist to prevent tracking on sensitive URLs.
*   **Identity Protection**: LifeLink never tracks passwords, query strings, incognito tabs, or form fields.
*   **Data Control**: Full database telemetry allows you to clear single sessions, delete today's logs, or completely purge the database with one click.
