FROM node:alpine

WORKDIR /usr/app
COPY database /usr/app/database
COPY listeners /usr/app/listeners
COPY app.js /usr/app/
COPY package.json /usr/app/
COPY package-lock.json /usr/app/

RUN npm install

CMD ["npm", "start"]