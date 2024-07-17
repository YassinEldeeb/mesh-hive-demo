FROM node:22.4.1-slim

WORKDIR /app
COPY . /app

RUN apt-get update && apt-get install -y curl
RUN npm install

CMD ["npm", "start"]