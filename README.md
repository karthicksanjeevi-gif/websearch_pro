# Amazon ASIN Bulk Checker

Automated bulk Amazon product URL generator, listing validator, product image extractor, and **PDF report exporter**.

---

## 🚀 How to Run in VS Code (Step-by-Step)

### Prerequisites
Make sure you have **Node.js** installed (v18, v20, or v22+ is recommended):
- Check if installed: open terminal and run `node -v`
- If not installed, download from [nodejs.org](https://nodejs.org/).

---

### Step 1: Open the Project in VS Code
1. Open **Visual Studio Code**.
2. Click **File** > **Open Folder...** (or `Cmd+O` on Mac / `Ctrl+O` on Windows).
3. Select the folder containing this project.

---

### Step 2: Open the Integrated Terminal
In VS Code:
- Press **Ctrl + `** (backtick) on Windows/Linux or **Cmd + `** on Mac.
- Or go to the top menu: **Terminal** > **New Terminal**.

---

### Step 3: Install Dependencies
In the terminal, run:

```bash
npm install
```

This will download and install all required packages (`react`, `express`, `vite`, `tailwindcss`, `cheerio`, etc.).

---

### Step 4: Start the Development Server
Run:

```bash
npm run dev
```

You should see output similar to:
```
[Amazon ASIN Bulk Checker] Server active on http://0.0.0.0:3000
```

---

### Step 5: Open in Your Browser
Open your browser (Chrome, Edge, Safari, Firefox) and navigate to:

👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🛠️ Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Runs the full-stack app (Express backend + Vite React frontend) on port 3000 with hot reload. |
| `npm run build` | Builds the client SPA for production into the `dist/` directory. |
| `npm start` | Runs the production server using `dist/`. |
| `npm run lint` | Runs TypeScript type checking (`tsc --noEmit`). |

---

## 💡 Troubleshooting

- **Port 3000 already in use?**
  Run with a custom port:
  ```bash
  PORT=3001 npm run dev
  ```
  (On Windows PowerShell: `$env:PORT=3001; npm run dev`)

- **Script execution policy error on Windows PowerShell?**
  Run:
  ```powershell
  Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
  ```
  Or run in **Git Bash** or **Command Prompt** (cmd) inside VS Code.

---

## 🌐 Deploying to Vercel

This repository is pre-configured with `vercel.json` and Vercel Serverless Functions in `/api/`:

1. Push your repository to GitHub or run `vercel` in your project folder.
2. In the Vercel Project Settings:
   - **Framework Preset**: `Vite`
   - **Build Command**: `vite build` (or default `npm run build`)
   - **Output Directory**: `dist`
3. Vercel automatically routes `/api/check-asin` and `/api/proxy-image` to serverless functions, and the app includes browser fallback verification so checks never return false negatives.
