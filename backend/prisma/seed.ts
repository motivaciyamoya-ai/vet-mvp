import { ListingType, PrismaClient, UserRole, VerificationStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { seedDosageDrugsFromBuiltinCatalog } from '../src/dosage-drugs/dosage-drugs-builtin.seed';
import { DOSAGE_ANIMAL_KEYS, DRUG_REFERENCE } from './vendor/vetDosageReference';

const prisma = new PrismaClient();

/** Юбилей «сегодня» с корректным днём в феврале (для демо-поздравления на главной). */
function birthDateSameCalendarDay(year: number, template: Date): Date {
  const last = new Date(year, template.getMonth() + 1, 0).getDate();
  const day = Math.min(template.getDate(), last);
  return new Date(year, template.getMonth(), day);
}

async function seedDosageDrugsFromBuiltin() {
  await seedDosageDrugsFromBuiltinCatalog(prisma, { DRUG_REFERENCE, DOSAGE_ANIMAL_KEYS }, { log: true });
}

async function main() {
  const countries = [
    { code: 'RU', nameRu: 'Россия' },
    { code: 'BY', nameRu: 'Беларусь' },
    { code: 'KZ', nameRu: 'Казахстан' },
    { code: 'UA', nameRu: 'Украина' },
    { code: 'UZ', nameRu: 'Узбекистан' },
    { code: 'AM', nameRu: 'Армения' },
    { code: 'AZ', nameRu: 'Азербайджан' },
    { code: 'KG', nameRu: 'Кыргызстан' },
    { code: 'MD', nameRu: 'Молдова' },
    { code: 'TJ', nameRu: 'Таджикистан' },
    { code: 'TM', nameRu: 'Туркменистан' },
    { code: 'GE', nameRu: 'Грузия' },
  ];

  for (const c of countries) {
    await prisma.country.upsert({
      where: { code: c.code },
      update: {},
      create: c,
    });
  }

  const titles = [
    'Врач ветеринарной медицины',
    'Заведующий ветеринарным отделением',
    'Ветеринарный фельдшер / ассистент',
    'Врач-диагност (УЗИ)',
    'Врач-анестезиолог-реаниматолог',
    'Врач-хирург',
    'Врач-терапевт',
    'Врач-дерматолог',
    'Врач-стоматолог',
    'Врач-офтальмолог',
    'Врач-кардиолог',
    'Зоотехник',
    'Студент ветфака',
  ];

  for (const nameRu of titles) {
    const exists = await prisma.jobTitle.findFirst({ where: { nameRu } });
    if (!exists) await prisma.jobTitle.create({ data: { nameRu } });
  }

  /** Форум: порядок = sortOrder. Названия/slug синхронны с тем, что правится в админке (та же БД). */
  const cats = [
    {
      name: 'Правила и объявления',
      slug: 'rules',
      description: 'Правила сообщества и новости платформы',
      iconEmoji: '📌',
      sortOrder: 5,
    },
    {
      name: 'Общая терапия',
      slug: 'therapy',
      description: 'Терапия собак, кошек и общие клинические случаи',
      iconEmoji: '🩺',
      sortOrder: 10,
    },
    {
      name: 'Хирургия',
      slug: 'surgery',
      description: 'Операции, анестезия в хирургии, послеоперационное ведение',
      iconEmoji: '🔪',
      sortOrder: 20,
    },
    {
      name: 'Диагностика',
      slug: 'diagnostics',
      description: 'Анализы, УЗИ, рентген, интерпретация данных',
      iconEmoji: '🔬',
      sortOrder: 30,
    },
    {
      name: 'Аптека и дозировки',
      slug: 'pharmacy',
      description: 'Подбор препаратов и расчёт дозировок по справочникам',
      iconEmoji: '💊',
      sortOrder: 40,
    },
    {
      name: 'Стоматология',
      slug: 'dental',
      description: 'Зубы, полость рта, стоматология',
      iconEmoji: '🦷',
      sortOrder: 45,
    },
    {
      name: 'Дерматология',
      slug: 'dermatology',
      description: 'Кожные болезни, аллергии, наружные паразиты',
      iconEmoji: '🧴',
      sortOrder: 50,
    },
    {
      name: 'Офтальмология',
      slug: 'ophthalmology',
      description: 'Глазные патологии',
      iconEmoji: '👁️',
      sortOrder: 52,
    },
    {
      name: 'Кардиология',
      slug: 'cardiology',
      description: 'Сердечно-сосудистая система',
      iconEmoji: '❤️',
      sortOrder: 54,
    },
    {
      name: 'Инфекции и эпиднадзор',
      slug: 'infectious',
      description: 'Инфекции, профилактика, карантин',
      iconEmoji: '🦠',
      sortOrder: 56,
    },
    {
      name: 'Репродукция',
      slug: 'reproduction',
      description: 'Вязка, помощь родам, акушерство',
      iconEmoji: '🍼',
      sortOrder: 58,
    },
    {
      name: 'Экзотические и птицы',
      slug: 'exotics-birds',
      description: 'Рептилии, декоративные птицы и др.',
      iconEmoji: '🦜',
      sortOrder: 60,
    },
    {
      name: 'Фермерские животные',
      slug: 'farm',
      description: 'Крупный мелкий рогатый скот и др.',
      iconEmoji: '🐄',
      sortOrder: 65,
    },
    {
      name: 'Эндокринология и обмен',
      slug: 'endocrine',
      description: 'Эндокринные патологии, метаболизм',
      iconEmoji: '⚗️',
      sortOrder: 70,
    },
    {
      name: 'Ортопедия и травма',
      slug: 'orthopedics',
      description: 'Переломы, дисплазии, реабилитация',
      iconEmoji: '🦴',
      sortOrder: 75,
    },
    {
      name: 'Онкология',
      slug: 'oncology',
      description: 'Опухолевые заболевания',
      iconEmoji: '🎗️',
      sortOrder: 80,
    },
    {
      name: 'Неотложка и ICU',
      slug: 'icu-emergency',
      description: 'Критические состояния, реанимация',
      iconEmoji: '🚑',
      sortOrder: 85,
    },
    {
      name: 'Кормление и рационы',
      slug: 'nutrition',
      description: 'Диета, промышленный корм, BARF',
      iconEmoji: '🥩',
      sortOrder: 90,
    },
    {
      name: 'Юриспруденция и клиника',
      slug: 'legal-practice',
      description: 'Регуляторика, документы, управление практикой',
      iconEmoji: '⚖️',
      sortOrder: 95,
    },
  ];
  for (const c of cats) {
    await prisma.forumCategory.upsert({
      where: { slug: c.slug },
      update: {
        name: c.name,
        description: c.description,
        iconEmoji: c.iconEmoji,
        sortOrder: c.sortOrder,
      },
      create: {
        name: c.name,
        slug: c.slug,
        description: c.description,
        iconEmoji: c.iconEmoji,
        sortOrder: c.sortOrder,
      },
    });
  }

  const artCats = [
    { name: 'Клинические протоколы', slug: 'protocols', iconEmoji: '📋', sortOrder: 10 },
    { name: 'Новости и обзоры', slug: 'news', iconEmoji: '📰', sortOrder: 20 },
  ];
  for (const c of artCats) {
    await prisma.articleCategory.upsert({
      where: { slug: c.slug },
      update: { name: c.name, iconEmoji: c.iconEmoji, sortOrder: c.sortOrder },
      create: {
        name: c.name,
        slug: c.slug,
        iconEmoji: c.iconEmoji,
        sortOrder: c.sortOrder,
      },
    });
  }

  await prisma.siteSetting.upsert({
    where: { key: 'site.title' },
    update: { value: 'VetPro CIS MVP' },
    create: { key: 'site.title', value: 'VetPro CIS MVP' },
  });
  await prisma.siteSetting.upsert({
    where: { key: 'site.support_email' },
    update: { value: 'support@vetmvp.local' },
    create: { key: 'site.support_email', value: 'support@vetmvp.local' },
  });

  const vetcoinPairs: Array<[string, string]> = [
    ['vetcoin.display_name', 'VetCoin'],
    ['vetcoin.registration_bonus', '50'],
    ['vetcoin.forum_new_thread_bonus', '25'],
    ['vetcoin.forum_reply_bonus', '10'],
    ['vetcoin.hot_topic_cost', '50'],
    ['vetcoin.hot_topic_solution_bonus', '75'],
    ['vetcoin.urgent_help_reward_high', '150'],
    ['vetcoin.urgent_help_reward_critical', '200'],
    ['vetcoin.daily_login_bonus', '5'],
    ['vetcoin.article_publish_bonus', '75'],
    ['registration.require_email_verify', 'true'],
  ];

  for (const [key, value] of vetcoinPairs) {
    await prisma.siteSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  await prisma.siteSetting.upsert({
    where: { key: 'events.sources.ics' },
    update: {},
    create: {
      key: 'events.sources.ics',
      value:
        '# Публичные календари iCalendar (.ics): по одному URL на строку.\n# Разделы «Export / Subscribe / Add to calendar» у конференций и ассоциаций.\n',
    },
  });
  await prisma.siteSetting.upsert({
    where: { key: 'events.sources.rss' },
    update: {},
    create: {
      key: 'events.sources.rss',
      value:
        '# Ленты RSS/Atom с объявлениями о мероприятиях: по одному URL на строку.\n# Точность дат зависит от фида; для подробного расписания предпочтителен ICS.\n',
    },
  });

  const ru = await prisma.country.findUniqueOrThrow({ where: { code: 'RU' } });
  const vetTitle = await prisma.jobTitle.findFirst({ where: { nameRu: 'Врач ветеринарной медицины' } });
  if (!vetTitle) throw new Error('JobTitle missing');
  const vetTitleId = vetTitle.id;

  const hash = await bcrypt.hash('Demo123!', 10);

  const seedAnchor = new Date();

  async function ensureUser(
    email: string,
    role: UserRole,
    displayName: string,
    city: string,
    verification: VerificationStatus,
    birthDate: Date,
    extras?: {
      avatarUrl?: string;
      countryId?: string;
      jobTitleId?: string;
      vetCoinBalance?: number;
    },
  ) {
    let u = await prisma.user.findUnique({ where: { email } });
    const countryUse = extras?.countryId ?? ru.id;
    const jobUse = extras?.jobTitleId ?? vetTitleId;
    if (!u) {
      u = await prisma.user.create({
        data: {
          email,
          passwordHash: hash,
          emailVerified: true,
          ...(extras?.vetCoinBalance !== undefined ? { vetCoinBalance: extras.vetCoinBalance } : {}),
          role,
          profile: {
            create: {
              displayName,
              city,
              countryId: countryUse,
              jobTitleId: jobUse,
              verification,
              birthDate,
              avatarUrl: extras?.avatarUrl,
            },
          },
        },
      });
    } else {
      await prisma.user.update({
        where: { id: u.id },
        data: {
          emailVerified: true,
          ...(extras?.vetCoinBalance !== undefined ? { vetCoinBalance: extras.vetCoinBalance } : {}),
        },
      });
      const existingProfile = await prisma.profile.findUnique({ where: { userId: u.id } });
      if (!existingProfile) {
        await prisma.profile.create({
          data: {
            userId: u.id,
            displayName,
            city,
            countryId: countryUse,
            jobTitleId: jobUse,
            verification,
            birthDate,
            avatarUrl: extras?.avatarUrl,
          },
        });
      } else {
        await prisma.profile.update({
          where: { userId: u.id },
          data: {
            birthDate,
            verification,
            ...(extras?.avatarUrl !== undefined ? { avatarUrl: extras.avatarUrl } : {}),
            displayName,
            city,
            countryId: countryUse,
            jobTitleId: jobUse,
          },
        });
      }
    }
    return u;
  }

  /** Сегодняшний месяц/день (выровнен по году) — чтобы на главной сработало поздравление для vet@… */
  const vetBirthDemo = birthDateSameCalendarDay(1991, seedAnchor);

  const user = await ensureUser(
    'vet@vetmvp.local',
    UserRole.SPECIALIST,
    'Демо Ветеринар',
    'Санкт-Петербург',
    VerificationStatus.NONE,
    vetBirthDemo,
    { avatarUrl: 'https://i.pravatar.cc/256?img=11' },
  );
  await ensureUser(
    'admin@vetmvp.local',
    UserRole.ADMIN,
    'Демо Админ',
    'Москва',
    VerificationStatus.VERIFIED,
    new Date(1988, 2, 15),
    { avatarUrl: 'https://i.pravatar.cc/256?img=8' },
  );
  await ensureUser(
    'moderator@vetmvp.local',
    UserRole.MODERATOR,
    'Демо Модератор',
    'Минск',
    VerificationStatus.VERIFIED,
    new Date(1985, 10, 3),
    { avatarUrl: 'https://i.pravatar.cc/256?img=25' },
  );
  await ensureUser(
    'specialist@vetmvp.local',
    UserRole.SPECIALIST,
    'Демо Специалист',
    'Казань',
    VerificationStatus.NONE,
    new Date(1997, 6, 22),
    { avatarUrl: 'https://i.pravatar.cc/256?img=12' },
  );

  const by = await prisma.country.findUnique({ where: { code: 'BY' } });
  const kz = await prisma.country.findUnique({ where: { code: 'KZ' } });
  const jtTherapist =
    (await prisma.jobTitle.findFirst({ where: { nameRu: 'Врач-терапевт' } })) ?? (await prisma.jobTitle.findFirstOrThrow({ where: { nameRu: 'Врач ветеринарной медицины' } }));
  const jtDiag =
    (await prisma.jobTitle.findFirst({ where: { nameRu: 'Врач-диагност (УЗИ)' } })) ?? (await prisma.jobTitle.findFirstOrThrow({ where: { nameRu: 'Врач ветеринарной медицины' } }));
  const jtSurgeon =
    (await prisma.jobTitle.findFirst({ where: { nameRu: 'Врач-хирург' } })) ?? (await prisma.jobTitle.findFirstOrThrow({ where: { nameRu: 'Врач ветеринарной медицины' } }));
  const jtDerm =
    (await prisma.jobTitle.findFirst({ where: { nameRu: 'Врач-дерматолог' } })) ?? (await prisma.jobTitle.findFirstOrThrow({ where: { nameRu: 'Врач ветеринарной медицины' } }));
  const jtDental =
    (await prisma.jobTitle.findFirst({ where: { nameRu: 'Врач-стоматолог' } })) ?? (await prisma.jobTitle.findFirstOrThrow({ where: { nameRu: 'Врач ветеринарной медицины' } }));
  const jtStudent =
    (await prisma.jobTitle.findFirst({ where: { nameRu: 'Студент ветфака' } })) ?? (await prisma.jobTitle.findFirstOrThrow({ where: { nameRu: 'Врач ветеринарной медицины' } }));

  const fillSpecs: Array<{
    email: string;
    displayName: string;
    city: string;
    countryId: string;
    jobTitleId: string;
    birth: Date;
    avatarUrl: string;
  }> = [
    {
      email: 'fill05@vetmvp.local',
      displayName: 'Мария Петрова',
      city: 'Иркутск',
      countryId: ru.id,
      jobTitleId: jtTherapist.id,
      birth: new Date(1989, 4, 21),
      avatarUrl: 'https://i.pravatar.cc/256?img=45',
    },
    {
      email: 'fill06@vetmvp.local',
      displayName: 'Александр Волков',
      city: 'Новосибирск',
      countryId: ru.id,
      jobTitleId: jtDiag.id,
      birth: new Date(1984, 8, 2),
      avatarUrl: 'https://i.pravatar.cc/256?img=33',
    },
    {
      email: 'fill07@vetmvp.local',
      displayName: 'Ольга Козлова',
      city: 'Минск',
      countryId: by?.id ?? ru.id,
      jobTitleId: jtSurgeon.id,
      birth: new Date(1992, 0, 30),
      avatarUrl: 'https://i.pravatar.cc/256?img=20',
    },
    {
      email: 'fill08@vetmvp.local',
      displayName: 'Илья Николаев',
      city: 'Алматы',
      countryId: kz?.id ?? ru.id,
      jobTitleId: jtDerm.id,
      birth: new Date(1995, 10, 7),
      avatarUrl: 'https://i.pravatar.cc/256?img=52',
    },
    {
      email: 'fill09@vetmvp.local',
      displayName: 'Наталья Орлова',
      city: 'Пермь',
      countryId: ru.id,
      jobTitleId: jtDental.id,
      birth: new Date(1990, 2, 18),
      avatarUrl: 'https://i.pravatar.cc/256?img=16',
    },
    {
      email: 'fill10@vetmvp.local',
      displayName: 'Дмитрий Морозов',
      city: 'Воронеж',
      countryId: ru.id,
      jobTitleId: jtStudent.id,
      birth: new Date(2001, 6, 4),
      avatarUrl: 'https://i.pravatar.cc/256?img=68',
    },
  ];

  for (const s of fillSpecs) {
    await ensureUser(s.email, UserRole.SPECIALIST, s.displayName, s.city, VerificationStatus.VERIFIED, s.birth, {
      avatarUrl: s.avatarUrl,
      countryId: s.countryId,
      jobTitleId: s.jobTitleId,
    });
  }

  /**
   * Демо-аккаунты с распределением по странам (User + Profile.countryId).
   * Email: `{code}-countryseedNN@vetmvp.local`, пароль тот же, что у остальных демо (`Demo123!`).
   */
  const countryUserCounts: Array<{ code: string; count: number }> = [
    { code: 'RU', count: 12 },
    { code: 'BY', count: 5 },
    { code: 'KZ', count: 5 },
    { code: 'UA', count: 4 },
    { code: 'UZ', count: 3 },
    { code: 'AM', count: 2 },
  ];

  const citiesByCountryCode: Record<string, string[]> = {
    RU: [
      'Москва',
      'Санкт-Петербург',
      'Казань',
      'Новосибирск',
      'Екатеринбург',
      'Краснодар',
      'Ростов-на-Дону',
      'Уфа',
      'Воронеж',
      'Иркутск',
      'Калининград',
      'Тюмень',
    ],
    BY: ['Минск', 'Гомель', 'Брест', 'Витебск', 'Гродно', 'Могилёв'],
    KZ: ['Алматы', 'Астана', 'Шымкент', 'Караганда', 'Актобе', 'Павлодар'],
    UA: ['Киев', 'Харьков', 'Одесса', 'Днепр', 'Львов'],
    UZ: ['Ташкент', 'Самарканд', 'Наманган'],
    AM: ['Ереван', 'Гюмри'],
    AZ: ['Баку', 'Гянджа', 'Сумгаит'],
    KG: ['Бишкек', 'Ош'],
    GE: ['Тбилиси', 'Батуми'],
    MD: ['Кишинёв', 'Бельцы'],
    TJ: ['Душанбе', 'Худжанд'],
    TM: ['Ашхабад', 'Туркменабат'],
  };

  const countryDemoDisplayNames = [
    'Анна Смирнова',
    'Иван Петров',
    'Мария Козлова',
    'Алексей Новиков',
    'Елена Волкова',
    'Дмитрий Соколов',
    'Ольга Лебедева',
    'Сергей Кузнецов',
    'Наталья Попова',
    'Андрей Васильев',
    'Татьяна Михайлова',
    'Павел Фёдоров',
    'Ирина Морозова',
    'Виктория Романова',
    'Константин Орлов',
    'Юлия Захарова',
    'Максим Семёнов',
    'Екатерина Егорова',
    'Николай Павлов',
    'Светлана Степанова',
    'Артём Николаев',
    'Дарья Андреева',
    'Роман Макаров',
    'Алина Крылова',
    'Георгий Тимофеев',
    'Вероника Бровкина',
    'Станислав Герасимов',
    'Ксения Данилова',
    'Тимур Исаков',
    'Людмила Фомина',
  ];

  const jobTitlesOrdered = await prisma.jobTitle.findMany({ orderBy: { nameRu: 'asc' } });
  const countrySeedEmails: string[] = [];
  const countrySeedSummary: Array<{ code: string; count: number; emails: string[] }> = [];
  let countryDemoRot = 0;

  for (const { code, count } of countryUserCounts) {
    const countryRow = await prisma.country.findUnique({ where: { code } });
    if (!countryRow) {
      console.warn(`Seed: страна с кодом ${code} не найдена в БД — блок countryseed пропущен для ${code}.`);
      continue;
    }
    const cities = citiesByCountryCode[code] ?? ['—'];
    const emailsThis: string[] = [];
    for (let n = 1; n <= count; n++) {
      const email = `${code.toLowerCase()}-countryseed${String(n).padStart(2, '0')}@vetmvp.local`;
      countrySeedEmails.push(email);
      emailsThis.push(email);
      const displayName = countryDemoDisplayNames[countryDemoRot % countryDemoDisplayNames.length]!;
      const city = cities[(n - 1) % cities.length]!;
      const jobTitleIdRotate =
        jobTitlesOrdered.length > 0
          ? jobTitlesOrdered[countryDemoRot % jobTitlesOrdered.length]!.id
          : vetTitleId;
      const birthYear = 1983 + ((countryDemoRot * 7) % 23);
      const birthMonth = countryDemoRot % 12;
      const birthDay = 5 + ((countryDemoRot * 11) % 22);
      const birth = birthDateSameCalendarDay(birthYear, new Date(2000, birthMonth, birthDay));
      const img = ((countryDemoRot % 69) + 1);
      /** Лёгкий разброс баланса (опционально, удобно для демо кошелька). */
      const vetCoinBalance = 55 + ((countryDemoRot * 37) % 180);
      await ensureUser(
        email,
        UserRole.SPECIALIST,
        displayName,
        city,
        VerificationStatus.VERIFIED,
        birth,
        {
          avatarUrl: `https://i.pravatar.cc/256?img=${img}`,
          countryId: countryRow.id,
          jobTitleId: jobTitleIdRotate,
          vetCoinBalance,
        },
      );
      countryDemoRot += 1;
    }
    countrySeedSummary.push({ code, count, emails: emailsThis });
  }

  console.log(
    'Seed [country demos]: аккаунты `{code}-countryseedNN@vetmvp.local`, пароль Demo123! (хеш как у остальных демо).',
  );
  for (const row of countrySeedSummary) {
    console.log(`  ${row.code}: ${row.count} шт., пример email: ${row.emails[0] ?? '(нет)'}`);
  }

  /** Каждый seed сбрасывает пароль демо-пользователей на Demo123!, иначе после ручной смены/импорта БД вход «ломается». */
  const demoEmails = [
    'vet@vetmvp.local',
    'admin@vetmvp.local',
    'moderator@vetmvp.local',
    'specialist@vetmvp.local',
    'fill05@vetmvp.local',
    'fill06@vetmvp.local',
    'fill07@vetmvp.local',
    'fill08@vetmvp.local',
    'fill09@vetmvp.local',
    'fill10@vetmvp.local',
    ...countrySeedEmails,
  ];
  for (const email of demoEmails) {
    await prisma.user.updateMany({
      where: { email },
      data: { passwordHash: hash },
    });
  }

  // Локальный MVP: основной демо-логин vet@ — сразу ADMIN (удобно для админ-панели без смены учётки).
  await prisma.user.update({
    where: { email: 'vet@vetmvp.local' },
    data: { role: UserRole.ADMIN },
  });

  await prisma.user.updateMany({
    where: { email: 'admin@vetmvp.local' },
    data: { role: UserRole.ADMIN },
  });
  await prisma.user.updateMany({
    where: { email: 'moderator@vetmvp.local' },
    data: { role: UserRole.MODERATOR },
  });
  await prisma.user.updateMany({
    where: { email: 'specialist@vetmvp.local' },
    data: { role: UserRole.SPECIALIST },
  });
  await prisma.user.updateMany({
    where: { email: { in: [...fillSpecs.map((x) => x.email), ...countrySeedEmails] } },
    data: { role: UserRole.SPECIALIST },
  });

  /** Для каждой категории форума создаём демо-тему, если в разделе ещё пусто — графики и счётчики по разделам не «слипаются». */
  const forumDemosBySlug: Record<string, { title: string; tags: string; body: string }> = {
    rules: {
      title: 'Правила сообщества VetConnect и как пользоваться форумом',
      tags: 'правила,онбординг',
      body:
        'Кратко: уважаем коллег, не нарушаем конфиденциальность пациента, не подменяем очный осмотр и локальное законодательство.\n\n' +
        'Рекламные сообщения без согласования — не сюда. Спорные ситуации можно передать модератору.',
    },
    therapy: {
      title: 'Добро пожаловать в VetPro CIS — общая терапия',
      tags: 'онбординг,правила,терапия',
      body:
        'Раздел «Терапия». Обсуждайте случаи, протоколы и дисклеймеры. Это учебное сообщество MVP.\n\n' +
        'Соблюдайте конфиденциальность пациента и действующее законодательство страны вашей регистрации.',
    },
    surgery: {
      title: 'Хирургия: послеоперационное наблюдение',
      tags: 'хирургия,послеоперация,demo',
      body:
        'Раздел «Хирургия». Примеры: контроль швов, обезболивание, гидратация. Ответственность за решения несёт клинический врач.',
    },
    diagnostics: {
      title: 'Диагностика: УЗИ и интерпретация снимков',
      tags: 'узи,рентген,диагностика',
      body:
        'Раздел «Диагностика». Делимся наблюдаемыми признаками и дифдиагностикой. Не диагностируйте удалённо без осмотра, если это противоречит локальным нормам.',
    },
    pharmacy: {
      title: 'Аптека и дозировки: обмен по назначениям',
      tags: 'дозировки,лекарства,аптека',
      body:
        'Раздел «Аптека и дозировки». Обсуждение официальных справочников и клинических фактов пациента. Не является инструкцией к самолечению.',
    },
  };

  const forumCategoriesAll = await prisma.forumCategory.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });

  const specialistUser = await prisma.user.findUnique({ where: { email: 'specialist@vetmvp.local' } });

  for (const cat of forumCategoriesAll) {
    const exists = await prisma.forumThread.count({ where: { categoryId: cat.id } });
    if (exists > 0) continue;

    const demo = forumDemosBySlug[cat.slug] ?? {
      title: `Обсуждения: ${cat.name}`,
      tags: `${cat.slug},демо`,
      body: `Раздел «${cat.name}». Демо-тема для MVP. При необходимости замените контент после запуска продукта.`,
    };

    const authorId =
      cat.slug === 'therapy' || cat.slug === 'rules' ? user.id : specialistUser?.id ?? user.id;

    await prisma.forumThread.create({
      data: {
        title: demo.title,
        tags: demo.tags,
        categoryId: cat.id,
        authorId,
        posts: {
          create: {
            authorId,
            body: demo.body,
          },
        },
      },
    });
  }

  const extraArticleCategories = [
    { name: 'Кардиология', slug: 'cardiology', iconEmoji: '❤️', sortOrder: 15 },
    { name: 'Анестезиология', slug: 'anesthesiology', iconEmoji: '💉', sortOrder: 25 },
    { name: 'Экзотические животные', slug: 'exotics', iconEmoji: '🦎', sortOrder: 35 },
    { name: 'Дерматология', slug: 'dermatology', iconEmoji: '🩹', sortOrder: 45 },
    { name: 'Диагностика', slug: 'diagnostics', iconEmoji: '🔬', sortOrder: 55 },
    { name: 'Эндокринология', slug: 'endocrinology', iconEmoji: '⚕️', sortOrder: 65 },
    { name: 'Ортопедия', slug: 'orthopedics', iconEmoji: '🦴', sortOrder: 75 },
    { name: 'Онкология', slug: 'oncology', iconEmoji: '🎗️', sortOrder: 85 },
  ];
  for (const c of extraArticleCategories) {
    await prisma.articleCategory.upsert({
      where: { slug: c.slug },
      update: { name: c.name, iconEmoji: c.iconEmoji, sortOrder: c.sortOrder },
      create: {
        name: c.name,
        slug: c.slug,
        iconEmoji: c.iconEmoji,
        sortOrder: c.sortOrder,
      },
    });
  }

  const authorByEmail = async (email: string) => {
    const u = await prisma.user.findUnique({ where: { email } });
    return u?.id ?? user.id;
  };

  const demoArticles: Array<{
    title: string;
    excerpt: string;
    body: string;
    categorySlug: string;
    authorEmail: string;
  }> = [
    {
      title: 'Безопасность при работе с животными в стрессе',
      excerpt: 'Краткие рекомендации по фиксации и снижению стресса.',
      body:
        '## Введение\n\nСтресс влияет на показатели анализов и риск осложнений.\n\n## Практика\n\nИспользуйте спокойный тон, минимизируйте ожидание в очереди.\n\n> MVP: это учебный текст, не клиническая рекомендация.',
      categorySlug: 'protocols',
      authorEmail: 'vet@vetmvp.local',
    },
    {
      title: 'Современные методы диагностики заболеваний сердца у кошек',
      excerpt:
        'Комплексный обзор современных диагностических методов, включая ЭКГ, эхокардиографию и биомаркеры.',
      body:
        'В кардиологии кошек важно сочетать анамнез, объективный осмотр и визуализацию.\nЭхокардиография помогает оценить морфологию камер и клапанов.\nОбразовательный материал VetConnect MVP.',
      categorySlug: 'cardiology',
      authorEmail: 'specialist@vetmvp.local',
    },
    {
      title: 'Протоколы анестезии для пожилых животных',
      excerpt: 'Подбор режимов анестезии при возрастных изменениях и сопутствующих болезнях.',
      body:
        'Обзор ключевых рисков и мониторинга для пожилых пациентов.\nПрепараты и режимы выбирает ветеринар локально по инструкции и статусу пациента.',
      categorySlug: 'anesthesiology',
      authorEmail: 'vet@vetmvp.local',
    },
    {
      title: 'Питание рептилий в домашних условиях: научный подход',
      excerpt: 'Температура, UVB и рацион как основа содержания и профилактики метаболических нарушений.',
      body:
        'Виды сильно отличаются по требованиям к микроклимату.\nПодчёркиваем типичные ошибки и необходимость очной диагностики при симптомах.',
      categorySlug: 'exotics',
      authorEmail: 'moderator@vetmvp.local',
    },
    {
      title: 'Дерматология собак: дифференциальная диагностика зуда',
      excerpt: 'Пошаговый учебный скелет исключения причин зуда без замены официального протокола клиники.',
      body:
        'Алгоритм: паразиты, инфекции, аллергия, эндокринные и поведенческие факторы.\nДиагноз и терапию определяет врач.',
      categorySlug: 'dermatology',
      authorEmail: 'specialist@vetmvp.local',
    },
    {
      title: 'Эндоскопическая диагностика заболеваний ЖКТ у собак',
      excerpt: 'Показания к эндоскопии и практические аспекты подготовки пациента.',
      body:
        'Информация для обучения: эндоскопия даёт визуализацию слизистой и возможность биопсии.\nРешение о процедуре принимает клиника.',
      categorySlug: 'diagnostics',
      authorEmail: 'vet@vetmvp.local',
    },
    {
      title: 'Feline Hyperthyroidism: Latest Treatment Protocols',
      excerpt: 'English-language educational summary for international colleagues (MVP).',
      body:
        'Overview of monitoring and goals of therapy in senior cats with hyperthyroidism.\nNot a prescribing guide — align with local regulations.',
      categorySlug: 'endocrinology',
      authorEmail: 'moderator@vetmvp.local',
    },
    {
      title: 'Ортопедия птиц: переломы крыльев и их лечение',
      excerpt: 'Анатомия, фиксация и этапы реабилитации — кратко для учебного портала.',
      body:
        'Материал обобщённый; сложные переломы требуют стационара и рентгенологического контроля.',
      categorySlug: 'orthopedics',
      authorEmail: 'specialist@vetmvp.local',
    },
    {
      title: 'Oncología veterinaria: avances en inmunoterapia',
      excerpt: 'Resumen educativo en español — MVP VetConnect.',
      body:
        'Marco conceptual y vigilancia; no sustituye el consentimiento informado ni las guías nacionales.',
      categorySlug: 'oncology',
      authorEmail: 'vet@vetmvp.local',
    },
    {
      title: 'Новости ветеринарного рынка: регуляторика и поставки',
      excerpt: 'Короткий обзор трендов для коллег (демо-раздел «Новости»).',
      body: 'Учебный текст: проверяйте первоисточники и локальные регистрации препаратов.',
      categorySlug: 'news',
      authorEmail: 'moderator@vetmvp.local',
    },
  ];

  await seedDosageDrugsFromBuiltin();

  for (const row of demoArticles) {
    const exists = await prisma.article.findFirst({ where: { title: row.title } });
    if (exists) continue;
    const cat = await prisma.articleCategory.findUnique({ where: { slug: row.categorySlug } });
    if (!cat) {
      console.warn(`Seed: пропуск статьи, нет категории ${row.categorySlug}`);
      continue;
    }
    const authorId = await authorByEmail(row.authorEmail);
    await prisma.article.create({
      data: {
        title: row.title,
        excerpt: row.excerpt,
        body: row.body,
        categoryId: cat.id,
        authorId,
        published: true,
      },
    });
  }

  /** По 10 объявлений, статей и тем форума (с ответами) от десяти разных учёток; идёмторно по уникальным заголовкам. */
  const contentUserEmails: string[] = [
    'vet@vetmvp.local',
    'specialist@vetmvp.local',
    'moderator@vetmvp.local',
    'admin@vetmvp.local',
    'fill05@vetmvp.local',
    'fill06@vetmvp.local',
    'fill07@vetmvp.local',
    'fill08@vetmvp.local',
    'fill09@vetmvp.local',
    'fill10@vetmvp.local',
  ];
  async function resolveUserIds(emails: string[]): Promise<Map<string, string>> {
    const m = new Map<string, string>();
    for (const e of emails) {
      const u = await prisma.user.findUnique({ where: { email: e }, select: { id: true } });
      if (u) m.set(e, u.id);
    }
    return m;
  }
  const contentIds = await resolveUserIds(contentUserEmails);

  const fillListingsSeed: Array<{
    email: string;
    type: ListingType;
    region: string;
    title: string;
    categoryLine: string;
    metaLines: string[];
    intro: string;
  }> = [
    {
      email: contentUserEmails[0]!,
      type: ListingType.SELL,
      region: 'Санкт-Петербург',
      title: '[Наполнение] УЗ-сканер портативный (учебное объявление)',
      categoryLine: 'Оборудование',
      metaLines: ['Цена: 195 000 ₽'],
      intro:
        'Компактный аппарат для мобильных выездов, батарейный режим до 4 ч. Продаётся в связи с обновлением парка техники.',
    },
    {
      email: contentUserEmails[1]!,
      type: ListingType.SELL,
      region: 'Казань',
      title: '[Наполнение] Комплект мелких хирургических инструментов',
      categoryLine: 'Инструменты',
      metaLines: ['Цена: 28 000 ₽'],
      intro: 'Стерилизаторная упаковка, набор после инвентаризации; возможен осмотр на площадке.',
    },
    {
      email: contentUserEmails[2]!,
      type: ListingType.SELL,
      region: 'Минск',
      title: '[Наполнение] Инкубатор для птиц Brinsea ICU',
      categoryLine: 'Оборудование',
      metaLines: ['Цена: 92 000 ₽'],
      intro:
        'Стационарный инкубатор, регуляция влажности и температуры; лог упоминается только для демо-маркета.',
    },
    {
      email: contentUserEmails[3]!,
      type: ListingType.SELL,
      region: 'Москва',
      title: '[Наполнение] Одноразовые швы PDS 4/0, остаток коробки',
      categoryLine: 'Расходники',
      metaLines: ['Цена: 4 800 ₽'],
      intro:
        'Срок годности в норме, холодовая цепь не повреждалась — учебный текст для маркетплейса.',
    },
    {
      email: contentUserEmails[4]!,
      type: ListingType.SELL,
      region: 'Иркутск',
      title: '[Наполнение] Учебное пособие по УЗ-сердце кошки',
      categoryLine: 'Литература',
      metaLines: ['Цена: 1 900 ₽'],
      intro:
        'Печать цветная, вкладыш-схемы; для стажёрской библиотеки клиники.',
    },
    {
      email: contentUserEmails[5]!,
      type: ListingType.BUY,
      region: 'Новосибирск',
      title: '[Наполнение] Куплю второй блок датчиков для Mindray DP-50',
      categoryLine: 'Оборудование',
      metaLines: ['Бюджет: до 55 000 ₽'],
      intro:
        'Интересуют живые трассеры и история регламентного ТО.',
    },
    {
      email: contentUserEmails[6]!,
      type: ListingType.SELL,
      region: 'Минск',
      title: '[Наполнение] Комплект СИЗ: халаты, очки, обувь одноразовая',
      categoryLine: 'СИЗ',
      metaLines: ['Цена: 3 200 ₽'],
      intro:
        'Новая упаковка, партия после пересборки складского регламента (демо).',
    },
    {
      email: contentUserEmails[7]!,
      type: ListingType.SELL,
      region: 'Алматы',
      title: '[Наполнение] Продаю стоматологический набор мини',
      categoryLine: 'Инструменты',
      metaLines: ['Цена: 14 500 ₽'],
      intro:
        'Для мелкой стоматологии и хексы; упаковано по лотам.',
    },
    {
      email: contentUserEmails[8]!,
      type: ListingType.SELL,
      region: 'Пермь',
      title: '[Наполнение] Офисный холодильник для вакцин (небольшой)',
      categoryLine: 'Оборудование',
      metaLines: ['Цена: 11 900 ₽'],
      intro:
        'Только для демо-контента: проверить реальность характеристик перед покупкой у продавца.',
    },
    {
      email: contentUserEmails[9]!,
      type: ListingType.JOB,
      region: 'Воронеж',
      title: '[Наполнение] Приглашаем узиолога на сменную подработку выходные',
      categoryLine: 'Вакансии',
      metaLines: ['Бюджет: 14 000 ₽ за смену'],
      intro:
        'Официально по договору ГПХ; задачи — малая терапия и УЗИ брюшной полости.',
    },
  ];

  for (const row of fillListingsSeed) {
    const exists = await prisma.listing.findFirst({ where: { title: row.title } });
    if (exists) continue;
    const authorId = contentIds.get(row.email);
    if (!authorId) continue;
    const header = [
      `Категория: ${row.categoryLine}`,
      ...row.metaLines,
      '',
      row.intro,
    ].join('\n');
    await prisma.listing.create({
      data: {
        type: row.type,
        authorId,
        title: row.title,
        description: header,
        region: row.region,
      },
    });
  }

  /** Доп. витрина: «живые» заголовки, те же реальные авторы (для маркетплейса без демо-смеси на фронте). */
  const storefrontListingsSeed: Array<{
    email: string;
    type: ListingType;
    region: string;
    title: string;
    categoryLine: string;
    metaLines: string[];
    intro: string;
  }> = [
    {
      email: contentUserEmails[0]!,
      type: ListingType.SELL,
      region: 'Москва',
      title: 'Ветеринарный УЗИ аппарат Mindray DP-50',
      categoryLine: 'Оборудование',
      metaLines: ['Цена: 450 000 ₽'],
      intro:
        'Профессиональный УЗИ-сканер, 2 датчика, полный комплект. Продаётся в связи с обновлением парка техники. Осмотр до сделки возможен.',
    },
    {
      email: contentUserEmails[1]!,
      type: ListingType.SELL,
      region: 'Казань',
      title: 'Стоматологическая установка для животных (комплект)',
      categoryLine: 'Оборудование',
      metaLines: ['Цена: 280 000 ₽'],
      intro:
        'Установка с ультразвуком и полировкой; после техосмотра возможен пробный сеанс у покупателя на площадке.',
    },
    {
      email: contentUserEmails[2]!,
      type: ListingType.SELL,
      region: 'Санкт-Петербург',
      title: 'Расходники для стерилизации — остатки закупки (отдам даром)',
      categoryLine: 'Расходники',
      metaLines: ['Отдам даром.'],
      intro:
        'Коробки не вскрывались, партия после пересчёта склада. Отдам даром коллегам; самовывоз СПб или договор об доставке.',
    },
    {
      email: contentUserEmails[3]!,
      type: ListingType.BUY,
      region: 'Екатеринбург',
      title: 'Ищу хирургический набор инструментов базовый',
      categoryLine: 'Инструменты',
      metaLines: ['Бюджет: до 120 000 ₽'],
      intro:
        'Интересуют комплекты с понятной историей стерилизации и регламентом. Рассмотрю доставку или встречу в регионе.',
    },
    {
      email: contentUserEmails[4]!,
      type: ListingType.JOB,
      region: 'Новосибирск',
      title: 'Обмен: стерилизатор Melag на портативный рентген',
      categoryLine: 'Оборудование',
      metaLines: ['Ориентировочная стоимость: эквивалент сделки по договорённости'],
      intro:
        'Автоклав 2020 г., обслуживание по графику. Нужен компактный рентген с документами.',
    },
    {
      email: contentUserEmails[5]!,
      type: ListingType.SELL,
      region: 'Новосибирск',
      title: 'Переноска ICU для птиц и мелких экзотов',
      categoryLine: 'Оборудование',
      metaLines: ['Цена: 18 500 ₽'],
      intro: 'Инкубатор/переноска после демонтажа с рабочего места клиники экзотических; проверка перед оплатой.',
    },
  ];

  for (const row of storefrontListingsSeed) {
    const exists = await prisma.listing.findFirst({ where: { title: row.title } });
    if (exists) continue;
    const authorId = contentIds.get(row.email);
    if (!authorId) continue;
    const header = [
      `Категория: ${row.categoryLine}`,
      ...row.metaLines,
      '',
      row.intro,
    ].join('\n');
    await prisma.listing.create({
      data: {
        type: row.type,
        authorId,
        title: row.title,
        description: header,
        region: row.region,
      },
    });
  }

  const fillArticlesSeed: Array<{
    title: string;
    excerpt: string;
    body: string;
    categorySlug: string;
    authorEmail: string;
  }> = [
    {
      title: '[Наполнение] Шкала боли у кошек и собак: практика приёма',
      excerpt: 'Учебный материал по поведенческим маркерам для стажёров.',
      body:
        '## Введение\n\nВизуальные шкалы помогают стандартизировать отчётность.\n\n## Ограничения\n\nНе заменяют оценку врача и хозяина.\n\n> Демо-контент VetConnect.',
      categorySlug: 'protocols',
      authorEmail: contentUserEmails[0]!,
    },
    {
      title: '[Наполнение] Обновления по вакцинации против бешенства (обзор)',
      excerpt: 'Сводка для коллег; сверяйте с регистрацией конкретных вакцин.',
      body:
        'Кратко о циклах ревакцинации и документообороте. Не является протоколом клиники.',
      categorySlug: 'news',
      authorEmail: contentUserEmails[1]!,
    },
    {
      title: '[Наполнение] ЭКГ у брахицефалов: типичные артефакты',
      excerpt: 'Как отличить артефакт от истинной аритмии на демо-записи.',
      body:
        'Позиционирование электродов и дыхательные движения дают характерные искажения.\nУчебный текст.',
      categorySlug: 'cardiology',
      authorEmail: contentUserEmails[2]!,
    },
    {
      title: '[Наполнение] Премедикация перед ортопедией: чек-лист',
      excerpt: 'Чек-лист подготовки пациента для операционной (образование).',
      body:
        'Проверка анализов, голодная диета, коммуникация с анестезиологом — без конкретных дозировок.',
      categorySlug: 'anesthesiology',
      authorEmail: contentUserEmails[3]!,
    },
    {
      title: '[Наполнение] Стресс рептилий в стационаре и микроклимат',
      excerpt: 'Почему температура и темнота не менее важны, чем у млекопитающих.',
      body:
        'Кратко о ящиках, градиенте температуры и минимизации визита к врагу.\n\nДемонстрационный материал.',
      categorySlug: 'exotics',
      authorEmail: contentUserEmails[4]!,
    },
    {
      title: '[Наполнение] Аллергический дерматит: когда думать о пище',
      excerpt: 'Не заменяет протокол ветдерматолога; для студенческих разборов.',
      body:
        'От паразитов к пище: образовательный скелет, без маркетинга диет.',
      categorySlug: 'dermatology',
      authorEmail: contentUserEmails[5]!,
    },
    {
      title: '[Наполнение] Интерпретация АЛТ/АСТ при ожирении у кошек',
      excerpt: 'На что смотреть в биохимии вместе с анамнезом кормления.',
      body:
        'Коротко о паттернах при гепатической липидозе против других состояний (учебное).',
      categorySlug: 'diagnostics',
      authorEmail: contentUserEmails[6]!,
    },
    {
      title: '[Наполнение] Инсулин собакам: ключевые моменты мониторинга',
      excerpt: 'Глюкоза, фруктозамин, клинический статус без подбора препарата.',
      body:
        'Повторяем важность дневника и сообщения владельца о симптомах гипогликемии.',
      categorySlug: 'endocrinology',
      authorEmail: contentUserEmails[7]!,
    },
    {
      title: '[Наполнение] Реабилитация после пателлярной дисплазии',
      excerpt: 'Этапы нагрузки и контроль боли после операции.',
      body:
        'Не заменяет реабилитологический план; для обсуждения в сообществе.',
      categorySlug: 'orthopedics',
      authorEmail: contentUserEmails[8]!,
    },
    {
      title: '[Наполнение] Обсуждение подозрения на опухоль с хозяином',
      excerpt: 'Мягкая коммуникация и понятное планирование до гистологии.',
      body:
        'Эмпатичные формулировки без ложных прогнозов; локальное право всегда важнее ленты советов.',
      categorySlug: 'oncology',
      authorEmail: contentUserEmails[9]!,
    },
  ];

  const createdArticleIds: string[] = [];
  for (const row of fillArticlesSeed) {
    const dup = await prisma.article.findFirst({ where: { title: row.title } });
    let artId = dup?.id ?? null;
    if (!dup) {
      const cat = await prisma.articleCategory.findUnique({ where: { slug: row.categorySlug } });
      if (!cat) {
        console.warn(`Seed: пропуск статьи [наполнение], нет категории ${row.categorySlug}`);
        continue;
      }
      const aid = contentIds.get(row.authorEmail);
      if (!aid) continue;
      const created = await prisma.article.create({
        data: {
          title: row.title,
          excerpt: row.excerpt,
          body: row.body,
          categoryId: cat.id,
          authorId: aid,
          published: true,
        },
      });
      artId = created.id;
    }
    if (artId) createdArticleIds.push(artId);
  }

  for (const artId of createdArticleIds) {
    const commentCount = await prisma.articleComment.count({ where: { articleId: artId } });
    if (commentCount > 0) continue;
    const art = await prisma.article.findUnique({ where: { id: artId }, select: { authorId: true } });
    if (!art) continue;
    const commentators = [...contentIds.values()].filter((id) => id !== art.authorId).slice(0, 4);
    const bodies = [
      'Спасибо за систематизацию, перешлю стажёрской группе.',
      'На практике добавляли бы мониторинг веса животного в течение недели после приёма.',
      'Отличный скелет; у нас региональная комиссия требует иной документ для вакцин — имеет смысл уточнить локально.',
    ];
    for (let i = 0; i < Math.min(3, commentators.length); i++) {
      await prisma.articleComment.create({
        data: { articleId: artId, authorId: commentators[i]!, body: bodies[i % bodies.length]! },
      });
    }
  }

  const forumCatSlugsForFill = [
    'therapy',
    'surgery',
    'diagnostics',
    'pharmacy',
    'dental',
    'dermatology',
    'ophthalmology',
    'cardiology',
    'nutrition',
    'exotics-birds',
  ];
  const fillThreads: Array<{ slug: string; title: string; tags: string; opener: string; replies: string[] }> = [
    {
      slug: forumCatSlugsForFill[0]!,
      title: '[Наполнение] Терапия: как описываем «стабильность» состояния',
      tags: 'терапия,документооборот,demo-fill',
      opener:
        'Коллеги, хотелось бы согласовать формулировки для медкарты: что считаем улучшением vs стабильностью?',
      replies: ['Мы добавляем оценку по шкале влажности слизистых и активности.', 'Стабильность без динамики 48–72 ч фиксируем отдельной записью.', 'Важно согласовать с страховкой/локальными формами, если они есть.'],
    },
    {
      slug: forumCatSlugsForFill[1]!,
      title: '[Наполнение] Хирургия: обезболивание после блокад',
      tags: 'хирургия,алгезия',
      opener: 'Поделитесь опытом: как фиксируете хронологию блокад перед разрезом в учётной системе?',
      replies: ['Пишем время введения и препарат в протоколе анестезиолога.', 'Для малой практики — отдельный лист наблюдений после операции.'],
    },
    {
      slug: forumCatSlugsForFill[2]!,
      title: '[Наполнение] УЗИ: одна секция — один отчёт?',
      tags: 'узи,диагностика',
      opener: 'Когда объединяете брюшную полость и почки в один заключённый файл клиенту?',
      replies: ['Разделяем, если есть подозрение на передачу между клиниками.', 'Клиентским PDF — общий файл, для архива иногда два.'],
    },
    {
      slug: forumCatSlugsForFill[3]!,
      title: '[Наполнение] Совместимость препаратов в инфузии (учебное)',
      tags: 'аптека,совместимость',
      opener: 'Напомните студентам: смешивание в одном расширителе — только по официальной таблице.',
      replies: ['Держим laminated sheet от поставщика флаконов.', 'В чат кидаем ссылку на регистрационное удостоверение как первоисточник.'],
    },
    {
      slug: forumCatSlugsForFill[4]!,
      title: '[Наполнение] Полировка после масштабирования у мелкой собаки',
      tags: 'стоматология,мелкие',
      opener: 'Кто как фиксирует индексируемость поверхности после полировочной пасты?',
      replies: ['Фото до/после в карте + коммент хозяина о шуме во время кормления.'],
    },
    {
      slug: forumCatSlugsForFill[5]!,
      title: '[Наполнение] Отличие вторичной инфекции от первичной аллергии',
      tags: 'дерматология,диффдиагностика',
      opener: 'Согласование таксономии проб: цитология vs посев?',
      replies: ['Цитология сначала, посев если гной.', 'Клиент получает понятную «дорожную карту» диагностики.'],
    },
    {
      slug: forumCatSlugsForFill[6]!,
      title: '[Наполнение] Комок «тёмного секрета» у кошки: дифдиагностика',
      tags: 'глаза,слёзная',
      opener: 'Схематично описываю кейс для студентов без фото пациента.',
      replies: ['Добавьте упоминание измерения ДРУ при подозрении на гипотонию камеры.'],
    },
    {
      slug: forumCatSlugsForFill[7]!,
      title: '[Наполнение] После операции сердца у кота: наблюдение дома',
      tags: 'кардиология,постоп',
      opener: 'Как короткий чек-лист без перегрузки клиента?',
      replies: ['Набор из 6 буллетов: дыхание, аппетит, кашель, рвота и т.д.', 'Подписываем контакт экстренной линии.'],
    },
    {
      slug: forumCatSlugsForFill[8]!,
      title: '[Наполнение] Корм после гастропатии: когда возвращаться к прежнему рациону',
      tags: 'питание,гастропатия',
      opener: 'Поэтапная реинтродукция с учётом стресса переезда — опыт?',
      replies: ['7–14 дней гастро-линии, затем смешение 25%/50%/75%', 'Клиент всегда ведёт календарь кормления.'],
    },
    {
      slug: forumCatSlugsForFill[9]!,
      title: '[Наполнение] Карантин попугая после покупки: разумная длительность',
      tags: 'птицы,карантин',
      opener: 'В личной практике держите птицу отдельно сколько времени перед вольером?',
      replies: ['Минимум 30 дней при отрицательных мазках.', 'Согласование с официальными требованиями импортёров.'],
    },
  ];

  for (let i = 0; i < fillThreads.length; i++) {
    const spec = fillThreads[i]!;
    const exists = await prisma.forumThread.findFirst({ where: { title: spec.title } });
    if (exists) continue;
    const cat = await prisma.forumCategory.findUnique({ where: { slug: spec.slug } });
    if (!cat) {
      console.warn(`Seed: пропуск темы [наполнение], нет категории ${spec.slug}`);
      continue;
    }
    const authorEmail = contentUserEmails[i % contentUserEmails.length]!;
    const authorId = contentIds.get(authorEmail)!;
    if (!authorId) continue;
    const replyAuthorIds = contentUserEmails
      .filter((_, j) => j !== i % contentUserEmails.length)
      .slice(0, spec.replies.length)
      .map((e) => contentIds.get(e)!)
      .filter(Boolean);

    const thread = await prisma.forumThread.create({
      data: {
        title: spec.title,
        tags: spec.tags,
        categoryId: cat.id,
        authorId,
        posts: {
          create: [{ authorId, body: spec.opener }],
        },
      },
    });
    for (let r = 0; r < spec.replies.length; r++) {
      const pid = replyAuthorIds[r];
      if (!pid) continue;
      await prisma.forumPost.create({
        data: { threadId: thread.id, authorId: pid, body: spec.replies[r]! },
      });
    }
  }

  const demoWebinarStart = new Date();
  demoWebinarStart.setDate(demoWebinarStart.getDate() + 21);
  demoWebinarStart.setHours(16, 0, 0, 0);
  const demoConfStart = new Date();
  demoConfStart.setMonth(demoConfStart.getMonth() + 2, 10);
  demoConfStart.setHours(9, 0, 0, 0);

  await prisma.vetEvent.upsert({
    where: { slugKey: 'seed:demo_clinical_audit_webinar' },
    update: {
      title: 'Вебинар: клинический аудит и протоколы (демо)',
      description: 'Демо-запись в календаре VetConnect. Реальные даты появятся после подключения открытых ICS/RSS в настройках.',
      organizers: 'Образовательный комитет VetConnect (демо)',
      audience: 'Практикующие ветврачи и руководители клиник',
      eventFormat: 'Онлайн, без записи (демо)',
      startsAt: demoWebinarStart,
      endsAt: new Date(demoWebinarStart.getTime() + 2 * 60 * 60_000),
    },
    create: {
      slugKey: 'seed:demo_clinical_audit_webinar',
      title: 'Вебинар: клинический аудит и протоколы (демо)',
      description:
        'Демо-запись в календаре VetConnect. Реальные даты появятся после подключения открытых ICS/RSS в настройках.',
      location: 'Онлайн',
      organizers: 'Образовательный комитет VetConnect (демо)',
      audience: 'Практикующие ветврачи и руководители клиник',
      eventFormat: 'Онлайн, без записи (демо)',
      url: null,
      startsAt: demoWebinarStart,
      endsAt: new Date(demoWebinarStart.getTime() + 2 * 60 * 60_000),
      source: 'seed',
      sourceFeed: 'seed',
      externalUid: 'seed:demo_clinical_audit_webinar',
    },
  });

  await prisma.vetEvent.upsert({
    where: { slugKey: 'seed:demo_regional_vet_congress' },
    update: {
      title: 'Региональный ветеринарный конгресс (демо)',
      description: 'Демо-событие на несколько дней. Полный охват конференций — через внешние открытые календари.',
      organizers: 'Оргкомитет конференции (демо)',
      audience: 'Специалисты всех профилей',
      eventFormat: 'Офлайн, симпозиум (демо)',
      startsAt: demoConfStart,
      endsAt: new Date(demoConfStart.getTime() + 8 * 60 * 60_000),
    },
    create: {
      slugKey: 'seed:demo_regional_vet_congress',
      title: 'Региональный ветеринарный конгресс (демо)',
      description:
        'Демо-событие на несколько дней. Полный охват конференций — через внешние открытые календари.',
      location: 'Москва (условный адрес)',
      organizers: 'Оргкомитет конференции (демо)',
      audience: 'Специалисты всех профилей',
      eventFormat: 'Офлайн, симпозиум (демо)',
      url: null,
      startsAt: demoConfStart,
      endsAt: new Date(demoConfStart.getTime() + 8 * 60 * 60_000),
      source: 'seed',
      sourceFeed: 'seed',
      externalUid: 'seed:demo_regional_vet_congress',
    },
  });

  const configuredCountryDemoTotal = countryUserCounts.reduce((s, x) => s + x.count, 0);
  console.log('Seed OK. Пароль для всех демо-пользователей: Demo123!');
  console.log('  vet@vetmvp.local — ADMIN (основной демо-вход + админ-панель)');
  console.log('  specialist@vetmvp.local — SPECIALIST (тест без прав админа)');
  console.log('  admin@vetmvp.local, moderator@vetmvp.local — как раньше');
  console.log('  fill05@…fill10@vetmvp.local — доп. SPECIALIST с аватарами (наполнение контента)');
  console.log(
    `  country demos: в БД ${countrySeedEmails.length} акка. (конфиг ${configuredCountryDemoTotal}, см. лог блока Seed [country demos] по странам). Повторный seed из backend: npm run seed`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
