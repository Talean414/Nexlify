FROM node:18-alpine

# Install pnpm
RUN npm install -g pnpm

# Create app dir
WORKDIR /app

# Copy the WHOLE monorepo
COPY ../../ ./

# Go into the auth service directory
WORKDIR /app/services/auth

# Install dependencies for this service
RUN pnpm install

# Expose the port
EXPOSE 5002

# Start in dev mode
CMD ["pnpm", "dev"]