FROM node:22.14.0-alpine as build

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

FROM node:22.14.0-alpine

WORKDIR /usr/src/app

COPY --from=build /usr/src/app/package*.json ./

RUN npm ci --only=production

COPY --from=build /usr/src/app/dist ./dist

COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
