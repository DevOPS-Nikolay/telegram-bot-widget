FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm config set legacy-peer-deps true && npm install --include=dev --silent --package-lock=false --ignore-scripts

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "start"]
