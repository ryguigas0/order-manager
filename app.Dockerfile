# Estágio de Build
FROM node:22.14.0-alpine as build

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

# Estágio de Produção
FROM node:22.14.0-alpine

WORKDIR /usr/src/app

# Instala o cliente do MongoDB e o curl
RUN apk update && apk add --no-cache mongodb-tools curl

COPY --from=build /usr/src/app/package*.json ./

RUN npm ci --only=production

COPY --from=build /usr/src/app/dist ./dist

# Copia e torna o script de entrypoint executável
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
