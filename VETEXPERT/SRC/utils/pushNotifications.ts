// Утилиты для работы с push-уведомлениями

/**
 * Проверяет поддержку push-уведомлений
 */
export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/**
 * Запрашивает разрешение на уведомления
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('Браузер не поддерживает уведомления');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return Notification.permission;
}

/**
 * Регистрирует Service Worker (для реальных push-уведомлений нужна серверная отправка, например через FCM)
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker не поддерживается');
    return null;
  }

  try {
    // В production здесь был бы реальный service worker
    console.log('Service Worker регистрация (demo mode)');
    return null;
  } catch (error) {
    console.error('Ошибка регистрации Service Worker:', error);
    return null;
  }
}

/**
 * Подписывается на push-уведомления
 * ВАЖНО: для реальной работы нужен сервис отправки (например Firebase Cloud Messaging / аналоги)
 */
export async function subscribeToPushNotifications(): Promise<PushSubscription | null> {
  if (!isPushSupported()) {
    console.warn('Push-уведомления не поддерживаются');
    return null;
  }

  try {
    const permission = await requestNotificationPermission();

    if (permission !== 'granted') {
      console.log('Разрешение на уведомления не получено');
      return null;
    }

    const registration = await registerServiceWorker();

    if (!registration) {
      console.log('Service Worker не зарегистрирован (нужна полноценная конфигурация push)');
      return null;
    }

    // В реальном приложении здесь была бы подписка на push
    // const subscription = await registration.pushManager.subscribe({
    //   userVisibleOnly: true,
    //   applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
    // });

    // Отправка subscription на API
    // await fetch('/api/push-subscribe', {
    //   method: 'POST',
    //   body: JSON.stringify(subscription),
    //   headers: { 'Content-Type': 'application/json' }
    // });

    console.log('Push подписка (demo mode - для реальных уведомлений нужна серверная отправка)');
    return null;
  } catch (error) {
    console.error('Ошибка подписки на push:', error);
    return null;
  }
}

/**
 * Отправляет локальное уведомление (работает только когда приложение открыто)
 */
export function sendLocalNotification(
  title: string,
  options: NotificationOptions = {}
): void {
  if (!('Notification' in window)) {
    console.warn('Уведомления не поддерживаются');
    return;
  }

  if (Notification.permission === 'granted') {
    new Notification(title, {
      icon: '/logo.png',
      badge: '/logo.png',
      ...options,
    });
  }
}

/**
 * Информация о статусе уведомлений
 */
export function getNotificationStatus(): {
  supported: boolean;
  permission: NotificationPermission;
  pushSupported: boolean;
  message: string;
} {
  const supported = 'Notification' in window;
  const permission = supported ? Notification.permission : 'denied';
  const pushSupported = isPushSupported();

  let message = '';

  if (!supported) {
    message = 'Ваш браузер не поддерживает уведомления';
  } else if (permission === 'denied') {
    message = 'Уведомления заблокированы. Разрешите их в настройках браузера';
  } else if (permission === 'default') {
    message = 'Разрешите уведомления для получения экстренных оповещений';
  } else if (permission === 'granted' && !pushSupported) {
    message = 'Уведомления включены (только когда приложение открыто)';
  } else if (permission === 'granted' && pushSupported) {
    message = 'Уведомления включены. Для push-уведомлений требуется настройка сервера';
  }

  return {
    supported,
    permission,
    pushSupported,
    message,
  };
}
