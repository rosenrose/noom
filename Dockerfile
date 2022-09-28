FROM node:16-slim

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --only=production

COPY . ./

CMD [ "babel-node", "src/server.js" ]
