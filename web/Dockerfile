FROM node:24-alpine AS development
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
EXPOSE 4200
CMD ["npm", "run", "start:dev", "--", "--host", "0.0.0.0", "--port", "4200", "--configuration", "development", "--poll", "1000"]

FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine AS production
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/web/browser /usr/share/nginx/html
EXPOSE 80
