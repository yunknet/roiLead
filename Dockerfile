FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

EXPOSE 4173

CMD ["sh", "-c", "npm run preview -- --port ${PORT:-4173} --host"]
