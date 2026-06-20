# AGENTS.md

## Project Overview

Dream2Play AI is an AI-powered platform that converts dream descriptions into playable browser-based games.

The system combines:

- React Frontend
- Node.js Backend
- OpenAI API
- Phaser 3 Game Engine

---

## AI Agent Responsibilities

### Dream Analysis Agent

Purpose:

Analyze user dream descriptions and extract:

- Hero
- World
- Enemy
- Boss
- Objective
- Mood
- Difficulty

Output Format:

```json
{
  "hero": "",
  "world": "",
  "enemy": "",
  "boss": "",
  "objective": "",
  "mood": "",
  "difficulty": ""
}
```

---

### Blueprint Generator Agent

Purpose:

Convert analyzed dream data into a game blueprint.

Responsibilities:

- Create game structure
- Define levels
- Define objectives
- Generate progression logic

---

### Asset Generation Agent

Purpose:

Generate prompts for:

- Characters
- Enemies
- Bosses
- Backgrounds
- Promotional Posters

---

### Game Generation Agent

Purpose:

Generate Phaser-compatible game configuration.

Responsibilities:

- Enemy spawning
- Level setup
- Boss placement
- Difficulty scaling

---

## Development Principles

1. Maintain modular architecture.
2. Separate AI logic from game logic.
3. Keep prompts reusable.
4. Ensure scalability.
5. Prioritize user experience.

---

## Future Agents

- Dream Fusion Agent
- NPC Dialogue Agent
- Story Expansion Agent
- Multiplayer Session Agent
- Achievement Agent

---

## Project Goal

Transform imagination into interactive gameplay using artificial intelligence.

### Motto

Dream it. Generate it. Play it.
