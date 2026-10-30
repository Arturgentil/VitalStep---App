import { base44 } from '@/api/base44Client';

const KEY = 'stepvolt.operator_id';

/**
 * StepVolt runs as a public app. Every record is namespaced by an operator id so
 * that data from different people never mixes: the signed-in user id when the
 * platform session exists, otherwise a stable per-device id.
 */
let cached = null;
let pending = null;

function randomId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return `op_${crypto.randomUUID()}`;
  return `op_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export async function getOperatorId() {
  if (cached) return cached;
  if (pending) return pending;
  pending = (async () => {
    let id = null;
    try {
      const me = await base44.auth.me();
      if (me?.id) id = `user_${me.id}`;
    } catch {
      id = null;
    }
    if (!id) {
      try {
        id = localStorage.getItem(KEY);
        if (!id) {
          id = randomId();
          localStorage.setItem(KEY, id);
        }
      } catch {
        id = randomId();
      }
    }
    cached = id;
    return id;
  })();
  return pending;
}

export function getCachedOperatorId() {
  return cached;
}