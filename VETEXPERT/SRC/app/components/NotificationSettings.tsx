import { Bell, Smartphone, AlertCircle, Check, X } from "lucide-react";
import { useState, useEffect } from "react";
import {
  getNotificationStatus,
  requestNotificationPermission,
  subscribeToPushNotifications,
} from "../../utils/pushNotifications";

interface NotificationSettingsProps {
  onClose: () => void;
}

export default function NotificationSettings({ onClose }: NotificationSettingsProps) {
  const [status, setStatus] = useState(getNotificationStatus());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Обновляем статус при изменениях
    const interval = setInterval(() => {
      setStatus(getNotificationStatus());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleEnableNotifications = async () => {
    setLoading(true);

    try {
      const permission = await requestNotificationPermission();

      if (permission === 'granted') {
        // Пытаемся подписаться на push
        await subscribeToPushNotifications();
      }

      setStatus(getNotificationStatus());
    } catch (error) {
      console.error('Ошибка включения уведомлений:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = () => {
    if (status.permission === 'granted') {
      return <Check className="w-6 h-6 text-green-600" />;
    }
    if (status.permission === 'denied') {
      return <X className="w-6 h-6 text-red-600" />;
    }
    return <AlertCircle className="w-6 h-6 text-amber-600" />;
  };

  const getStatusColor = () => {
    if (status.permission === 'granted') return 'from-green-500 to-emerald-500';
    if (status.permission === 'denied') return 'from-red-500 to-pink-500';
    return 'from-amber-500 to-orange-500';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl">
        {/* Header */}
        <div className={`bg-gradient-to-r ${getStatusColor()} text-white p-6 rounded-t-2xl`}>
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <Bell className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-bold text-xl">Настройки уведомлений</h2>
                <p className="text-sm opacity-90">Экстренные оповещения</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Status */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                {getStatusIcon()}
              </div>
              <div>
                <div className="font-semibold text-gray-900">Текущий статус</div>
                <div className="text-sm text-gray-600">{status.message}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <div className="text-xs text-gray-600 mb-1">Браузер</div>
                <div className={`font-semibold ${status.supported ? 'text-green-600' : 'text-red-600'}`}>
                  {status.supported ? '✓ Поддерживается' : '✗ Не поддерживается'}
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <div className="text-xs text-gray-600 mb-1">Разрешение</div>
                <div className={`font-semibold ${
                  status.permission === 'granted'
                    ? 'text-green-600'
                    : status.permission === 'denied'
                    ? 'text-red-600'
                    : 'text-amber-600'
                }`}>
                  {status.permission === 'granted' ? '✓ Разрешено' :
                   status.permission === 'denied' ? '✗ Заблокировано' : '⚠ Не задано'}
                </div>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <Smartphone className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-1">Как работают уведомления</p>
                <ul className="space-y-1 text-xs">
                  <li>• <strong>Браузерные:</strong> Работают когда приложение открыто</li>
                  <li>• <strong>Push-уведомления:</strong> Требуется сервис отправки уведомлений (например, FCM/APNS)</li>
                  <li>• <strong>Мобильные:</strong> Нужно установить как PWA приложение</li>
                </ul>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-900">
                <p className="font-semibold mb-1">Для реальных push-уведомлений на телефон:</p>
                <ul className="space-y-1 text-xs">
                  <li>1. Требуется настройка Firebase Cloud Messaging (FCM)</li>
                  <li>2. Серверная часть для отправки уведомлений</li>
                  <li>3. Service Worker для фоновой работы</li>
                  <li>4. HTTPS соединение (обязательно)</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Button */}
          {status.permission !== 'granted' && status.supported && (
            <button
              onClick={handleEnableNotifications}
              disabled={loading || status.permission === 'denied'}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3 rounded-xl font-bold hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Bell className="w-5 h-5" />
              {loading ? 'Включение...' : 'Включить уведомления'}
            </button>
          )}

          {status.permission === 'denied' && (
            <div className="text-center text-sm text-gray-600 bg-gray-50 rounded-lg p-4">
              <p className="font-semibold mb-2">Уведомления заблокированы</p>
              <p>Разрешите уведомления в настройках браузера:</p>
              <p className="mt-2 text-xs">
                Настройки → Конфиденциальность → Уведомления → VetConnect
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
