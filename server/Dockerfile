FROM node:20-alpine

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace configs
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# Copy all packages (required for workspace dependencies like code-gen)
COPY packages ./packages
COPY server ./server

# Install dependencies
RUN pnpm install

# Change to the server directory
WORKDIR /app/server

EXPOSE 8080

CMD ["pnpm", "dev"]