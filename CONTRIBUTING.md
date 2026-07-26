# Contributing to Pomelo

This document outlines the process for contributing to the Pomelo repository and instructions for setting up the local development environment.

## Local Development Setup

To run Pomelo locally for development, you must start the background dependencies (MongoDB and Judge0) via Docker and run the frontend and backend servers directly on your host machine.

### Prerequisites

- Node.js (v20 or newer)
- pnpm (package manager)
- Docker and Docker Compose

### Step 1: Environment Configuration

Copy the example environment files for the root, server, and client environments.

```bash
cp .env.example .env
cp server/.env.example server/.env
cp client/.env.example client/.env
```

All three are required:

- **`.env`** (root) — read by Docker Compose. Supplies `POSTGRES_PASSWORD` and
  `REDIS_PASSWORD` to the Judge0 stack; without it those services start with empty
  credentials and fail to authenticate.
- **`server/.env`** — needs `MONGODB_URI` (the API exits on boot without it) and
  `AUTH_SECRET` (authenticated requests return HTTP 500 without it).
- **`client/.env`** — needs `BACKEND_URL=http://localhost:8080`. The built-in default is
  `http://server:8080`, a Docker-network name that does not resolve when the client runs
  on the host.

Set `AUTH_SECRET` to the **same** value in `server/.env` and `client/.env`; the client
signs session tokens and the server verifies them with that key. Generate one with
`openssl rand -hex 32`.

### Step 2: Start the Application

Install the monorepo dependencies and start everything.

```bash
pnpm install
pnpm dev
```

`pnpm dev` brings up the infrastructure containers (MongoDB, Judge0 server and workers)
via Docker Compose, builds `@pomelo/code-gen`, then runs the client and server on the
host. It tears the containers back down when you exit.

The client will typically be available at `http://localhost:3000` and the server at
`http://localhost:8080`. Verify the API with:

```bash
curl localhost:8080/health
```

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
