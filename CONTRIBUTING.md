# Contributing to Pomelo

This document outlines the process for contributing to the Pomelo repository and instructions for setting up the local development environment.

## Local Development Setup

To run Pomelo locally for development, you must start the background dependencies (MongoDB and Citron) via Docker and run the frontend and backend servers directly on your host machine.

### Prerequisites

- Node.js (v20 or newer)
- pnpm (package manager)
- Docker and Docker Compose

### Step 1: Environment Configuration

Copy the example environment file. The server, client and admin daemon all read this one root `.env` in development; `server/.env` and `client/.env` are not used.

```bash
cp .env.example .env
```

Review `.env` and populate any required variables (e.g., `AUTH_SECRET`). Restart `pnpm dev` after editing it.

### Step 2: Start Infrastructure Dependencies

Start the MongoDB database and Citron execution engine using Docker Compose from the root directory.

```bash
docker compose --project-name pomelo \
  --env-file .env \
  -f docker/app/docker-compose.dev.yaml \
  -f docker/citron/docker-compose.dev.yaml \
  --project-directory . \
  up mongo citron seed -d
```

### Step 3: Start the Application

Install the monorepo dependencies and start the development servers.

```bash
pnpm install
pnpm dev
```

The client will typically be available at `http://localhost:3000` and the server at `http://localhost:8080`.

## Pull Request Process

1. Fork the repository and create a new branch from `main`.
2. Ensure your code strictly follows existing formatting and linting rules. Run `pnpm lint` if available.
3. Keep pull requests scoped to a single feature or bug fix.
4. Update relevant documentation if you change configuration variables, add new features, or alter deployment scripts.
5. Submit the pull request against the `main` branch.

## Code Standards

- Use TypeScript for all new code.
- Follow the Next.js App Router conventions for the client.
- Ensure all new dependencies are strictly necessary and justified in the pull request description.
