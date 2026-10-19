---
name: GitHub Pages main-only deployment
description: The audio analyzer's GitHub Pages source and deployment topology.
---

Keep `main` as the only repository branch. GitHub Pages should use a GitHub Actions artifact deployment triggered by pushes to `main`; do not create a `gh-pages` branch.

**Why:** The user explicitly asked to publish from `main` only and confirmed that a Replit push successfully triggered the Pages deployment.

**How to apply:** Preserve the Actions publishing source and main-only trigger when changing the Pages workflow or repository setup.
