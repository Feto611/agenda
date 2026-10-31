FROM node:22-alpine AS assets
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY vite.config.ts tsconfig.json ./
COPY resources ./resources
RUN npm run build

FROM php:8.3-fpm-alpine AS app
RUN apk add --no-cache libpq oniguruma libzip icu-libs libcurl \
 && apk add --no-cache --virtual .build-deps $PHPIZE_DEPS postgresql-dev oniguruma-dev libzip-dev icu-dev curl-dev \
 && docker-php-ext-install pdo_pgsql mbstring zip intl bcmath opcache pcntl curl \
 && apk del .build-deps
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
WORKDIR /var/www/html
RUN printf "upload_max_filesize=5M\npost_max_size=6M\n" > /usr/local/etc/php/conf.d/uploads.ini
COPY . .
RUN composer install --no-dev --no-scripts --prefer-dist --no-interaction --optimize-autoloader \
 && php artisan package:discover --ansi
COPY --from=assets /app/public/build ./public/build
RUN mkdir -p storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
 && chown -R www-data:www-data storage bootstrap/cache
USER www-data
EXPOSE 9000
CMD ["php-fpm"]

FROM nginx:1.28-alpine AS web
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY public /var/www/html/public
COPY --from=assets /app/public/build /var/www/html/public/build

FROM web AS owner-web
COPY deploy/nginx-owner.conf /etc/nginx/conf.d/default.conf
