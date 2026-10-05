import { resolveTimeZone } from '@tasknest/domain';
import type { Request } from 'express';

/** The caller's IANA time zone from `X-Timezone`, falling back to UTC. */
export function timeZoneOf(req: Request): string {
  return resolveTimeZone(req.header('x-timezone'));
}
