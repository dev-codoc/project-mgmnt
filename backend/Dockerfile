FROM node:20-alpine

WORKDIR /app

COPY backend/ .

RUN npm install --only=production

EXPOSE 10000

CMD ["node", "src/server.js"]
