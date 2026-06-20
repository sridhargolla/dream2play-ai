# Dream2Play AI - User Manual

## Introduction

Dream2Play AI transforms dream descriptions into playable browser games using AI and procedural game generation.

---

## Starting the Application

### Backend

```bash
cd backend
npm install
npm run dev
```

Runs on **http://localhost:5000**

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs on **http://localhost:5173**

---

## How to Use

### Step 1: Sign In

Create an account or log in from the landing page.

### Step 2: Enter Your Dream

Go to **Dream Engine** and describe your dream. Use the microphone button for voice input (Chrome/Edge recommended).

Example:

```text
I was flying above a futuristic city while dragons chased me.
```

### Step 3: Generate Game

Click **Synthesize Playable Game**. The AI builds a staged blueprint and generates assets.

### Step 4: Review Blueprint Preview

After generation you see a **Blueprint Preview** with:

- Game title and genre
- Hero and difficulty
- All stages with objectives and bosses
- Generated asset thumbnails

### Step 5: Play the Game

Click **Launch Game**. Controls:

| Action      | Key            |
| ----------- | -------------- |
| Move        | ← → Arrow keys |
| Jump        | ↑ Arrow        |
| Shoot       | Space          |
| Dash        | Q              |
| Shield      | E              |
| Triple Shot | R              |

### Step 6: Clear Stages

- Watch the **Live Mission Feed** for boss defeat and stage completion messages
- In-game banners show **BOSS DEFEATED** and **STAGE X COMPLETE**
- Complete all stages to win and post your score

---

## Dream Fusion

From **Dream Logs**, select two dreams and click **Fuse Chosen Dreams** to create a hybrid game.

---

## Tips for Better Results

- Use detailed descriptions with locations, characters, and actions
- Mention a genre keyword: _racing_, _puzzle_, _zombie_, _shooter_, etc.
- Optional: add your OpenAI API key in the dream form for smarter blueprints and DALL-E assets

Example:

```text
I was a wizard solving crystal puzzles in a maze on Mars while robots guarded the exit.
```

---

## Troubleshooting

### Game Not Generating

- Ensure the backend is running on port 5000
- Check `backend/.env` for `OPENAI_API_KEY` (optional — local fallback exists)

### Boss Disappears Too Fast

- Bosses require multiple hits — use Space to shoot, not dash through them
- Watch the boss HP bar at the top of the canvas

### No Stage Completion Message

- Defeat the stage boss first (or collect all puzzle pieces in puzzle mode)
- Check the Live Mission Feed sidebar during gameplay

---

## Support

Open an issue in the project repository for bugs or suggestions.

Thank you for using Dream2Play AI.
