import { Module } from '@nestjs/common';
import { BackofficeController } from './backoffice.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MongooseModule } from '@nestjs/mongoose';
import { BackofficeService } from './backoffice.service';
import { DeadLetter, DeadLetterSchema } from './schemas/dead-letter.schema';

@Module({
  imports: [
    MongooseModule.forRoot(
      'mongodb://root:root@localhost:27017/order_manager',
      { authSource: 'admin' },
    ),
    MongooseModule.forFeature([
      { name: DeadLetter.name, schema: DeadLetterSchema },
    ]),
    ClientsModule.register([
      {
        name: 'DEBUG_ORDER',
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
      },
      {
        name: 'DEBUG_DLQ',
        transport: Transport.RMQ,
        options: {
          urls: ['amqp://guest:guest@localhost:5672'],
          queue: 'dlq',
          exchange: 'orders',
          exchangeType: 'topic',
          persistent: true,
          queueOptions: {
            durable: true,
            messageTtl: 5000,
          },
        },
      },
    ]),
  ],
  controllers: [BackofficeController],
  providers: [BackofficeService],
})
export class BackofficeModule {}
