# VetPro CIS — MVP

Монорепозиторий: **документация**, **backend (NestJS + Prisma)**, **mobile (Flutter)**.

## Структура

```
vet-mvp/
  docs/           PRD, UX, QA чеклисты
  backend/        REST API (NestJS + Prisma → PostgreSQL)
  mobile/         Flutter приложение
  VETEXPERT/      веб-клиент (Vite + React) — данные через тот же API
```

### VETEXPERT (веб) и база

Браузер не подключается к PostgreSQL напрямую: веб использует **тот же REST API**, что и mobile, а NestJS работает с БД через Prisma.

1. Поднимите PostgreSQL и (при необходимости) Redis: в каталоге `backend` выполните `docker compose up -d`.
2. Создайте `backend/.env` из `backend/.env.example`, примените миграции и сид: `npx prisma migrate dev`, `npm run seed`.
3. Запустите API: `npm run start:dev` (порт `3000`, Swagger: `http://localhost:3000/api/docs`).
4. В другом терминале: `cd VETEXPERT`, при необходимости `cp .env.example .env`, затем `npm run dev`.  
   В режиме разработки Vite **проксирует** запросы с пути `/api` на `http://localhost:3000` (см. `VETEXPERT/vite.config.ts`).

После `npm run seed` (из папки `backend`) пароль у всех демо-аккаунтов: **`Demo123!`**.

- **`vet@vetmvp.local`** — основной демо-вход; после сида роль **ADMIN** (в том числе доступ к админ-панели на `/admin`).
- **`specialist@vetmvp.local`** — роль **SPECIALIST** (проверка сценариев без прав админа).
- **`admin@vetmvp.local`**, **`moderator@vetmvp.local`** — отдельные демо-роли.

**Админ-панель (веб):** `http://localhost:5173/admin` или пункт «Админ» в шапке после входа под **ADMIN** (например `vet@…` или `admin@…`). API: `GET/PATCH/DELETE /api/admin/*` (JWT с ролью `ADMIN`).

## Быстрый старт

### Backend

```bash
cd backend
cp .env.example .env
docker compose up -d
npm install
npx prisma migrate dev
npm run seed
npm run start:dev
```

API: `http://localhost:3000/api`  
Swagger: `http://localhost:3000/api/docs`

### Mobile

```bash
cd mobile
flutter pub get
flutter run
```

Укажите URL API в `lib/core/config.dart` (по умолчанию Android emulator: `10.0.2.2:3000`).

## Документы

- [PRD](docs/PRD-MVP.md)
- [UX экраны](docs/UX-SCREENS.md)
- [Wireframes (HTML)](docs/UX-WIREFRAMES.html)
- [QA / релиз](docs/QA-BETA-LAUNCH.md)
- [Деплой](docs/DEPLOYMENT.md)
