FROM node:18-alpine

# Use Alibaba/Taobao npm mirror for faster in
# Enable and prepare corepack to use pnpm globally
RUN npm install -g pnpm@latest

# Set working directory
WORKDIR /app

# Copy dependency definitions
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install

# Copy the rest of the app
COPY . .

# Expose app port
EXPOSE 5005

# Start the application
CMD ["pnpm", "dev"]
