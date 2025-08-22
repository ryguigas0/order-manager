import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { ClientsModule } from '@nestjs/microservices';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from './schemas/order.schema';
import { OrderReport, OrderReportSchema } from './schemas/order-report.schema';
import { ConfigService } from '@nestjs/config';
import { getRmqOptions } from 'src/config/rmq-client.config';

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
    ClientsModule.registerAsync([
      {
        name: 'ORDER',
        inject: [ConfigService],
        useFactory: (configService: ConfigService) =>
          getRmqOptions('orders', configService), // Fila 'orders'
      },
      {
        name: 'ORDER_PAYMENT',
        inject: [ConfigService],
        useFactory: (configService: ConfigService) =>
          getRmqOptions('payment', configService), // Fila 'payment'
      },
      {
        name: 'ORDER_STOCK_RESERVATION',
        inject: [ConfigService],
        useFactory: (configService: ConfigService) =>
          getRmqOptions('stock', configService), // Fila 'stock'
      },
    ]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
