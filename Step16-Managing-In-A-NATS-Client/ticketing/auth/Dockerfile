FROM node:alpine

WORKDIR /app
COPY package.json .
RUN npm config set registry https://registry.npmmirror.com/ && npm update && npm install --only=prod
COPY . .

CMD ["npm", "start"]