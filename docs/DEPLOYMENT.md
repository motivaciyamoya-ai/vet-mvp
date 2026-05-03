## Deployment (production)

### Вариант A — Docker Compose (рекомендовано для VPS)

Требования:
- Docker + Docker Compose
- домен (опционально) и HTTPS (через reverse proxy / Cloudflare)

Команды:

```bash
git clone <repo>
cd vet-mvp

# Пример: backend переменные окружения (см backend/.env.example)
# Важно: для продакшна заполните JWT/SMTP/и т.п.
cp backend/.env.example backend/.env

# Применить миграции в БД (один раз)
docker compose up -d postgres
docker compose run --rm backend npx prisma migrate deploy
docker compose run --rm backend npm run seed

# Запуск всех сервисов
docker compose up -d --build
```

После запуска:
- Web: `http://<server>:8080`
- API: `http://<server>:3000/api`
- Swagger: `http://<server>:3000/api/docs`

### Вариант B — без Docker

Подходит если вы разворачиваете Node.js + Nginx вручную.

- Backend: `npm ci`, `npm run build`, запуск `node dist/main.js` (process manager: systemd/pm2)
- Frontend: `npm ci`, `npm run build`, статика `dist/` на Nginx
- Nginx: проксировать `/api` и `/uploads` на backend, а остальные пути отдавать `index.html` (SPA).

