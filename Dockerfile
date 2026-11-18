FROM node:16.20.2 as build-stage
WORKDIR /usr/src/app
ENV PATH /usr/src/app/node_modules/.bin:$PATH
COPY . .
RUN npm install --legacy-peer-deps
# Which commit is being built, written to version.json by scripts/generate-version.js
# (SCRUM-6878). GIT_SHA wins when passed; otherwise the script asks git, which is why .git
# is no longer in .dockerignore. Only build/ reaches the final image, so .git does not.
ARG GIT_SHA=
ENV GIT_SHA=${GIT_SHA}
RUN npm run build --production

FROM nginx:1.21.6-alpine

COPY --from=build-stage /usr/src/app/build/ /var/www
COPY --from=build-stage /usr/src/app/nginx.conf /etc/nginx/nginx.conf

# production environment
EXPOSE 80
ENTRYPOINT ["nginx","-g","daemon off;"]