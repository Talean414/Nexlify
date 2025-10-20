FROM node:18-alpine

# Use Alibaba/Taobao npm mirror for faster install
# Enable and prepare corepack to use pnpm globally
RUN npm install -g pnpm@latest
# Set working directory
WORKDIR /app

# Copy dependency files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install

# Copy the fallback script
COPY fallback.js .

# Expose default port (optional, if applicable)
#EXPOSE 3000

# Run the fallback script
CMD ["node", "fallback.js"]
