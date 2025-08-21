import crypto from 'node:crypto';

export class EventData<T> {
  eventId: string;
  data: T;

  constructor(data: T) {
    this.eventId = crypto.randomUUID();
    this.data = data;
  }
}
