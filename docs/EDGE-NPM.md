# Edge: NPM / OpenResty (без Cloudflare)

Рекомендуемые настройки на уровне **Advanced → Custom Nginx Configuration** для вашего Proxy Host (или глобального сниппета).

## Security headers

```nginx
# Добавьте в server { } блока прокси-хоста
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
# Базовая CSP — при необходимости ослабьте под ваши внешние скрипты
add_header Content-Security-Policy "default-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'" always;
```

## Таймауты (Slowloris / зависшие клиенты)

```nginx
proxy_connect_timeout 10s;
proxy_send_timeout 60s;
proxy_read_timeout 60s;
send_timeout 60s;
client_body_timeout 20s;
client_header_timeout 10s;
```

## Лимит тела запроса

Для загрузок изображений (аватар, форум, маркетплейс):

```nginx
client_max_body_size 12m;
```

## Rate limit (пример)

В **http** контексте (часто через «Custom Nginx Configuration» глобально в NPM — зависит от сборки):

```nginx
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/m;
limit_req_zone $binary_remote_addr zone=api_heavy:10m rate=30r/m;
```

В `server` для локаций:

```nginx
location ^~ /api/auth/login {
  limit_req zone=auth_limit burst=5 nodelay;
  proxy_pass http://...;
}

location ^~ /api/auth/register {
  limit_req zone=auth_limit burst=3 nodelay;
  proxy_pass http://...;
}

location ^~ /api/reports {
  limit_req zone=api_heavy burst=20 nodelay;
  proxy_pass http://...;
}
```

Адаптируйте `proxy_pass` под ваш upstream (`web:80`).

## Запрет служебных путей

```nginx
location ~* /\.(env|git) {
  return 403;
}
location ~* \.(sql|log)$ {
  return 403;
}
location ^~ /backup/ {
  return 403;
}
```

## IP / default host

Отдельный **Default** catch-all server: `listen 80 default_server;` → `return 444;` или `403`.
