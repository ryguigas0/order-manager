import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'ORDER_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: ['amqp://rabbitmq:password@localhost:5672'],
          queue: 'orders',
        },
      },
      {
        name: 'PAYMENT_MANAGER',
        transport: Transport.RMQ,
        options: {
          urls: ['amqp://rabbitmq:password@localhost:5672'],
          queue: 'payment',
        },
      },
      {
        name: 'STOCK_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: ['amqp://rabbitmq:password@localhost:5672'],
          queue: 'stock',
        },
      },
    ]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
