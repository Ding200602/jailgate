FROM node:22-alpine

WORKDIR /app

COPY package.json tsconfig.json ./
RUN npm install --omit=dev

COPY src ./src
COPY config.json ./config.json
COPY recipes ./recipes

RUN npx tsc

EXPOSE 8788

CMD ["node", "dist/index.js"]
