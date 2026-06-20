# Dream2play AI 🎮✨

Transform dream descriptions into playable browser games using AI and Phaser 3.

## Quick Start

##LIVE DEMO
https://dream2play-ai.onrender.com

### 1. Install dependencies (from project root)

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `backend/.env` and set your keys:

```env
PORT=5000
JWT_SECRET=your_secure_secret_here
OPENAI_API_KEY=sk-...   # optional — local fallback works without it
```

### 3. Run the app

**Terminal 1 — Backend:**

```bash
cd backend
npm run dev
```

**Terminal 2 — Frontend:**

```bash
cd frontend
npm run dev
```

Open **http://localhost:5173**

## Project Structure

```text
dream2play-ai/
├── frontend/          React + Vite + Phaser 3 game client
├── backend/           Express API + AI blueprint engine
├── spec/              Vitest specification tests
├── AGENTS.md          AI agent architecture notes
└── README.md
```

## Features

- **Dream analysis** — AI extracts hero, world, enemies, boss, objectives
- **Blueprint preview** — Review genre, stages, and assets before playing
- **Multi-genre gameplay** — Platformer, racing, runner, shooter, survival, battle royale, puzzle
- **Dream fusion** — Merge two dreams into a hybrid game
- **Voice input** — Web Speech API dream capture (Chrome/Edge)
- **Leaderboard** — Score tracking and badges
- **Procedural audio** — In-browser synth BGM and SFX

## Supported Game Genres

| Genre                                    | Description                                |
| ---------------------------------------- | ------------------------------------------ |
| `platformer`                             | Jump, shoot, defeat boss                   |
| `driving` / `racing` / `bike_racing`     | Lane-based vehicle gameplay                |
| `endless_runner`                         | 3-lane runner with coins                   |
| `shooter` / `survival` / `battle_royale` | Combat-focused modes                       |
| `puzzle`                                 | Collect all puzzle pieces across platforms |

## Workflow

1. Register / sign in
2. Describe your dream (text or voice)
3. **Preview blueprint** — hero, stages, boss, genre
4. **Launch game** — play in Phaser canvas
5. Defeat bosses to clear stages; submit score on victory

## Scripts

```bash
npm run lint          # ESLint
npm run test          # Vitest specs
npm run dev:backend   # API only
npm run dev:frontend  # UI only
```

## Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS 4, Phaser 3
- **Backend:** Node.js, Express, JWT auth, JSON file DB
- **AI:** OpenAI GPT-3.5 (blueprint) + DALL-E 3 (assets, optional)

## Project Metadata

- Description: Dream2Play AI transforms dream descriptions into playable browser games using AI and Phaser 3.
- Git tags: v1.0.0, v1.0.1, v1.0.2

## Pre-commit Hook Analysis

- Hook repositories configured: 3
- Total hooks configured: 12
- Included tools: eslint, oxlint, biome, prettier, TypeScript type-check via the pre-commit tsc hook using npx tsc --noEmit, Knip, npm audit, Gitleaks, and basic pre-commit hygiene checks.

## License

MIT License — Copyright (c) 2026 Dream2play AI Team
