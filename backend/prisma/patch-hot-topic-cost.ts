/** Одноразово/повторно синхронизирует базовую цену горячей темы с кодом форума и demo-seed (= 50 VetCoin). */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const r = await prisma.siteSetting.upsert({
    where: { key: 'vetcoin.hot_topic_cost' },
    update: { value: '50' },
    create: { key: 'vetcoin.hot_topic_cost', value: '50' },
  });
  console.log('vetcoin.hot_topic_cost =', r.value);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
