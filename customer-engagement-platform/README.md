# AI Customer Engagement Platform

Production-grade AI Customer Engagement Platform built on the MERN stack. See [CLAUDE.md](CLAUDE.md) and [docs/](docs/) for architecture, roadmap, and coding standards.

## Stack

- **Frontend**: React (Vite), Material UI, React Router, Socket.io Client
- **Backend**: Node.js, Express.js, MongoDB, Mongoose, Socket.io, JWT
- **AI**: Groq API (`openai/gpt-oss-120b`)

## Project Structure

```
customer-engagement-platform/
├── frontend/     React application
├── backend/      Express API
├── docs/         Architecture & process documentation
└── .github/      CI workflows
```

## Prerequisites

- Node.js 20+
- MongoDB running locally, or via Docker Compose
- npm 10+

## Setup

```bash
npm install
cp .env.example .env
```

Fill in `.env` with your local values (`MONGO_URI`, `GROQ_API_KEY`, etc.).

## Development

Run both apps concurrently:

```bash
npm run dev
```

Or individually:

```bash
npm run dev --prefix backend
npm run dev --prefix frontend
```

- Backend: http://localhost:5000
- Frontend: http://localhost:5173

## Docker

```bash
docker compose up --build
```

## Linting & Formatting

```bash
npm run lint
npm run format
```

A pre-commit hook (Husky + lint-staged) runs linting and formatting automatically on staged files.

## Documentation

Start with [docs/PROJECT_OVERVIEW.md](docs/PROJECT_OVERVIEW.md) and [docs/IMPLEMENTATION_ROADMAP.md](docs/IMPLEMENTATION_ROADMAP.md) for the current implementation phase.
