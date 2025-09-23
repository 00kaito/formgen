# Stage 1: Build the application
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Run the production application
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/package*.json ./
RUN npm install --production
COPY --from=builder /app/node_modules /app/node_modules
# Kopiowanie tylko potrzebnych plików

COPY uploads uploads
COPY form-backups form-backups
# Pamiętaj, aby skopiować inne potrzebne pliki
# np. pliki statyczne, widoki, itp.
EXPOSE 5000
CMD ["node", "/app/dist/index.js"]
