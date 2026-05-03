# VetPro CIS — Backend API

NestJS + Prisma + PostgreSQL.

## Эндпоинты (префикс `/api`)

| Метод | Путь | Описание |
|--------|------|----------|
| POST | `/auth/register` | Регистрация + профиль |
| POST | `/auth/login` | Вход |
| POST | `/auth/refresh` | Обновление access-токена |
| POST | `/auth/logout` | Удаление refresh-токена |
| GET | `/users/me` | Профиль (Bearer) |
| PATCH | `/users/me` | Обновление профиля (Bearer) |
| GET | `/reference/countries` | Страны |
| GET | `/reference/job-titles` | Должности |
| GET | `/forum/categories` | Категории форума |
| GET | `/forum/categories/:slug/threads` | Темы в категории |
| GET | `/forum/threads/:id` | Тема с постами |
| GET | `/forum/search?q=` | Поиск тем |
| POST | `/forum/threads` | Создать тему (Bearer) |
| POST | `/forum/threads/:id/posts` | Ответ в теме (Bearer) |
| GET | `/articles/categories` | Рубрики статей |
| GET | `/articles` | Список статей (`q`, `categorySlug`) |
| GET | `/articles/:id` | Статья |
| POST | `/articles` | Создать статью (Bearer, ADMIN/MODERATOR) |
| POST | `/reports` | Жалоба (Bearer) |
| GET | `/reports` | Очередь жалоб (Bearer, MODERATOR/ADMIN) |
| PATCH | `/reports/:id` | Статус жалобы (Bearer, MODERATOR/ADMIN) |
| GET | `/listings` | Объявления (`type`, пагинация) |
| GET | `/listings/:id` | Деталь + сообщения |
| POST | `/listings` | Создать (Bearer) |
| POST | `/listings/:id/messages` | Сообщение по объявлению (Bearer) |
| POST | `/calculators/dose-by-weight` | Расчёт дозы |
| POST | `/calculators/infusion-rate` | Скорость инфузии |
| GET | `/sos/active` | Активные SOS |
| POST | `/sos` | Создать SOS (Bearer) |
| PATCH | `/sos/:id` | Статус SOS (Bearer) |
| POST | `/push/register` | Сохранить FCM-токен (Bearer) |
| GET | `/health` | Health-check |

Swagger: `/api/docs`

## Демо-пользователи (после `npm run seed`)

Пароль у всех: **`Demo123!`**. После сида `vet@vetmvp.local` получает роль **ADMIN** (удобно для админ-панели); отдельный **`specialist@vetmvp.local`** — **SPECIALIST**.

- `vet@vetmvp.local` — основной демо + **ADMIN**
- `specialist@vetmvp.local` — **SPECIALIST**
- `moderator@vetmvp.local` — модератор
- `admin@vetmvp.local` — админ (дублирующий демо-аккаунт)
