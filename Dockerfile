FROM node:12.22.7 as build-stage
WORKDIR /usr/src/app
ENV PATH /usr/src/app/node_modules/.bin:$PATH
COPY . .
RUN npm install --silent
RUN npm run build --production

FROM nginx:1.21.6-alpine

COPY --from=build-stage /usr/src/app/build/ /var/www
COPY --from=build-stage /usr/src/app/nginx.conf /etc/nginx/nginx.conf

# production environment
EXPOSE 80
ENTRYPOINT ["nginx","-g","daemon off;"]