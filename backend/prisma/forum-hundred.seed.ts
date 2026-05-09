import type { PrismaClient } from '@prisma/client';
import { UserRole, VerificationStatus } from '@prisma/client';

/** Клинические разделы (без «Правила») — 10 × 10 = 100 тем. */
const TARGET_SLUGS = [
  'therapy',
  'surgery',
  'diagnostics',
  'pharmacy',
  'dental',
  'dermatology',
  'ophthalmology',
  'cardiology',
  'icu-emergency',
  'nutrition',
] as const;

type TargetSlug = (typeof TARGET_SLUGS)[number];

const SLUG_LABEL: Record<TargetSlug, string> = {
  therapy: 'общей терапии',
  surgery: 'хирургии и послеоперационного ведения',
  diagnostics: 'диагностики (анализы, визуализация)',
  pharmacy: 'аптеки и дозировок',
  dental: 'ветеринарной стоматологии',
  dermatology: 'дерматологии мелких животных',
  ophthalmology: 'офтальмологии',
  cardiology: 'кардиологии',
  'icu-emergency': 'неотложной помощи и ICU',
  nutrition: 'рационов и клинического питания',
};

const CITIES = [
  'Казань',
  'Новосибирск',
  'Минск',
  'Алматы',
  'Ташкент',
  'Екатеринбург',
  'Краснодар',
  'Ростов-на-Дону',
  'Самара',
  'Уфа',
];

const SPECIES = [
  'собаки мелкой породы',
  'кошки старше 10 лет',
  'молодой кошки 2–3 лет',
  'собаки крупной породы',
  'кролика декоративного',
  'хорька',
  'попугая',
  'кошки с избыточной массой тела',
  'собаки спортивного направления',
  'пожилой собаки',
];

const NAMES = [
  'Анна',
  'Дмитрий',
  'Елена',
  'Игорь',
  'Ксения',
  'Максим',
  'Наталья',
  'Олег',
  'Павел',
  'Светлана',
  'Тимур',
  'Юлия',
  'Виктор',
  'Алина',
  'Сергей',
  'Марина',
  'Андрей',
  'Екатерина',
  'Роман',
  'Людмила',
  'Георгий',
  'Ирина',
  'Константин',
  'Оксана',
  'Владимир',
  'Татьяна',
  'Николай',
  'Дарья',
  'Алексей',
  'Полина',
];

function idx(i: number, mod: number): number {
  return ((i % mod) + mod) % mod;
}

function buildTitle(slug: TargetSlug, globalIndex: number): string {
  const lab = SLUG_LABEL[slug];
  const sp = SPECIES[idx(globalIndex, SPECIES.length)];
  const city = CITIES[idx(globalIndex + 3, CITIES.length)];
  const hooks = [
    `Ветеринарный кейс: ${sp} — сложности врача ${lab} (клиника, г. ${city})`,
    `Практический разбор для ветспециалиста: ${sp} и вопросы ${lab}`,
    `Форум коллег: ${sp} — что учесть в работе ${lab}? Опыт из г. ${city}`,
    `Клиническое обсуждение: ${sp}, ${lab}, реальная ситуация (г. ${city})`,
    `Коллеги, подскажите по ${lab}: пациент ${sp}, клиника в г. ${city}`,
    `Долго не можем выстроить протокол: ${sp}, направление «${lab}»`,
    `Совет ветеринару: ${sp} — нюансы ${lab} после приёма в г. ${city}`,
    `Обмен опытом VetConnect: ${sp} и типичные ошибки в ${lab}`,
    `Сложный случай для форума: ${sp}, фокус на ${lab}`,
    `Вопрос из практики (г. ${city}): ${sp} и тактика в ${lab}`,
  ];
  return hooks[idx(globalIndex, hooks.length)];
}

function buildOpener(slug: TargetSlug, globalIndex: number): string {
  const lab = SLUG_LABEL[slug];
  const sp = SPECIES[idx(globalIndex, SPECIES.length)];
  const city = CITIES[idx(globalIndex + 1, CITIES.length)];
  const w = 2 + idx(globalIndex, 5);
  const intro =
    `Здравствуйте, коллеги. Пишу из частной клиники (г. ${city}). Пациент: ${sp}. ` +
    `Тема раздела — ${lab}. Симптомы и анамнез обезличены, но клиническая логика сохранена. ` +
    `Ведём пациента около ${w} недель, владелец дисциплинирован, но динамика неоднозначная.\n\n`;

  const diet = ['мягком влажном', 'сухом премиальном', 'смешанном', 'лечебном гастро-рационе'][idx(globalIndex, 4)];
  const tail =
    `\n\nДополнительный контекст (кейс №${globalIndex + 1}): масса тела оценочно ${3 + idx(globalIndex, 25)} кг, ` +
    `рацион — ${diet}; сопутствующая терапия от других специалистов либо отсутствует, либо отражена в карте и не менялась последние две недели. ` +
    `Владелец готов к обследованиям и соблюдению рекомендаций, просит понятный план на ближайшие 7–14 дней.`;

  const blocks: Record<TargetSlug, string> = {
    therapy: `На приёме отмечаем колебания аппетита, эпизодическую вялость и периодическое повышение температуры тела без явного очага инфекции. Общий анализ крови с лейкоцитозом умеренным, биохимия в пределах референса, кроме лёгкого снижения альбумина. УЗИ брюшной полости без выраженной свободной жидкости, но с гипомотильностью кишечника. Не хочется «ломать» пациента антибиотиками без цели, с другой стороны — нельзя упустить субклиническую сепсию.\n\nПросьба: как вы выстраиваете поэтапную диагностику и какие red flags для госпитализации считаете обязательными в похожей картине? Интересуют и лабораторный минимум, и частота контрольных визитов.`,
    surgery: `Планируем элективную операцию средней сложности. Пациент ${sp}, ASA II, кардиологическое «окно» пройдено, но владелец очень нервничает по поводу послеоперационной боли и антибиотиков.\n\nНа консилиуме обсуждаем премедикацию, мониторинг и сроки снятия швов. Вопросы: какой набор обезболивания вы считаете оптимальным для амбулаторного протокола, как долго оставляете защитный воротник, и какие признаки заставляют вас ускорить визит в клинику в первые 48 часов?`,
    diagnostics: `Нужна помощь в интерпретации результатов: снимок в двух проекциях + контрольный УЗИ через несколько дней. Клинически — упорный дискомфорт, ограничение движения, без острого неврологического дефицита на момент осмотра.\n\nПоделитесь, пожалуйста, чек-листом «что обязательно переснять/переоценить», если первичная картина неубедительна. Как вы объясняете владельцу неопределённость диагноза, не подменяя очный осмотр?`,
    pharmacy: `Перед назначением хотим свериться с коллегами по выбору препарата и длительности курса с учётом функции почек и сопутствующей терапии. Официальные инструкции читали, интересует именно «полевая» логика: что вы мониторите в первую неделю и какие лабораторные маркеры заказываете чаще всего?\n\nПросьба не обсуждать конкретные дозы как рекомендации — только принципы и критерии безопасности, чтобы тема оставалась в рамках образовательного форума.`,
    dental: `Пациент ${sp}: значительный зубной камень, подозрение на ретенированный клык, владелец просит «сделать всё за один визит». Объясняем риски длительной анестезии и стресса, но ищем компромисс.\n\nКак вы делите стоматологические вмешательства по этапам? Какие критерии «одномоментно нельзя» для вас железобетонны? Интересен и постановка на профилактику между этапами.`,
    dermatology: `Рецидивирующий зуд, расчёсы, очаги на спине и шее. Паразитологический скрининг отрицательный на момент первого визита, элиминационная диета стартовала, но ответа мало.\n\nКакой минимальный набор исследований вы считаете разумным до «тяжёлой» фармакотерапии? Как фиксируете динамику для владельца (фото, шкалы зуда) и через сколько недель пересматриваете тактику?`,
    ophthalmology: `Жалобы на слезотечение, периодическое сужение глазной щели, без травмы по анамнезу. На осмотре — гиперемия конъюнктивы, лёгкое помутнение роговицы не всегда воспроизводится на повторном визите.\n\nНужны советы по диффдиагностике «слеза vs боль vs давление» без спекуляций о конкретном диагнозе: какие измерения и доп. тесты вы делаете в первую очередь в амбулатории?`,
    cardiology: `Аускультативно — шум, динамика нагрузки не изучена. ЭхоКГ запланировано, но владелец спрашивает про симптомы «когда бежать в клинику ночью».\n\nПоделитесь, как вы обучаете владельцев распознавать дистресс дыхания и слабость, и какие параметры на ЭхоКГ для вас триггеры к более частому наблюдению?`,
    'icu-emergency': `Ночной приём: стабилизация, доступ, базовый мониторинг. Пациент ${sp}, состояние тяжёлое, но с шансом на ответ терапии.\n\nИнтересует ваш «минимум достаточного» в первые 30–60 минут: какие лаборатории заказываете до транспортировки, что делаете сами в клинике, а что — только после стабилизации? Как документируете передачу смене?`,
    nutrition: `Пациент ${sp}: избыточная масса, владелец хочет резкое снижение рациона «как у людей». Объясняем риски гепатоза и панкреатита, предлагаем поэтапность.\n\nКакие цели снижения веса вы закладываете на месяц, как контролируете потерю мышечной массы и какие маркеры биохимии повторяете? Есть ли у вас шаблон «письменных» рекомендаций для владельца?`,
  };

  return intro + blocks[slug] + tail;
}

function buildReplies(slug: TargetSlug, globalIndex: number): string[] {
  const lab = SLUG_LABEL[slug];
  const n1 = NAMES[idx(globalIndex, NAMES.length)];
  const n2 = NAMES[idx(globalIndex + 7, NAMES.length)];
  const n3 = NAMES[idx(globalIndex + 13, NAMES.length)];

  const r1 =
    `${n1}: спасибо за структурное описание. По направлению «${lab}» я бы в первую очередь зафиксировал объективные критерии тяжести и частоту контроля, а уже затем расширял диагностику. ` +
    `Важно заранее проговорить с владельцем сценарий «если не улучшится за N дней — госпитализация/доп. обследование», чтобы не терять время. ` +
    `Если есть лихорадка без очага — я бы пересмотрел список дифференциалов и повторил базовые анализы в динамике, не раздувая панель без показаний.`;

  const r2 =
    `${n2}: у нас в клинике похожие истории часто упираются в соблюдение домашнего режима и в корректность предыдущих назначений. ` +
    `Для ${lab} полезно вести краткий дневник симптомов (аппетит, стул, активность) — это сильно ускоряет следующий визит. ` +
    `Не забывайте про коммуникацию: когда владелец понимает «зачем ждём», меньше самовольных отмен препаратов.`;

  const r3 =
    `${n3}: коллеги, добавлю практический нюанс по ${lab}: при сомнениях я сверяюсь с локальными протоколами и регистрационными данными препаратов, а не с обобщёнными советами из сети. ` +
    `На форуме мы делимся ходом мысли, но финальное решение всё равно остаётся за лечащим врачом с очным осмотром. ` +
    `Если появятся новые данные анализов/снимков — вынесите отдельным сообщением, так проще дать предметный комментарий.`;

  return [r1, r2, r3];
}

async function ensureForumColleagues(
  prisma: PrismaClient,
  passwordHash: string,
  ruId: string,
  vetTitleId: string,
): Promise<string[]> {
  const emails: string[] = [];
  for (let n = 1; n <= 40; n++) {
    const email = `forumcolleague${String(n).padStart(2, '0')}@vetmvp.local`;
    emails.push(email);
    const displayName = `Коллега форума ${n}`;
    const city = CITIES[idx(n, CITIES.length)];
    let u = await prisma.user.findUnique({ where: { email } });
    if (!u) {
      u = await prisma.user.create({
        data: {
          email,
          passwordHash,
          emailVerified: true,
          role: UserRole.SPECIALIST,
          profile: {
            create: {
              displayName,
              city,
              countryId: ruId,
              jobTitleId: vetTitleId,
              verification: VerificationStatus.NONE,
              birthDate: new Date(1985 + (n % 15), (n % 12), 1 + (n % 25)),
            },
          },
        },
      });
    } else {
      await prisma.user.update({
        where: { id: u.id },
        data: { emailVerified: true },
      });
      const p = await prisma.profile.findUnique({ where: { userId: u.id } });
      if (!p) {
        await prisma.profile.create({
          data: {
            userId: u.id,
            displayName,
            city,
            countryId: ruId,
            jobTitleId: vetTitleId,
            verification: VerificationStatus.NONE,
            birthDate: new Date(1985 + (n % 15), (n % 12), 1 + (n % 25)),
          },
        });
      }
    }
  }
  return emails;
}

/**
 * 100 развёрнутых тем в 10 клинических категориях + по 3 ответа от других авторов.
 * Идемпотентно: в `tags` есть маркер `seed-f100-{n}`.
 */
export async function seedForumHundredThreads(
  prisma: PrismaClient,
  opts: { passwordHash: string; ruCountryId: string; vetTitleId: string },
): Promise<{ created: number; skipped: number }> {
  const colleagueEmails = await ensureForumColleagues(
    prisma,
    opts.passwordHash,
    opts.ruCountryId,
    opts.vetTitleId,
  );
  const colleagueIds: string[] = [];
  for (const em of colleagueEmails) {
    const u = await prisma.user.findUnique({ where: { email: em }, select: { id: true } });
    if (u) colleagueIds.push(u.id);
  }
  if (colleagueIds.length < 10) {
    console.warn('seedForumHundredThreads: мало пользователей forumcolleague**, пропуск.');
    return { created: 0, skipped: 0 };
  }

  const cats = await prisma.forumCategory.findMany({
    where: { slug: { in: [...TARGET_SLUGS] } },
    select: { id: true, slug: true },
  });
  const catBySlug = new Map(cats.map((c) => [c.slug, c.id]));

  let created = 0;
  let skipped = 0;

  for (let i = 0; i < 100; i++) {
    const slug = TARGET_SLUGS[i % TARGET_SLUGS.length]!;
    const catId = catBySlug.get(slug);
    if (!catId) {
      skipped++;
      continue;
    }

    const marker = `seed-f100-${i}`;
    const dup = await prisma.forumThread.findFirst({
      where: { categoryId: catId, tags: { contains: marker } },
    });
    if (dup) {
      skipped++;
      continue;
    }

    const title = buildTitle(slug, i);
    const opener = buildOpener(slug, i);
    const replies = buildReplies(slug, i);
    const tagsBase = `ветеринар,форум,${slug},коллеги,seo`;
    const tags = `${tagsBase},${marker}`;

    const authorId = colleagueIds[i % colleagueIds.length]!;
    const replyIds = colleagueIds.filter((id) => id !== authorId);

    const thread = await prisma.forumThread.create({
      data: {
        title,
        tags,
        categoryId: catId,
        authorId,
        posts: {
          create: [{ authorId, body: opener }],
        },
      },
    });

    let r = 0;
    for (const body of replies) {
      const rid = replyIds[r % replyIds.length]!;
      r++;
      await prisma.forumPost.create({
        data: { threadId: thread.id, authorId: rid, body },
      });
    }
    created++;
  }

  console.log(`Seed forum hundred: создано тем ${created}, пропущено ${skipped}.`);
  return { created, skipped };
}
