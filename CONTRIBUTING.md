# Contributing to Dream2Play AI

Thank you for contributing!

## Getting Started

### 1. Fork and clone

```bash
git clone <your-fork-url>
cd dream2play-ai
```

### 2. Install dependencies

```bash
npm install
```

### 3. Environment

```bash
cp .env.example backend/.env
```

Edit `backend/.env` with your `JWT_SECRET` and optional `OPENAI_API_KEY`.

### 4. Run locally

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

### 5. Create a branch

```bash
git checkout -b feature/your-feature-name
```

## Contribution Guidelines

- Follow the existing code structure (`frontend/`, `backend/`)
- Match naming and style in surrounding files
- Run `npm run lint` and `npm run test` before submitting
- Update README or USER_MANUAL if behavior changes

## Pull Request Process

1. Ensure tests pass
2. Describe what changed and why
3. Link related issues if any

## Code of Conduct

See [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).
