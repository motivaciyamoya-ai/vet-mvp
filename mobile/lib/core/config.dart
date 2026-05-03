/// Базовый URL API без завершающего слэша.
/// Android emulator → хост-машина: 10.0.2.2
/// iOS simulator → localhost
/// Реальное устройство → IP вашего ПК в LAN
const String kApiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://10.0.2.2:3000/api',
);
