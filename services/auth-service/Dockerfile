FROM node:18-alpine

# Install pnpm globally
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy all files to container
COPY . .

# Install dependencies using pnpm
RUN pnpm install

# Expose the dev port (adjust if yours is different)
EXPOSE 5002

# Start the dev script
CMD ["pnpm", "dev"]
