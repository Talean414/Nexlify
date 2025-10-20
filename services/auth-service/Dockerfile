FROM node:18-alpine

# Use Alibaba/Taobao npm mirror for faster installs
# Install pnpm globally from the mirror
RUN npm install -g pnpm@latest

# Set the working directory for the app
WORKDIR /app

# Copy the entire monorepo into the container
COPY ../../ ./

# Move into the auth service directory
WORKDIR /app/services/auth

# Install dependencies for the auth service
RUN pnpm install

# Expose the auth service port
EXPOSE 5001

# Start the service in development mode
CMD ["pnpm", "dev"]
