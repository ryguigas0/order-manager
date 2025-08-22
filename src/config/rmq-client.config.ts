import { ConfigService } from '@nestjs/config';
import { RmqOptions, Transport } from '@nestjs/microservices';

export const getRmqOptions = (
  queue: string,
  configService: ConfigService,
): RmqOptions => {
  const user = configService.get<string>('RMQ_USER');
  const pass = configService.get<string>('RMQ_PASS');
  const host = configService.get<string>('RMQ_HOST');
  const port = configService.get<string>('RMQ_PORT');

  return {
    transport: Transport.RMQ,
    options: {
      urls: [`amqp://${user}:${pass}@${host}:${port}`],
      queue: queue,
      exchange: 'orders',
      exchangeType: 'topic',
      wildcards: true,
      persistent: true,
      queueOptions: {
        durable: true,
        messageTtl: 5000,
        arguments: {
          'x-dead-letter-exchange': 'orders',
          'x-dead-letter-routing-key': 'dlq',
        },
      },
    },
  };
};
