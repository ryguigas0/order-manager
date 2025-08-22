import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: ['amqp://guest:guest@localhost:5672'],
      queue: 'orders',
      exchange: 'orders',
      exchangeType: 'topic',
      wildcards: true,
      persistent: true,
      queueOptions: {
        durable: true,
        messageTtl: 5000,
        arguments: {
          'x-dead-letter-exchange': 'infra',
          'x-dead-letter-routing-key': 'dlq',
        },
      },
    },
  });

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: ['amqp://guest:guest@localhost:5672'],
      queue: 'stock',
      exchange: 'orders',
      exchangeType: 'topic',
      wildcards: true,
      persistent: true,
      queueOptions: {
        durable: true,
        messageTtl: 5000,
        arguments: {
          'x-dead-letter-exchange': 'infra',
          'x-dead-letter-routing-key': 'dlq',
        },
      },
    },
  });

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: ['amqp://guest:guest@localhost:5672'],
      queue: 'payment',
      exchange: 'orders',
      exchangeType: 'topic',
      wildcards: true,
      persistent: true,
      queueOptions: {
        durable: true,
        messageTtl: 5000,
      },
    },
  });

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: ['amqp://guest:guest@localhost:5672'],
      queue: 'dlq',
      exchange: 'infra',
      exchangeType: 'topic',
      persistent: true,
      queueOptions: {
        durable: true,
        messageTtl: 5000,
      },
    },
  });

  await app.startAllMicroservices();
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
