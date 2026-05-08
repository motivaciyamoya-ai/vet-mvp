# VPS hardening (без Cloudflare)

Пошаговый чек-лист для продакшн-сервера с Docker Compose и Nginx Proxy Manager (NPM).

## 1. SSH

1. Создайте отдельного пользователя с `sudo`, войдите под ним.
2. Скопируйте публичные ключи в `~/.ssh/authorized_keys`.
3. В `/etc/ssh/sshd_config` (или `sshd_config.d/*.conf`):
   - `PasswordAuthentication no`
   - `KbdInteractiveAuthentication no`
   - `PermitRootLogin no`
   - `AllowUsers ваш_пользователь`
   - `Port 22222` (или другой нестандартный порт)
4. `sudo systemctl reload sshd` — **не закрывайте текущую сессию**, пока не проверили новый порт во втором окне.

## 2. UFW / firewall

Разрешите только то, что нужно снаружи:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22222/tcp   # ваш SSH-порт
sudo ufw enable
sudo ufw status verbose
```

Проверка с другой машины: `nmap -Pn <ip>` — видны только 80/443/SSH.

## 3. Закрыть Docker-порты наружу

В `docker-compose.yml` **не** публикуйте `5432` (Postgres) и `3000` (API). См. `docs/DOCKER-NETWORKS.md`. Снаружи должен быть только reverse-proxy (NPM) на 80/443.

## 4. Доступ по IP (default vhost)

В NPM создайте **Default host** / catch-all для запросов по IP или неизвестному `Host`:

- Ответ `444` (закрыть соединение) или `403`.
- Убедитесь: `curl -v http://<server-ip>` не отдаёт ваш сайт.

## 5. fail2ban

Примеры jail см. `docs/fail2ban/` (адаптируйте пути логов под вашу ОС и NPM).

```bash
sudo apt install fail2ban
sudo systemctl enable --now fail2ban
```

Для email-уведомлений о банах задайте `destemail` и `sender` в `jail.local` и включите `action_mwl`.

## 6. Автообновления

```bash
sudo apt install unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

Перезагрузки по расписанию (по желанию): `apt-listchanges` + окно обслуживания.

## 7. Периодический аудит

- `lynis audit system` (по желанию)
- Раз в квартал: тест восстановления БД (`docs/POSTGRES-BACKUPS.md`).
