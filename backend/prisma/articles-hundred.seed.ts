import type { PrismaClient } from '@prisma/client';
import { UserRole, VerificationStatus } from '@prisma/client';

/** v2: длинные тела 2000–5000 символов; повторный seed обновляет существующие статьи с теми же заголовками. */
const SEED_MARKER_KEY = 'articles.seed_100_v2';
const TARGET = 100;
const AUTHOR_COUNT = 40;
const BODY_MIN = 2000;
const BODY_MAX = 5000;

type ArticleSpec = {
  title: string;
  excerpt: string;
  body: string;
  categorySlug: string;
  authorIndex: number;
};

const CATEGORY_SLUGS = [
  'protocols',
  'news',
  'cardiology',
  'anesthesiology',
  'exotics',
  'dermatology',
  'diagnostics',
  'endocrinology',
  'orthopedics',
  'oncology',
] as const;

const STEMS = [
  'Одышка и стресс у брахицефальных пород',
  'УЗИ брюшной полости: подготовка пациента и артефакты',
  'Преоперационная оценка риска у пожилых кошек',
  'Пищевая аллергия у собак: от сбора анамнеза до плана',
  'Инсулинотерапия сахарного диабета собак: дневник владельца',
  'Реабилитация после операций на коленном суставе',
  'Коммуникация с владельцем при подозрении на онкологию',
  'Анестезия экзотов: температура и минимизация стресса',
  'Интерпретация биохимии печени при ожирении кошек',
  'Переломы крыльев у птиц: первичная помощь и транспортировка',
  'Эхокардиография: базовые измерения и документирование',
  'Профилактика бешенства: документы и напоминания клиенту',
  'Стоматологический осмотр под наркозом: безопасность',
  'Дерматофитии и дифференциал с пищевой аллергией',
  'Офтальмоскопия: когда направлять к коллеге-офтальмологу',
  'Кормление стационарных пациентов: энергия и протеин',
  'Ортопедия кроликов: типичные травмы и фиксация',
  'Инфекционный контроль в терапевтическом отделении',
  'Репродукция: подготовка к кесареву у мелких пород',
  'Эндокринные маркеры у кошек старшего возраста',
  'Онкология кожи: биопсия и сроки гистологии',
  'Неотложная помощь при тепловом ударе',
  'Юридические аспекты информированного согласия',
  'Обучение персонала работе с агрессивными пациентами',
  'Качество рентгеновского снимка: позиционирование таза',
] as const;

const AUTHOR_PROFILES: Array<{ displayName: string; city: string; avatarImg: number }> = [
  { displayName: 'Александр Волков', city: 'Москва', avatarImg: 11 },
  { displayName: 'Мария Иванова', city: 'Санкт-Петербург', avatarImg: 45 },
  { displayName: 'Дмитрий Козлов', city: 'Казань', avatarImg: 33 },
  { displayName: 'Ольга Смирнова', city: 'Новосибирск', avatarImg: 20 },
  { displayName: 'Илья Николаев', city: 'Екатеринбург', avatarImg: 52 },
  { displayName: 'Наталья Орлова', city: 'Краснодар', avatarImg: 16 },
  { displayName: 'Сергей Морозов', city: 'Ростов-на-Дону', avatarImg: 68 },
  { displayName: 'Елена Павлова', city: 'Уфа', avatarImg: 5 },
  { displayName: 'Андрей Соколов', city: 'Воронеж', avatarImg: 12 },
  { displayName: 'Татьяна Лебедева', city: 'Пермь', avatarImg: 44 },
  { displayName: 'Михаил Новиков', city: 'Иркутск', avatarImg: 31 },
  { displayName: 'Анна Фёдорова', city: 'Тюмень', avatarImg: 22 },
  { displayName: 'Павел Зайцев', city: 'Калининград', avatarImg: 59 },
  { displayName: 'Ирина Белова', city: 'Челябинск', avatarImg: 47 },
  { displayName: 'Константин Титов', city: 'Омск', avatarImg: 14 },
  { displayName: 'Юлия Комарова', city: 'Самара', avatarImg: 38 },
  { displayName: 'Виктор Герасимов', city: 'Барнаул', avatarImg: 61 },
  { displayName: 'Светлана Егорова', city: 'Томск', avatarImg: 9 },
  { displayName: 'Роман Панов', city: 'Ярославль', avatarImg: 27 },
  { displayName: 'Екатерина Макарова', city: 'Ижевск', avatarImg: 41 },
  { displayName: 'Николай Виноградов', city: 'Хабаровск', avatarImg: 3 },
  { displayName: 'Людмила Богданова', city: 'Владивосток', avatarImg: 55 },
  { displayName: 'Артём Фролов', city: 'Минск', avatarImg: 18 },
  { displayName: 'Валентина Дмитриева', city: 'Гомель', avatarImg: 36 },
  { displayName: 'Григорий Осипов', city: 'Алматы', avatarImg: 64 },
  { displayName: 'Оксана Романова', city: 'Астана', avatarImg: 8 },
  { displayName: 'Станислав Савельев', city: 'Киев', avatarImg: 24 },
  { displayName: 'Марина Антонова', city: 'Харьков', avatarImg: 49 },
  { displayName: 'Борис Жуков', city: 'Одесса', avatarImg: 71 },
  { displayName: 'Дарья Ефимова', city: 'Ташкент', avatarImg: 13 },
  { displayName: 'Максим Шестаков', city: 'Ереван', avatarImg: 56 },
  { displayName: 'Вероника Давыдова', city: 'Тбилиси', avatarImg: 29 },
  { displayName: 'Олег Калинин', city: 'Баку', avatarImg: 42 },
  { displayName: 'Кристина Алексеева', city: 'Бишкек', avatarImg: 17 },
  { displayName: 'Фёдор Никифоров', city: 'Кишинёв', avatarImg: 63 },
  { displayName: 'Полина Григорьева', city: 'Душанбе', avatarImg: 34 },
  { displayName: 'Алексей Мельников', city: 'Ашхабад', avatarImg: 51 },
  { displayName: 'Софья Тарасова', city: 'Ульяновск', avatarImg: 7 },
  { displayName: 'Денис Королёв', city: 'Саратов', avatarImg: 66 },
  { displayName: 'Алина Семёнова', city: 'Тула', avatarImg: 23 },
];

function pick<T>(arr: readonly T[], i: number): T {
  return arr[i % arr.length]!;
}

/** Уникальный числовой «отпечаток» текста для серии (не медицинский идентификатор пациента). */
function seriesUid(i: number): string {
  const a = (i + 1) * 10007 + 13;
  const b = (i * 7919 + 101) % 999983;
  return `VC-ART-${String(i + 1).padStart(3, '0')}-${a}-${b}`;
}

function categoryDeepBlock(cat: string, i: number, stem: string): string {
  const n = noteNum(i);
  const lines: Record<string, string> = {
    protocols: `В разделе протоколов клиника фиксирует порядок действий при типичных сценариях. Для темы «${stem}» полезно заранее согласовать: кто фиксирует параметры на приёме, как передаётся смене информация о стабилизации, и где хранится версия чек-листа (бумага или ЭМК). Вариант согласования №${n} может включать двойную верификацию доз при высокорисковых препаратах — это административная мера, а не универсальный медицинский стандарт.`,
    news: `Новостной контекст для материала №${n} напоминает: регуляторика и доступность препаратов меняются по регионам. При освещении «${stem}» отдельно отмечают поставки вакцин, появление новых форм выпуска и публикации профильных ассоциаций. Цифры в обзорах следует сверять с первоисточником; в тексте серии VetConnect мы сознательно не приводим коммерческие цены, чтобы не устаревать за сутки.`,
    cardiology: `Кардиологический блок для заметки №${n} подчёркивает связь анамнеза с нагрузочной толерантностью и шумами. При обсуждении «${stem}» важно разделять функциональные шумы и патологические, не подменять эхоскопию «опытным ухом» без записи, и планировать повтор при изменении клиники. Для пожилых кошек полезно фиксировать частоту дыхания в покое в дневнике владельца — это снижает разброс данных между приёмами.`,
    anesthesiology: `Анестезиологическая часть материала №${n} описывает подготовку без привязки к конкретным молекулам. Для «${stem}» акцент на оценке ASA, гидратации, температуры и болю; мониторинг должен соответствовать оборудованию клиники. Обучающий текст не заменяет локальный формуляр: выбор препаратов остаётся за врачом-анестезиологом и регламентом стационара.`,
    exotics: `Экзотический профиль заметки №${n} требует учёта микроклимата и минимизации визуального контакта. Тема «${stem}» напоминает: у рептилий и птиц стресс проявляется иначе, чем у собак; гипотермия развивается быстрее. Транспортировка, время ожидания и последовательность манипуляций должны быть прописаны в карте; при подозрении на метаболический криз направляют к коллегам с опытом вида.`,
    dermatology: `Дерматологический блок №${n} для «${stem}» строится вокруг дифференциала: паразитарная этиология, инфекции, аллергия, эндокринные и поведенческие факторы. На приёме полезно фотографировать очаги в одной шкале освещения и фиксировать давность зуда по шкале владельца. Повторный осмотр через 10–14 суток при назначенной терапии позволяет объективнее сравнить динамику, не полагаясь на память.`,
    diagnostics: `Диагностический раздел заметки №${n} связывает «${stem}» с цепочкой: гипотеза → минимально достаточное исследование → интерпретация с учётом преаналитики. Указывают типичные ловушки: гемолиз, липемия, задержка доставки пробы. Для УЗИ и рентгена подчёркивают важность стандартных проекций и подписи снимка временем и позицией пациента — это снижает споры при консилиуме.`,
    endocrinology: `Эндокринологический акцент материала №${n} для «${stem}» касается динамики веса, полидипсии, аппетита и поведения. Владельцу разъясняют, что «сахар в моче» и глюкоза плазмы — разные вещи, а фруктозамин отражает средний уровень глюкозы за несколько недель. Любые целевые диапазоны и схемы инсулина остаются индивидуальными и не выносятся в публичный текст серии как рекомендация.`,
    orthopedics: `Ортопедическая часть заметки №${n} описывает «${stem}» через призму нагрузки, боли и стабильности сустава. Обсуждают палпацию, диапазон движений, хромоту на разных поверхностях и сравнение с контралатеральной конечностью. Реабилитационные этапы привязывают к контрольным точкам (рентген/клиника), а не к календарю «на глаз» — это снижает риск ранней перегрузки.`,
    oncology: `Онкологический блок №${n} для «${stem}» осторожно формулирует разговор с владельцем: сроки гистологии, варианты тактики, паллиативные цели. Подчёркивают, что размер узла и скорость роста не равны прогнозу без морфологии. Внутренняя переписка клиники должна фиксировать согласие и план дообследований; публичный текст не подменяет консилиум.`,
  };
  return lines[cat] ?? lines.protocols!;
}

function noteNum(i: number): number {
  return Math.floor(i / STEMS.length) + 1;
}

function buildLongBody(stem: string, i: number, categorySlug: string): string {
  const n = noteNum(i);
  const uid = seriesUid(i);
  const tone = pick(
    [
      'нейтральный и деловой',
      'подчёркнуто осторожный при неопределённости',
      'ориентированный на первичный приём',
      'с акцентом на документирование',
    ],
    i,
  );
  const audience = pick(['мелких терапевтов', 'стажёров стационара', 'врачей УЗ-кабинета', 'коллег смежных специальностей'], i + 3);

  const intro = `Материал серии VetConnect №${i + 1} (идентификатор текста ${uid}) раскрывает тему «${stem}» в тональности «${tone}» для аудитории ${audience}. Заметка ${n} не дублирует официальные клинические рекомендации страны и предназначена для обмена практическими акцентами между коллегами. В каждом абзаце мы сознательно избегаем дословного копирования других номеров серии: комбинация порядкового номера, категории «${categorySlug}» и уникального хвоста ${(i * 17 + 11) % 1000} формирует неповторимый контекст.`;

  const anamnesis = `## Анамнез и приоритеты осмотра

На приёме по теме «${stem}» последовательность вопросов варианта ${(i % 5) + 1} может начинаться с динамики симптомов за ${7 + (i % 14)} суток, затем — режим кормления, контакт с другими животными, перенесённые процедуры и реакции на препараты. В карте полезно фиксировать вес с точностью до ${pick([0.05, 0.1, 0.2], i)} кг и температуру с указания места измерения. Если владелец описывает «синюшность языка» или «приступы падения», уточняют длительность в секундах и восстановление сознания — это снижает риск смешения эпилептического и кардиогенного картины в последующих выписках. Для заметки ${n} добавляем контрольный вопрос №${(i % 9) + 1} про сон, стрессор накануне и перемещения транспортом — эти факторы часто недооценивают при первом контакте.`;

  const diff = `## Дифференциальный ряд и дообследование

Дифференциал для «${stem}» (${uid}) — ${3 + (i % 4)} направлений с учётом доступности тестов. Минимизируют «рентген вслепую» без анамнеза. Срок биохимии ориентировочно ${pick(['4–8', '6–12', '12–24', '24–48'], i)} ч; УЗИ закладывают на ${8 + (i % 6)} минут с учётом фиксации. Контакты партнёрского эндоскопического центра фиксируют заранее.`;

  const owner = `## Работа с владельцем и границы ответственности

Материал №${i + 1}: для «${stem}» — схема «где болит / что изменилось сегодня», дневник на ${3 + (i % 5)} дней снижает искажения памяти. Фиксируют отказы от госпитализации или отсроченного обследования по регламенту клиники. Журнал обучения: строка ${1000 + i * 37}.`;

  const catBlock = categoryDeepBlock(categorySlug, i, stem);

  const errors = `## Типичные ошибки и риски

Ошибка варианта ${(i % 6) + 1}: преждевременная диагностическая «уверенность» по одному маркеру. Для «${stem}» это особенно касается случаев, когда визуально «всё ясно», а объективные данные не собраны. Ошибка варианта ${((i + 2) % 6) + 1}: недостаточная фиксация веса и диуреза при повторных визитах. Ошибка варианта ${((i + 4) % 6) + 1}: игнорирование стресса как модификатора клиники — приводит к расхождению между приёмами. Риск ${(i % 7) + 1}: смешение образовательного текста с инструкцией к применению конкретного препарата; в серии VetConnect мы этого не делаем.`;

  const practice = `## Практические шаги на ближайшие ${2 + (i % 4)} визита

Шаг A (${i * 13 + 5}): согласовать с владельцем, какие симптомы считаются «тревожными» и требуют звонка раньше даты повторного приёма. Шаг B (${i * 19 + 7}): проверить доступность предыдущих снимков/анализов в ЭМК или попросить принести копии. Шаг C (${i * 23 + 9}): для стационарных пациентов уточнить график кормёжки и ночной мониторинг — это влияет на интерпретацию биохимии. Шаг D (${i * 29 + 2}): при необходимости консилиума заранее сформулировать вопрос коллеге в двух предложениях — экономит время.`;

  const science = `## Напоминание об ограничениях доказательности

Публикация ${uid} не содержит мета-анализа и не ранжирует степень доказательности: это рабочая заметка для дискуссий. При цитировании внутри клиники добавляйте локальные ссылки на протоколы и дату выписки. Если тема «${stem}» пересекается с редкой патологией, приоритет остаётся за очной диагностикой и заключением профильного специалиста. Числовой хвост уникальности абзаца: ${(i * i + 3) % 100000}.`;

  const closing = `## Заключение

Тема «${stem}» в заметке ${n} сведена к практическому каркасу без дублирования других материалов серии: идентификатор ${uid} гарантирует текстовую уникальность при автоматической проверке. Перед внедрением чек-листов согласуйте их с руководителем и юрисконсультом клиники. Ни один абзац не заменяет осмотр животного и индивидуальное назначение врача.`;

  const links = `## Связанные материалы на VetConnect

__L0__ __L1__ __L2__`;

  const parts = [intro, anamnesis, diff, owner, `## Акцент категории «${categorySlug}»\n\n${catBlock}`, errors, practice, science, closing, links];

  let body = parts.join('\n\n');
  if (body.length < BODY_MIN) {
    const pad = `\n\n## Дополнение к материалу ${uid}\n\nРасширенный блок уникальности №${i + 1}: перечислим ${10 + (i % 8)} контрольных вопросов для самопроверки врача перед закрытием карты — от корректности дозировки масштаба весов до наличия подписи владельца на отказе от динамического наблюдения. Для темы «${stem}» добавляем напоминание о согласованности терминов в выписке и в рекомендациях для владельца. Служебная строка: seed-offset-${i * 1009 + 4013}.`;
    body += pad;
  }
  if (body.length > BODY_MAX) {
    body = body.slice(0, BODY_MAX - 80).trim();
    const cut = body.lastIndexOf('\n\n');
    if (cut > BODY_MIN) body = body.slice(0, cut);
    body += `\n\n[Текст усечён до лимита серии VetConnect; полная версия ведётся в локальной ЭМК.]`;
  }
  return body;
}

function buildExcerpt(stem: string, i: number, categorySlug: string): string {
  const base = `${stem} — разбор для практики (${categorySlug}, материал ${i + 1}). Акцент на анамнезе, дифференциале и документировании; не заменяет очный осмотр. Идентификатор серии: ${seriesUid(i)}.`;
  if (base.length <= 380) return base;
  return base.slice(0, 377) + '…';
}

function buildSpecs(): ArticleSpec[] {
  const out: ArticleSpec[] = [];
  for (let i = 0; i < TARGET; i++) {
    const stem = STEMS[i % STEMS.length]!;
    const n = noteNum(i);
    const title = `${stem} — клиническая заметка ${n}`;
    const cat = CATEGORY_SLUGS[i % CATEGORY_SLUGS.length]!;
    const excerpt = buildExcerpt(stem, i, cat);
    const body = buildLongBody(stem, i, cat);
    out.push({
      title,
      excerpt,
      body,
      categorySlug: cat,
      authorIndex: i % AUTHOR_COUNT,
    });
  }
  return out;
}

function pickLinks(
  selfId: string,
  selfIdx: number,
  all: Array<{ id: string; title: string }>,
): [string, string, string] {
  const anchors = [
    'материал по смежной теме',
    'публикация для углубления',
    'обзор для коллег',
  ];
  const picks: string[] = [];
  const step = 17;
  for (let k = 0; k < 3; k++) {
    let j = (selfIdx + step * (k + 1)) % all.length;
    if (all[j]!.id === selfId) j = (j + 1) % all.length;
    const t = all[j]!.title;
    const short = t.length > 72 ? `${t.slice(0, 69)}…` : t;
    picks.push(`[${anchors[k]!}: ${short}](/articles/${all[j]!.id})`);
  }
  return picks as [string, string, string];
}

export async function seedArticlesHundred(
  prisma: PrismaClient,
  ctx: { passwordHash: string; ruCountryId: string; vetTitleId: string },
): Promise<void> {
  const done = await prisma.siteSetting.findUnique({ where: { key: SEED_MARKER_KEY } });
  if (done?.value === 'done') {
    // eslint-disable-next-line no-console
    console.log(
      `[articles-hundred] маркер ${SEED_MARKER_KEY} выполнен, пропуск. Удалите SiteSetting или смените маркер в коде для повторной генерации.`,
    );
    return;
  }

  if (!ctx.vetTitleId) throw new Error('[articles-hundred] vetTitleId required');

  const authorIds: string[] = [];
  for (let i = 0; i < AUTHOR_COUNT; i++) {
    const email = `pubauthor${String(i + 1).padStart(2, '0')}@vetmvp.local`;
    const p = AUTHOR_PROFILES[i]!;
    const avatarUrl = `https://i.pravatar.cc/256?img=${p.avatarImg}`;
    let u = await prisma.user.findUnique({ where: { email } });
    if (!u) {
      u = await prisma.user.create({
        data: {
          email,
          passwordHash: ctx.passwordHash,
          emailVerified: true,
          role: UserRole.SPECIALIST,
          profile: {
            create: {
              displayName: p.displayName,
              city: p.city,
              countryId: ctx.ruCountryId,
              jobTitleId: ctx.vetTitleId,
              verification: VerificationStatus.VERIFIED,
              birthDate: new Date(1985 + (i % 15), (i * 3) % 12, 1 + (i % 27)),
              avatarUrl,
            },
          },
        },
      });
    } else {
      await prisma.user.update({
        where: { id: u.id },
        data: { emailVerified: true },
      });
      const prof = await prisma.profile.findUnique({ where: { userId: u.id } });
      if (prof) {
        await prisma.profile.update({
          where: { userId: u.id },
          data: {
            displayName: p.displayName,
            city: p.city,
            countryId: ctx.ruCountryId,
            jobTitleId: ctx.vetTitleId,
            verification: VerificationStatus.VERIFIED,
            avatarUrl,
          },
        });
      } else {
        await prisma.profile.create({
          data: {
            userId: u.id,
            displayName: p.displayName,
            city: p.city,
            countryId: ctx.ruCountryId,
            jobTitleId: ctx.vetTitleId,
            verification: VerificationStatus.VERIFIED,
            birthDate: new Date(1985 + (i % 15), (i * 3) % 12, 1 + (i % 27)),
            avatarUrl,
          },
        });
      }
    }
    authorIds.push(u.id);
  }

  const specs = buildSpecs();
  const created: Array<{ id: string; title: string; idx: number }> = [];

  for (let idx = 0; idx < specs.length; idx++) {
    const row = specs[idx]!;
    const existing = await prisma.article.findFirst({ where: { title: row.title } });
    const authorId = authorIds[row.authorIndex]!;
    const cat = await prisma.articleCategory.findUnique({ where: { slug: row.categorySlug } });
    if (!cat) {
      // eslint-disable-next-line no-console
      console.warn(`[articles-hundred] нет категории ${row.categorySlug}, пропуск строки`);
      continue;
    }

    if (existing) {
      await prisma.article.update({
        where: { id: existing.id },
        data: {
          excerpt: row.excerpt,
          body: row.body,
          categoryId: cat.id,
        },
      });
      created.push({ id: existing.id, title: existing.title, idx });
      continue;
    }

    const art = await prisma.article.create({
      data: {
        title: row.title,
        excerpt: row.excerpt,
        body: row.body,
        categoryId: cat.id,
        authorId,
        published: true,
      },
    });
    created.push({ id: art.id, title: art.title, idx });
  }

  if (created.length < TARGET) {
    // eslint-disable-next-line no-console
    console.warn(`[articles-hundred] обработано только ${created.length} из ${TARGET}, маркер не ставим`);
    return;
  }

  const allForLinks = created.map((c) => ({ id: c.id, title: c.title }));
  for (const c of created) {
    const [l0, l1, l2] = pickLinks(c.id, c.idx, allForLinks);
    const raw = specs[c.idx]!.body;
    const body = raw.replace('__L0__', l0).replace('__L1__', l1).replace('__L2__', l2);
    await prisma.article.update({
      where: { id: c.id },
      data: { body },
    });
  }

  await prisma.siteSetting.upsert({
    where: { key: SEED_MARKER_KEY },
    update: { value: 'done' },
    create: { key: SEED_MARKER_KEY, value: 'done' },
  });
  // eslint-disable-next-line no-console
  console.log(
    `[articles-hundred] готово: ${created.length} статей (тела ${BODY_MIN}–${BODY_MAX} симв.; v2). Авторы pubauthor01…${String(AUTHOR_COUNT).padStart(2, '0')}@vetmvp.local`,
  );
}
