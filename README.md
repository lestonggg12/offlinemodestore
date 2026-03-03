# Sari-Sari Store

A Django-based inventory and point-of-sale web app deployed on [Railway](https://railway.app).

Live URL: **https://sarisaristore-production-2fa3.up.railway.app**

---

## ⚡ Quick Start (read this first)

> **Question:** "Should I open a new blank file in VS Code, or continue in my current terminal?"
>
> **Answer: continue in your current terminal.** Open the *existing* project folder — do **not** create a new blank file.

### First time on this computer

```bash
# In your existing terminal — run these commands one by one:

git clone https://github.com/lestonggg12/sarisaristore.git   # download the project
cd sarisaristore                                              # enter the folder
code .                                                        # open VS Code HERE
```

### Already cloned? Getting "destination path already exists"?

If you see this error:

```
fatal: destination path 'sarisaristore' already exists and is not an empty directory.
```

It means the folder is **already on your computer**. You don't need to clone again — just enter the folder and open it:

```bash
cd sarisaristore   # enter the existing folder
code .             # open VS Code HERE
```

If you're not sure which directory you're in, run `pwd` (Mac/Linux) or `cd` with no arguments (Windows) to see your current path. If the `sarisaristore` folder is in a different location, adjust the path accordingly:

```bash
# Mac / Linux / Git Bash
cd ~/sarisaristore
code .
```

```powershell
# Windows PowerShell or Command Prompt
cd C:\Users\Student\sarisaristore
code .
```

### After VS Code opens

1. VS Code opens the project folder — you can see all the files in the left panel.
2. Accept the *"Install recommended extensions"* pop-up.
3. Open VS Code's built-in terminal: **Terminal → New Terminal** (or `` Ctrl+` ``).
4. Continue the setup steps in that terminal (create venv, install packages, etc.).

Alternatively, use **Terminal → Run Task** to run common commands with a single click
(no terminal typing required — see `.vscode/tasks.json`).

---

## Table of Contents

1. [Quick Start](#-quick-start-read-this-first)
2. [Prerequisites](#prerequisites)
3. [Open the project in VS Code](#open-the-project-in-vs-code)
4. [Local development setup](#local-development-setup)
5. [How Railway auto-deploys your changes](#how-railway-auto-deploys-your-changes)
6. [Check if your local files match GitHub](#check-if-your-local-files-match-github)
7. [Project structure](#project-structure)
8. [Environment variables reference](#environment-variables-reference)

---

## Prerequisites

| Tool | Why you need it |
|------|----------------|
| [Git](https://git-scm.com/) | Clone the repo and push changes |
| [Python 3.12+](https://www.python.org/) | Run Django locally |
| [VS Code](https://code.visualstudio.com/) | Recommended editor |
| [Railway CLI](https://docs.railway.app/develop/cli) *(optional)* | Stream live logs from the terminal |

---

## Open the project in VS Code

```bash
# 1. Clone the repository
git clone https://github.com/lestonggg12/sarisaristore.git
cd sarisaristore

# 2. Open VS Code in the project folder
code .
```

As soon as VS Code opens it will show a pop-up:
> *"Do you want to install the recommended extensions for this repository?"*

Click **Install** — this installs the extensions listed in `.vscode/extensions.json`:

| Extension | Purpose |
|-----------|---------|
| `ms-python.python` | Python syntax, IntelliSense |
| `ms-python.vscode-pylance` | Fast type checking |
| `ms-python.debugpy` | Debugger (required for F5 launch) |
| `batisteo.vscode-django` | Django template syntax & snippets |
| `eamodio.gitlens` | Visualise git history inline |

### Select the Python interpreter

1. Press **Ctrl+Shift+P** (or **Cmd+Shift+P** on Mac) → type *"Python: Select Interpreter"*
2. Choose the interpreter inside your `venv/` folder (e.g. `./venv/bin/python`)

---

## Local development setup

```bash
# 1. Create and activate a virtual environment
python -m venv venv
# macOS / Linux:
source venv/bin/activate
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1

# 2. Install dependencies
pip install -r requirements.txt

# 3. Copy the example env file and fill in your values
cp .env.example .env
# Edit .env with your favourite editor — see "Environment variables" below.

# 4. Apply database migrations
python manage.py migrate

# 5. Start the development server
python manage.py runserver
```

The app will be available at **http://127.0.0.1:8000**.

### Run and debug with VS Code (F5)

The `.vscode/launch.json` file pre-configures a one-click Django launch:

1. Make sure you have created and activated the virtual environment (step 1 above).
2. Press **F5** (or click the green ▶ button in the Run & Debug panel).
3. VS Code starts `manage.py runserver` with the debugger attached.
4. Open **http://127.0.0.1:8000** in your browser.
5. **Set breakpoints** by clicking to the left of any line number — the server pauses there.

> **Tip – live reload:** The Django development server automatically restarts whenever
> you save a `.py` file. For static files (JS/CSS), hard-refresh the browser
> (Ctrl+Shift+R / Cmd+Shift+R).

---

## How Railway auto-deploys your changes

Railway watches the **GitHub repository** and triggers a new deployment every time
you push a commit to the connected branch (usually `main`).

```
Edit file in VS Code
       │
       ▼
git add . && git commit -m "my change"
       │
       ▼
git push origin main          ← triggers Railway build automatically
       │
       ▼
Railway pulls the new commit, runs:
  1. docker build (Dockerfile)
  2. python manage.py collectstatic --noinput
  3. python manage.py migrate
  4. gunicorn … (serves the app)
       │
       ▼
Live at https://sarisaristore-production-2fa3.up.railway.app  ✅
```

**To watch the deployment in real time:**

1. Open the [Railway dashboard](https://railway.app/dashboard) → select your project → click **Deployments**.
2. Click the active deployment to see build and runtime logs live.
3. Or, from your terminal with the Railway CLI:

```bash
railway login
railway link          # link this folder to your Railway project
railway logs --tail   # stream live logs
```

---

## Check if your local files match GitHub

> **Question:** "How do I know if the files in VS Code are the same as the files on GitHub?"

There are two ways — a graphical way inside VS Code, and a terminal way.

### Option A — VS Code Source Control panel (no commands needed)

1. Click the **Source Control icon** in the left sidebar (the icon that looks like a branching tree, or press **Ctrl+Shift+G**).
2. At the top of the panel, click the **⋯ (three-dot menu)** → **Pull, Push** → **Fetch**.
3. After fetching, VS Code shows:
   - Files with a **M** badge → modified locally (different from your last commit).
   - Files with a **U** badge → new local files not yet on GitHub.
   - Files with a **D** badge → deleted locally but still on GitHub.
   - Files with a **C** badge → merge conflict (needs manual resolution).
   - No badges → your files are identical to GitHub. ✅
4. To bring your local files up to date with GitHub, click **⋯** → **Pull**.

### Option B — terminal commands

Open the VS Code terminal (**Terminal → New Terminal**) and run:

```bash
# Step 1 – see if you have any unsaved/uncommitted local changes
git status
```

- `nothing to commit, working tree clean` → your files match your last commit.
- Any listed files → those files differ from your last commit.

```bash
# Step 2 – download the latest info from GitHub (does NOT change your files yet)
git fetch origin
```

```bash
# Step 3 – compare your local branch with the GitHub version
git status
```

After `git fetch`, `git status` will say one of:
- `Your branch is up to date with 'origin/main'` → **your files are the same as GitHub** ✅
- `Your branch is behind 'origin/main' by N commits` → GitHub has newer changes; run `git pull` to download them.
- `Your branch is ahead of 'origin/main' by N commits` → you have local changes not yet pushed to GitHub.

```bash
# Step 4 – update your local files to match GitHub
git pull origin main
```

> **Tip:** If `git pull` says `Already up to date`, your files are already identical to GitHub.

### ❗ "Your local changes would be overwritten by merge" error

If `git pull` shows this error:

```
error: Your local changes to the following files would be overwritten by merge:
        .env.example
Please commit your changes or stash them before you merge.
Aborting
```

It means you have locally edited `.env.example`, but the repository has a newer version of it.  
**`.env.example` is only a template — your real settings belong in `.env`**, not in `.env.example`.

Fix it in two steps:

```powershell
# Step 1 – discard your local changes to .env.example (safe — your .env is untouched)
git checkout -- .env.example

# Step 2 – pull again
git pull origin main
```

> **Why is this safe?** Your actual secrets live in `.env`, which git never tracks. `.env.example`
> is just a blank template. Resetting it to the repo version does **not** affect your running app.

---

## Project structure

```
sarisaristore/
├── manage.py
├── requirements.txt
├── Dockerfile              # Docker build used by Railway
├── start.sh                # Entrypoint: collectstatic → migrate → gunicorn
├── railway.json            # Railway build/deploy config
├── .env.example            # Template — copy to .env for local development
├── .vscode/
│   ├── extensions.json     # Recommended extensions (VS Code installs on open)
│   ├── settings.json       # Interpreter path, envFile, Django settings module
│   ├── launch.json         # F5 debug launch config for Django runserver
│   └── tasks.json          # Terminal → Run Task shortcuts (runserver, migrate, …)
└── sarisaristore/
    ├── sarisaristore/
    │   ├── settings.py     # Django settings (reads from .env / Railway env vars)
    │   ├── urls.py
    │   └── wsgi.py
    ├── store/              # Main app (models, views, API)
    ├── static/             # Source static files (JS, CSS, images)
    ├── staticfiles/        # Collected statics — do NOT edit directly
    └── templates/          # HTML templates
```

---

## Environment variables reference

Copy `.env.example` to `.env` for local development.  
For production, set these as **Environment Variables** in the Railway dashboard
(Settings → Variables) — never commit a real `.env` file.

| Variable | Required | Description |
|----------|----------|-------------|
| `DJANGO_SECRET_KEY` | ✅ | Random secret string — generate locally: `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"` |
| `DEBUG` | | `True` locally, `False` in production (default: `True`) |
| `ALLOWED_HOSTS` | | Comma-separated hostnames (default: `localhost,127.0.0.1`) |
| `DATABASE_URL` | | PostgreSQL URL from Railway. Omit to use SQLite locally. |

### Setting variables on Railway

1. Go to your project in the [Railway dashboard](https://railway.app/dashboard).
2. Click **Variables** in the left sidebar.
3. Add each variable (e.g. `DJANGO_SECRET_KEY`, `DATABASE_URL`).
4. Railway will automatically redeploy when variables change.
