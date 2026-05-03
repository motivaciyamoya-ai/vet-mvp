/** Классификация User-Agent: поисковые и прочие роботы для «живой» статистики. */

export type BotClassifyResult = {
  isBot: boolean;
  /** Краткое имя бота или пусто для обычных браузеров */
  botFamily: string | null;
};

const SEARCH_AND_MAJOR_BOTS: { re: RegExp; name: string }[] = [
  { re: /googlebot|google-inspectiontool|adsbot-google|mediapartners-google/i, name: 'Google' },
  { re: /bingbot|msnbot|adidxbot/i, name: 'Microsoft Bing' },
  { re: /yandexbot|yandexmetrika|yandex\s*webmaster/i, name: 'Yandex' },
  { re: /duckduckbot/i, name: 'DuckDuckGo' },
  { re: /baiduspider/i, name: 'Baidu' },
  { re: /applebot/i, name: 'Apple' },
  { re: /petalbot/i, name: 'Petal (Huawei)' },
  { re: /ahrefsbot|semrushbot|dotbot|majestic|mj12bot|screaming\s*frog|sitebulb/i, name: 'SEO / аудит' },
];

const OTHER_BOTS: { re: RegExp; name: string }[] = [
  { re: /facebookexternalhit|facebot|meta-externalagent/i, name: 'Facebook / Meta' },
  { re: /twitterbot/i, name: 'Twitter' },
  { re: /linkedinbot/i, name: 'LinkedIn' },
  { re: /slackbot|slack-imgproxy/i, name: 'Slack' },
  { re: /telegrambot/i, name: 'Telegram' },
  { re: /whatsapp/i, name: 'WhatsApp' },
  { re: /bytespider/i, name: 'ByteDance' },
  { re: /discordbot/i, name: 'Discord' },
  { re: /gptbot|chatgpt-user|oai-searchbot|anthropic|claude-web|perplexitybot/i, name: 'ИИ-краулер' },
];

const GENERIC_BOT_HINT = /(?<![\w])bot(?![\w])|crawler|spider|scraper|scanner|headless|monitoring|pingdom|uptimerobot|statuscake|checker|httpclient|urllib|java\/|go-http|axios|curl\/|wget|^python-requests/i;

export function classifyUserAgent(raw: string | undefined): BotClassifyResult {
  const ua = (raw ?? '').trim();
  if (!ua) {
    return { isBot: false, botFamily: null };
  }

  for (const { re, name } of SEARCH_AND_MAJOR_BOTS) {
    if (re.test(ua)) return { isBot: true, botFamily: name };
  }
  for (const { re, name } of OTHER_BOTS) {
    if (re.test(ua)) return { isBot: true, botFamily: name };
  }

  if (GENERIC_BOT_HINT.test(ua)) {
    return { isBot: true, botFamily: 'Другой робот' };
  }

  return { isBot: false, botFamily: null };
}

export function snippetUserAgent(ua: string | undefined, max = 160): string {
  const t = (ua ?? '').replace(/\s+/g, ' ').trim();
  if (!t) return '—';
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}
