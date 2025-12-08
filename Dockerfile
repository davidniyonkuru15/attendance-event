# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app

# Upgrade npm to latest stable
RUN npm install -g npm@11.6.4

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy the rest of the app
COPY . .

# Stage 2: Runtime
FROM node:20-alpine
WORKDIR /app
COPY --from=build /app .

EXPOSE 4000
CMD ["node", "app.js"]
