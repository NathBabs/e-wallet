FROM node:16.3.0-alpine AS builder

WORKDIR /app

RUN apk add --update openssl

# remove build folder if it exists
RUN rm -rf /build

# copy package.json and package-lock.json to workdir
COPY package*.json ./

COPY ./prisma prisma

# install dependencies
RUN npm ci

# copy remaining files
COPY . .

# run prisma migrations
RUN npx prisma generate

RUN npx tsc

FROM node:16.3.0-alpine AS server

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY --from=builder ./app/build ./build
COPY --from=builder ./app/prisma ./prisma

EXPOSE 3200

CMD ["npm", "run", "start:prod"]