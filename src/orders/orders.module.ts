import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from './schemas/order.schema';
import { OrderReport, OrderReportSchema } from './schemas/order-report.schema';

@Module({
  imports: [
    MongooseModule.forRoot(
      'mongodb://root:root@localhost:27017/order_manager',
      { authSource: 'admin' },
    ),
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: OrderReport.name, schema: OrderReportSchema },
    ]),
    ClientsModule.register([
      {
        name: 'ORDER',
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
        name: 'ORDER_PAYMENT',
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
            arguments: {
              'x-dead-letter-exchange': 'infra',
              'x-dead-letter-routing-key': 'dlq',
            },
          },
        },
      },
      {
        name: 'ORDER_STOCK_RESERVATION',
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
      },
    ]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
