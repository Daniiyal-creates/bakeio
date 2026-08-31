/**
 * Baileys expects a pino-shaped logger, and so do we.
 * Level defaults to info for our own lines; Baileys' internals stay at warn
 * unless LOG_LEVEL says otherwise, because they are extremely chatty.
 */

import pino from 'pino';

export const log = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  base: undefined,
});

/** Quieter child handed to Baileys so protocol noise stays out of the logs. */
export const baileysLog = pino({ level: process.env.BAILEYS_LOG_LEVEL ?? 'warn', base: undefined });
