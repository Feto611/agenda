#!/usr/bin/env bash
# First install or upgrade. Secrets are created on the host, never during image build.
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
umask 077
if [[ $# -gt 1 || ( $# -eq 1 && "$1" != '--prepare-only' ) ]]; then
    echo 'Opción no válida. Usa bash install.sh o bash install.sh --prepare-only.' >&2
    exit 1
fi
if ! command -v docker >/dev/null 2>&1 || ! docker compose version >/dev/null 2>&1; then
    echo 'Necesitas Docker con Docker Compose para instalar la plataforma.' >&2
    exit 1
fi
# Prevent simultaneous migrations or recreations from two installer invocations.
if ! command -v flock >/dev/null 2>&1; then
    echo 'Instala util-linux (flock) antes de continuar.' >&2
    exit 1
fi
exec 9>.install.lock
if ! flock -n 9; then echo 'Ya hay otra instalación en curso en esta carpeta.' >&2; exit 1; fi
if command -v php >/dev/null 2>&1 && php -r 'exit(PHP_VERSION_ID >= 80300 ? 0 : 1);'; then
    php scripts/prepare-env.php
else
    docker run --rm --user "$(id -u):$(id -g)" \
        --mount "type=bind,src=$PWD,dst=/setup" --workdir /setup \
        --entrypoint php php:8.3-cli-alpine scripts/prepare-env.php
fi
# Compose and all application processes must use the same persisted file values.
unset APP_KEY REVERB_APP_KEY REVERB_APP_SECRET DB_PASSWORD DB_DATABASE DB_USERNAME
if [[ "${1:-}" == '--prepare-only' ]]; then
    echo 'Archivo .env preparado. Puedes revisar dominios y puertos antes de instalar.'
    exit 0
fi
docker compose build
docker compose up -d --wait db
docker compose run --rm --no-deps app php artisan migrate --force
docker compose up -d --force-recreate
docker compose exec -T app php artisan optimize:clear
docker compose exec -T app-owner php artisan optimize:clear
docker compose ps
echo 'Instalación terminada. Revisa los dominios de CUSTOMER_URL y OWNER_URL en .env y recarga el navegador.'
