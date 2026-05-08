# Резервное копирование Postgres

## Требования

- Доступ к контейнеру/хосту с `pg_dump`.
- Ключ GPG или возрастной пароль для шифрования файла дампа.
- Внешнее хранилище (S3-совместимое, другой сервер, облачный диск) — **не** только локальный диск VPS.

## Скрипт

См. `scripts/backup-postgres.sh` в корне репозитория. Переменные:

| Переменная | Описание |
|------------|----------|
| `BACKUP_DIR` | Куда писать временные/локальные файлы |
| `DATABASE_URL` или `PGHOST`/`PGUSER`/`PGPASSWORD`/`PGDATABASE` | Подключение к БД |
| `GPG_RECIPIENT` | ID ключа для `gpg --encrypt` |
| `RETENTION_DAYS` | Удалять локальные копии старше N дней |

Пример cron на хосте (не в контейнере без cron):

```cron
15 3 * * * /opt/vet-mvp/scripts/backup-postgres.sh >> /var/log/vet-pg-backup.log 2>&1
```

После шифрования загрузите `.sql.gpg` на внешний носитель (`rclone copy`, `aws s3 cp`, rsync over SSH).

## Тест восстановления (ежеквартально)

1. Скопируйте последний `.sql.gpg` на тестовую машину.
2. `gpg --decrypt backup.sql.gpg > backup.sql`
3. Поднимите пустой Postgres (`docker run -e POSTGRES_PASSWORD=test ...`).
4. `psql -f backup.sql` или `pg_restore` в зависимости от формата.
5. Проверьте количество таблиц и выборочные `SELECT count(*)`.

Зафиксируйте дату прогона в runbook команды.
