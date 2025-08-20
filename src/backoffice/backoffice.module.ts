import { Module } from '@nestjs/common';
import { BackofficeController } from './backoffice.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'DEBUG_ORDER',
        transport: Transport.RMQ,
        options: {
          urls: ['amqp://guest:guest@localhost:5672'],
          queue: 'orders',
        },
      },
      {
        name: 'DEBUG_STOCK_RESERVATION',
        transport: Transport.RMQ,
        options: {
          urls: ['amqp://guest:guest@localhost:5672'],
          queue: 'stock',
        },
      },
    ]),
  ],
  controllers: [BackofficeController],
})
export class BackofficeModule {}
