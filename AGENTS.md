# AGENTS.md

## Cursor Cloud specific instructions

This is a simple static Todo application (HTML/CSS/vanilla JS). There are no build tools, package managers, or external dependencies.

### Running the app

Serve the files with any static HTTP server. The simplest option:

```
python3 -m http.server 8080
```

Then open `http://localhost:8080/` in a browser.

### Notes

- No lint, test, or build commands exist — the app has no `package.json`, no test framework, and no bundler.
- Data is persisted in the browser's `localStorage` — no database or backend required.
- The app is entirely in Japanese (UI labels, README).
