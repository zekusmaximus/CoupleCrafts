# CoupleCrafts

AI-powered at-home activity prompts for couples. Works fully client-side as a simple PWA.

## Features
- AI-generated activities (Google AI Studio Gemini or Hugging Face Inference)
- Curated fallback activities
- Favorites and ratings
- Activity history with notes and photo attachments
- Category filter and favorites-only view
- Scrapbook PDF export

## Setup
1. Open `index.html` in a browser, or use a local server for best results (service worker needs http/https).
   - Option A: Use VS Code "Live Server" extension and open the workspace.
   - Option B (PowerShell):
     ```powershell
     # Optional: if you have Python
     python -m http.server 5173
     # then open http://localhost:5173
     ```

2. In the app, open Settings (gear icon):
   - Toggle "AI Generation" ON to enable API use.
   - Pick a provider: "Google AI Studio (Gemini)" or "Hugging Face (Mistral-7B)".
   - Paste your API key.
   - Click "Save & Test" to validate the connection.

## API Keys
- Google AI Studio (Gemini): create a key at https://aistudio.google.com/app/apikey
  - Model endpoint used: `gemini-pro:generateContent` (v1beta).
- Hugging Face Inference: create a key at https://huggingface.co/settings/tokens
  - Model used: `mistralai/Mistral-7B-Instruct-v0.1`.

Notes:
- Keys are stored in IndexedDB locally in your browser.
- Rate limits or invalid keys will be surfaced with friendly error messages; check Settings and re-test.

## Using the App
- Activities tab:
  - Use the filter bar to pick a category or show favorites only.
  - Generate a new activity with the refresh icon (uses AI if enabled; otherwise picks a fallback).
  - Favorite or rate an activity.
- History tab:
  - Click "Add Entry" to log what you did.
  - Attach a photo; a preview shows before saving.
  - Entries display in reverse chronological order; click a photo to enlarge.
  - Click "Export Scrapbook" to choose all entries or only those since your last export and download a PDF for printing or gifting.

## Data Persistence
All data (activities, history, photos, settings) is stored locally via IndexedDB. Photos are stored as blobs.

## Editing Fallback Activities
- Edit `data/fallback-activities.json` and keep the shape:
  ```json
  {
    "activities": [
      {
        "title": "...",
        "description": "...",
        "category": "...",
        "instructions": ["..."],
        "supplies": ["..."],
        "cost": "$0-10"
      }
    ]
  }
  ```

## Development Notes
- Pure frontend; no build step is required.
- Uses Tailwind via CDN and Alpine.js.
- Service worker (`sw.js`) enables offline use after first load.

## Deployment
- A `.nojekyll` file is included so GitHub Pages serves files without Jekyll processing.
- The GitHub Actions workflow at `.github/workflows/deploy.yml` publishes the site whenever changes are pushed to `main`.
  - Enable GitHub Pages in the repository settings and select "GitHub Actions" as the source.

## Troubleshooting
- Blank activities list: ensure `data/fallback-activities.json` is served (requires local server due to fetch).
- AI failures: use "Save & Test" in Settings to verify keys; watch for 401/403 (bad key) or 429 (rate limit).
- Photos not showing: ensure a fresh session; object URLs are created at display time from stored blobs.
