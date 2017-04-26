FROM node:alpine

ARG TELEGRAM_TOKEN
ENV TELEGRAM_TOKEN=${TELEGRAM_TOKEN}
ARG TELEGRAM_CHATID
ENV TELEGRAM_CHATID=${TELEGRAM_CHATID}
ARG DISCORD_TOKEN
ENV DISCORD_TOKEN=${DISCORD_TOKEN}
ARG DISCORD_CHANNELID
ENV DISCORD_CHANNELID=${DISCORD_CHANNELID}
ARG DISCORD_SERVERID
ENV DISCORD_SERVERID=${DISCORD_SERVERID}


RUN mkdir -p /usr/src/app


ENV PATH /data/node_modules/.bin:$PATH

# copy in our source code last, as it changes the most
WORKDIR /usr/src/app

COPY . /usr/src/app

RUN npm install && npm cache clean
COPY example.settings.json /usr/src/app/settings.json

CMD [ "npm", "start" ]