import { collectDefaultMetrics } from 'prom-client';

let started = false;

export function startDefaultMetrics() {
  if (started) return;
  started = true;
  collectDefaultMetrics({
    // Prometheus scrapes every 15s by default in our config; keep bucket aligned.
    timeout: 10_000,
  });
}

