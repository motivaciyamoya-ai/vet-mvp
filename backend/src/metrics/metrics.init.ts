import { collectDefaultMetrics } from 'prom-client';

let started = false;

export function startDefaultMetrics() {
  if (started) return;
  started = true;
  collectDefaultMetrics();
}

