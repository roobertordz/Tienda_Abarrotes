FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache openssl openssl-dev
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build
EXPOSE 3001
COPY start.sh .
RUN chmod +x start.sh
CMD ["./start.sh"]
