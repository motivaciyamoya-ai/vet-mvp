/** Демонстрационные статьи (главная + раздел «Статьи»), если API недоступен или id числовой. */

export type DemoArticle = {
  id: number;
  title: string;
  excerpt: string;
  /** Полный текст-заглушка для карточки детальной страницы */
  body: string;
  author: string;
  date: string;
  readTime: string;
  category: string;
  image: string;
  originalLang: string;
  location?: string;
};

/** Первые 4 — список на /articles; 5–8 — блок «Новые статьи» на главной. Порядок сохранён. */
export const DEMO_ARTICLES: DemoArticle[] = [
  {
    id: 1,
    title: "Современные методы диагностики заболеваний сердца у кошек",
    author: "Виктория Смирнова",
    location: "Москва, Россия",
    date: "15 апреля 2026",
    readTime: "12 мин",
    category: "Кардиология",
    image: "https://images.unsplash.com/photo-1574158622682-e40e69881006?w=800&h=400&fit=crop",
    excerpt:
      "Комплексный обзор современных диагностических методов, включая ЭКГ, эхокардиографию и биомаркеры...",
    body:
      "В клинической практике кардиология кошек опирается на сочетание анамнеза, физического осмотра и объективной визуализации. Эхокардиография остаётся ключевым методом оценки морфологии и гемодинамики; ЭКГ и биомаркеры дополняют картину, особенно при подозрении на аритмии и хроническую недостаточность.\n\nМатериал носит обучающий характер. Любое назначение выполняется врачом с учётом индивидуального пациента, сопутствующей патологии и локальных протоколов.",
    originalLang: "ru",
  },
  {
    id: 2,
    title: "Протоколы анестезии для пожилых животных",
    author: "Александр Новиков",
    location: "Санкт-Петербург, Россия",
    date: "12 апреля 2026",
    readTime: "15 мин",
    category: "Анестезиология",
    image: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&h=400&fit=crop",
    excerpt:
      "Особенности подбора анестезии с учетом возрастных изменений и сопутствующих заболеваний...",
    body:
      "У пожилых пациентов снижаются функциональный резерв органов и меняется фармакокинетика препаратов. В обзоре обсуждаются подходы к премедикации, выбору ингаляционной и парентеральной анестезии, мониторингу и раннему обезболиванию в послеоперационном периоде.\n\nТекст не заменяет клинический протокол вашей клиники и официальные регистрационные данные препаратов.",
    originalLang: "ru",
  },
  {
    id: 3,
    title: "Питание рептилий в домашних условиях: научный подход",
    author: "Ольга Кузнецова",
    location: "Киев, Украина",
    date: "10 апреля 2026",
    readTime: "8 мин",
    category: "Экзотические животные",
    image: "https://images.unsplash.com/photo-1612363148951-15f16817648f?w=800&h=400&fit=crop",
    excerpt:
      "Детальний аналіз потреб у харчуванні різних видів рептилій з урахуванням останніх досліджень...",
    body:
      "Рептилии сильно различаются по тепловым градиентам, UVB, влажности и составу рациона; универсального «меню» не существует. В материале кратко структурированы группы пациентов и типичные ошибки содержания, влияющие на метаболизм кальция и иммунитет.\n\nПри любых симптомах нужна очная диагностика — статья не является рекомендацией по лечению.",
    originalLang: "uk",
  },
  {
    id: 4,
    title: "Дерматология собак: дифференциальная диагностика зуда",
    author: "Игорь Волков",
    location: "Минск, Беларусь",
    date: "8 апреля 2026",
    readTime: "10 мин",
    category: "Дерматология",
    image: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&h=400&fit=crop",
    excerpt: "Пошаговый алгоритм диагностики при жалобах на зуд у собак различных пород...",
    body:
      "Зуд — маркёрный симптом: паразитарная, аллергическая, инфекционная и эндокринная природа исключается системно. Последовательность сбора анамнеза, базовые тесты и моменты, когда нужен биопсийный материал, помогают избежать длительного «перебора» терапий.\n\nИнформация образовательная; заключение ставит врач после осмотра.",
    originalLang: "ru",
  },
  {
    id: 5,
    title: "Эндоскопическая диагностика заболеваний ЖКТ у собак",
    author: "Павел Соловьев",
    date: "1 мая 2026",
    readTime: "9 мин",
    category: "Диагностика",
    image: "https://images.unsplash.com/photo-1628407819300-37f37a2cd4b3?w=800&h=400&fit=crop",
    excerpt:
      "Современные методы эндоскопии позволяют точно диагностировать патологии желудочно-кишечного тракта без инвазивных вмешательств...",
    body:
      "Эндоскопия даёт прямую визуализацию слизистой, возможность биопсии и интервенций в отдельных случаях. Перечислены показания для исследования верхних и нижних отделов ЖКТ, подготовка пациента и типичная интерпретация находок совместно с гистологией.\n\nТехника и доступность оборудования зависят от клиники; материал обобщённый.",
    originalLang: "ru",
  },
  {
    id: 6,
    title: "Feline Hyperthyroidism: Latest Treatment Protocols",
    author: "Dr. Sarah Mitchell",
    date: "April 30, 2026",
    readTime: "11 min",
    category: "Эндокринология",
    image: "https://images.unsplash.com/photo-1606214174585-fe31582dc6ee?w=800&h=400&fit=crop",
    excerpt:
      "Comprehensive review of radioactive iodine therapy, medication management, and surgical options for treating hyperthyroidism in senior cats...",
    body:
      "Hyperthyroidism in cats remains among the common endocrine diseases in ageing patients. Contemporary approaches balance control of thyrotoxicosis, renal risk, cardiovascular status, and quality of life. This summary outlines typical monitoring intervals and escalation paths without endorsing any specific jurisdiction’s drug labels.\n\nAlways align treatment with licensing, local pharmacy law, and the individual patient.",
    originalLang: "en",
  },
  {
    id: 7,
    title: "Ортопедия птиц: переломы крыльев и их лечение",
    author: "Наталья Федорова",
    date: "29 апреля 2026",
    readTime: "13 мин",
    category: "Ортопедия",
    image: "https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=800&h=400&fit=crop",
    excerpt:
      "Анатомические особенности костей птиц, методы фиксации переломов, период реабилитации и прогноз восстановления функций...",
    body:
      "Кости птиц деминерализированы быстрее при ограниченном движении и дефиците UV/кальция. Обсуждаются внешняя фиксация, мягкие повязки, анальгезия и критерии готовности к подпуску к полёту. Реабилитация поэтапная, с контролем весовой нагрузки.\n\nСложные переломы и инфекции требуют стационара.",
    originalLang: "ru",
  },
  {
    id: 8,
    title: "Oncología veterinaria: avances en inmunoterapia",
    author: "Dr. Carlos Méndez",
    date: "28 de abril de 2026",
    readTime: "14 min",
    category: "Онкология",
    image: "https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=800&h=400&fit=crop",
    excerpt:
      "Los últimos desarrollos en tratamientos inmunológicos para el cáncer en animales de compañía, incluyendo inhibidores de puntos de control...",
    body:
      "La inmunooncología en medicina veterinaria evoluciona con transferencia desde modelos humanos, pero los ensayos específicos por especie aún son limitados. Este texto sintetiza marcos conceptuales, selección de candidatos y vigilancia de eventos adversos.\n\nNo sustituye el consentimiento informado ni la normativa nacional sobre medicamentos oncólógicos.",
    originalLang: "es",
  },
];

export function getDemoArticleByIdParam(idParam: string | undefined): DemoArticle | undefined {
  if (idParam == null || idParam.trim() === "") return undefined;
  if (!/^\d+$/.test(idParam.trim())) return undefined;
  const id = Number(idParam);
  return DEMO_ARTICLES.find((a) => a.id === id);
}

export const DEMO_ARTICLES_ARTICLES_PAGE = DEMO_ARTICLES.slice(0, 4);
export const DEMO_ARTICLES_HOME_RECENT = DEMO_ARTICLES.slice(4, 8);
