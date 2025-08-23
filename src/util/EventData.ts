import crypto from 'node:crypto';

type EventBackoff = {
  delay: number; // ms
  maxTries: number;
};

export class EventData<T> {
  eventId: string;
  currentTry: number;
  backoff: EventBackoff;
  data: T;

  constructor(data: T, currentTry?: number, backoff?: EventBackoff) {
    this.eventId = crypto.randomUUID();
    this.data = data;
    if (!currentTry) {
      this.currentTry = 0;
    } else {
      this.currentTry = currentTry;
    }

    if (!backoff) {
      this.backoff = {
        delay: Number.parseInt(process.env.DEFAULT_RETRY_DELAY_MS || '1000'),
        maxTries: Number.parseInt(process.env.DEFAULT_RETRY_MAX_TRIES || '5'),
      };
    } else {
      this.backoff = backoff;
    }
  }
}
