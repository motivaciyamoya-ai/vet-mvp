# Docker-сети: proxy + internal

## Топология

- Сеть **`proxy`** (external) — общая с Nginx Proxy Manager. В ней только контейнер **`web`** (статический фронт + встроенный nginx, проксирует `/api` и `/uploads` на backend).
- Сеть **`stack`** — внутренняя. В ней **`postgres`**, **`backend`**, **`ollama`**. Порты БД и API **не** пробрасываются на хост.

NPM должен проксировать на контейнер `web` (hostname `web` в сети `proxy`), а не напрямую на `backend:3000`.

## NPM

Создайте Proxy Host:

- **Forward hostname**: `web`
- **Forward port**: `80`
- **Websockets**: по необходимости

SSL — сертификаты Let's Encrypt в NPM.

## Переменные backend

В compose для backend задайте `TRUST_PROXY=1`, чтобы Nest корректно видел клиентский IP из `X-Forwarded-For`.
