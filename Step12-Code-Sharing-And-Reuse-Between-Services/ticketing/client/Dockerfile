FROM node:alpine

WORKDIR /app
COPY package.json .
RUN npm config set registry https://registry.npmmirror.com/ && npm install --only=prod
COPY . .

CMD ["npm", "run", "dev"]