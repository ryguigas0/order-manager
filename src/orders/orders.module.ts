import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { ClientsModule } from '@nestjs/microservices';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from './schemas/order.schema';
import { OrderReport, OrderReportSchema } from './schemas/order-report.schema';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getRmqOptions } from 'src/config/rmq-client.config';
import { getMongooseOptions } from 'src/config/mdb-client.config';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        getMongooseOptions(configService),
    }),
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: OrderReport.name, schema: OrderReportSchema },
    ]),
    ClientsModule.registerAsync([
      {
        name: 'ORDER',
        inject: [ConfigService],
        useFactory: (configService: ConfigService) =>
          getRmqOptions('orders', configService),
      },
      {
        name: 'ORDER_PAYMENT',
        inject: [ConfigService],
        useFactory: (configService: ConfigService) =>
          getRmqOptions('payment', configService),
      },
      {
        name: 'ORDER_STOCK_RESERVATION',
        inject: [ConfigService],
        useFactory: (configService: ConfigService) =>
          getRmqOptions('stock', configService),
      },
    ]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
