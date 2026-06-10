<<<<<<< HEAD
# Dream2Play-ai



## Getting started

To make it easy for you to get started with GitLab, here's a list of recommended next steps.

Already a pro? Just edit this README.md and make it your own. Want to make it easy? [Use the template at the bottom](#editing-this-readme)!

## Add your files

- [ ] [Create](https://docs.gitlab.com/ee/user/project/repository/web_editor.html#create-a-file) or [upload](https://docs.gitlab.com/ee/user/project/repository/web_editor.html#upload-a-file) files
- [ ] [Add files using the command line](https://docs.gitlab.com/ee/gitlab-basics/add-file.html#add-a-file-using-the-command-line) or push an existing Git repository with the following command:

```
cd existing_repo
git remote add origin https://code.swecha.org/sridhar24/dream2play-ai.git
git branch -M main
git push -uf origin main
```

## Integrate with your tools

- [ ] [Set up project integrations](https://code.swecha.org/sridhar24/dream2play-ai/-/settings/integrations)

## Collaborate with your team

- [ ] [Invite team members and collaborators](https://docs.gitlab.com/ee/user/project/members/)
- [ ] [Create a new merge request](https://docs.gitlab.com/ee/user/project/merge_requests/creating_merge_requests.html)
- [ ] [Automatically close issues from merge requests](https://docs.gitlab.com/ee/user/project/issues/managing_issues.html#closing-issues-automatically)
- [ ] [Enable merge request approvals](https://docs.gitlab.com/ee/user/project/merge_requests/approvals/)
- [ ] [Set auto-merge](https://docs.gitlab.com/ee/user/project/merge_requests/merge_when_pipeline_succeeds.html)

## Test and Deploy

Use the built-in continuous integration in GitLab.

- [ ] [Get started with GitLab CI/CD](https://docs.gitlab.com/ee/ci/quick_start/index.html)
- [ ] [Analyze your code for known vulnerabilities with Static Application Security Testing (SAST)](https://docs.gitlab.com/ee/user/application_security/sast/)
- [ ] [Deploy to Kubernetes, Amazon EC2, or Amazon ECS using Auto Deploy](https://docs.gitlab.com/ee/topics/autodevops/requirements.html)
- [ ] [Use pull-based deployments for improved Kubernetes management](https://docs.gitlab.com/ee/user/clusters/agent/)
- [ ] [Set up protected environments](https://docs.gitlab.com/ee/ci/environments/protected_environments.html)

***

# Editing this README

When you're ready to make this README your own, just edit this file and use the handy template below (or feel free to structure it however you want - this is just a starting point!). Thanks to [makeareadme.com](https://www.makeareadme.com/) for this template.

## Suggestions for a good README

Every project is different, so consider which of these sections apply to yours. The sections used in the template are suggestions for most open source projects. Also keep in mind that while a README can be too long and detailed, too long is better than too short. If you think your README is too long, consider utilizing another form of documentation rather than cutting out information.

## Name
Choose a self-explaining name for your project.

## Description
Let people know what your project can do specifically. Provide context and add a link to any reference visitors might be unfamiliar with. A list of Features or a Background subsection can also be added here. If there are alternatives to your project, this is a good place to list differentiating factors.

## Badges
On some READMEs, you may see small images that convey metadata, such as whether or not all the tests are passing for the project. You can use Shields to add some to your README. Many services also have instructions for adding a badge.

## Visuals
Depending on what you are making, it can be a good idea to include screenshots or even a video (you'll frequently see GIFs rather than actual videos). Tools like ttygif can help, but check out Asciinema for a more sophisticated method.

## Installation
Within a particular ecosystem, there may be a common way of installing things, such as using Yarn, NuGet, or Homebrew. However, consider the possibility that whoever is reading your README is a novice and would like more guidance. Listing specific steps helps remove ambiguity and gets people to using your project as quickly as possible. If it only runs in a specific context like a particular programming language version or operating system or has dependencies that have to be installed manually, also add a Requirements subsection.

## Usage
Use examples liberally, and show the expected output if you can. It's helpful to have inline the smallest example of usage that you can demonstrate, while providing links to more sophisticated examples if they are too long to reasonably include in the README.

## Support
Tell people where they can go to for help. It can be any combination of an issue tracker, a chat room, an email address, etc.

## Roadmap
If you have ideas for releases in the future, it is a good idea to list them in the README.

## Contributing
State if you are open to contributions and what your requirements are for accepting them.

For people who want to make changes to your project, it's helpful to have some documentation on how to get started. Perhaps there is a script that they should run or some environment variables that they need to set. Make these steps explicit. These instructions could also be useful to your future self.

You can also document commands to lint the code or run tests. These steps help to ensure high code quality and reduce the likelihood that the changes inadvertently break something. Having instructions for running tests is especially helpful if it requires external setup, such as starting a Selenium server for testing in a browser.

## Authors and acknowledgment
Show your appreciation to those who have contributed to the project.

## License
For open source projects, say how it is licensed.

## Project status
If you have run out of energy or time for your project, put a note at the top of the README saying that development has slowed down or stopped completely. Someone may choose to fork your project or volunteer to step in as a maintainer or owner, allowing your project to keep going. You can also make an explicit request for maintainers.
=======
# Dream2Play AI 🌌🎮

Dream2Play AI is a complete, production-ready web application built for the hackathon. It takes a user's dream described in natural language (via keyboard or real-time voice speech transcription), analyzes it (using OpenAI or a smart local NLP rule engine), compiles a game blueprint, and generates a playable 2D game immediately inside the browser using **Phaser 3**.

The entire web application, user interface, game engine, and procedurally generated audio adapt dynamically to match the mood of the dream: **Sci-Fi**, **Horror**, **Fantasy**, **Adventure**, or **Mystery**.

---

## 🚀 Key Features

1. **Dynamic Mood Engine**: The entire website interface—including fonts, glowing backgrounds, gradient borders, and color tokens—morphs instantly to fit the theme of the selected dream game.
2. **Procedural Phaser 3 Gameplay**: Physics parameters (gravity, speed, double-jumps, jetpack thrust), weapon projectiles (lasers, magic fireballs, thrown torches), custom vector sprites (robot drones, ghosts, wizard slimes), and a dynamic boss battle are generated on-the-fly from the dream blueprint.
3. **Web Audio API Sound Synth**: No external sound assets are needed. An in-browser oscillator synthesizer procedurally generates background chords (e.g., sci-fi arpeggios, creepy horror drones, fantasy chime bells) and retro sound effects (jump, shoot, collect, explode, win, game over) in real-time.
4. **Real Voice Input**: Features native Web Speech API integration. Click the holographic microphone button, describe your dream, and see it transcribed live.
5. **Dream Fusion**: Select any two dreams from your history log and merge them to compile a new, hybrid-genre game blueprint (e.g., "Space Adventure" + "Fantasy Magic" = "Astral Wizard Journey").
6. **Global Leaderboard**: Save and track high scores, completion times, and difficulty records. Includes a profile dashboard with unlockable achievement badges.

---

## 🛠️ Tech Stack

- **Frontend**: React, Vite, Tailwind CSS v4, Phaser 3
- **Backend**: Node.js, Express
- **Database**: Local JSON persistence database (MongoDB fallback mode)
- **AI Integration**: OpenAI Chat Completions API (custom keyword parser fallback mode)

---

## 📂 Project Structure

```text
dream2play-ai/
├── frontend/                 # React UI + Phaser Game Client
│   ├── src/
│   │   ├── components/       # Navbar, DreamForm, GameCanvas
│   │   ├── pages/            # LandingPage, DashboardPage, GamePage, HistoryPage, ProfilePage
│   │   ├── game/             # Phaser Scenes (PlayScene, GameConfig, AudioSynth)
│   │   ├── App.jsx           # Main Router & API controls
│   │   └── index.css         # Styling system & theme declarations
│   └── package.json
│
├── backend/                  # Express API Server
│   ├── utils/                # NLP Analyzer (analyzer.js), JSON DB controller (localdb.json)
│   ├── server.js             # API entrypoint
│   └── package.json
│
└── README.md                 # Project guide
```

---

## ⚙️ Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- npm (v9 or higher)

### Step 1: Clone or Open Workspace
Open the workspace directory in your code editor:
`C:\Users\sriva\.gemini\antigravity\scratch\dream2play-ai`

### Step 2: Configure Environment
Create a `.env` file in the `backend/` directory (or edit the created one):
```env
PORT=5000
JWT_SECRET=dream2play_secret_key_12345
OPENAI_API_KEY=your_openai_api_key_here  # Optional: App runs locally without a key!
```

### Step 3: Run the Servers

#### Start Backend
Open a terminal in the `backend/` folder and run:
```bash
npm start
```
The server will boot on `http://localhost:5000`.

#### Start Frontend
Open a terminal in the `frontend/` folder and run:
```bash
npm run dev
```
The Vite development server will spin up on `http://localhost:5173`.

---

## 🎮 How to Play

1. Open your browser to `http://localhost:5173`.
2. Register a new user account (or use mock credentials).
3. Click **Dream Engine** in the navigation header.
4. Input your dream details:
   - Type a title (e.g., *Sentry Attack*)
   - Describe the dream (e.g., *I was a cyborg flying in a cyber facility dodging security bots*)
   - Click the Microphone button to dictate the description!
5. Press **Synthesize Playable Game** and watch the compile log.
6. Press the **Unmute Sound** button in the navbar to start the synthesized BGM.
7. Use **Left/Right Arrow** keys to move, **Up Arrow** to jump/fly, and **Spacebar** to fire lasers.
8. Collect crystals, defeat patrols, and destroy the core Boss to submit your high score!
>>>>>>> f1fe991 (Initial commit)
