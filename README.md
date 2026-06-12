# RVK Klassifikationsassistent (from index.html)
Notes:
- The app calls the RVK API and (optionally) the Anthropic API. Do NOT place API keys into client-side files.

Server proxy security:

- To use the classify features safely, set the `ANTHROPIC_API_KEY` as an environment variable and start the server. Example (Windows PowerShell):

```powershell
$env:ANTHROPIC_API_KEY = "YOUR_KEY_HERE"
node server.js
```

On macOS/Linux:

```bash
export ANTHROPIC_API_KEY="YOUR_KEY_HERE"
node server.js
```

Optional `.env` flow (recommended for local development):

1. Create a file named `.env` next to `server.js` with the content:

```
ANTHROPIC_API_KEY=YOUR_KEY_HERE
```

2. The server already loads `.env` automatically. Do NOT commit `.env` — it's ignored by `.gitignore`.

This keeps your API key on the server and avoids exposing it in `index.html`.
```powershell
$env:ANTHROPIC_API_KEY = "sk-ant-..."
node server.js
```

On macOS/Linux:

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
node server.js
```

This keeps your API key on the server and avoids exposing it in `index.html`.
