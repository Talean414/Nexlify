# Base image
FROM node:18-alpine

# Set up PNPM
RUN npm install -g pnpm

# Create app directory in container
WORKDIR /app

# Copy entire monorepo from build context (Render uses monorepo root as context)
COPY . .

# Set working directory inside the container to the service root
WORKDIR /app/services/auth-service

# Install dependencies for just this service
RUN pnpm install

# Expose service port (adjust if using .env)
EXPOSE 5002

# Start the service
CMD ["pnpm", "dev"]
