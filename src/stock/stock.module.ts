import { Module } from '@nestjs/common';
import { StockService } from './stock.service';
import { StockController } from './stock.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    ClientsModule.register([
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
  controllers: [StockController],
  providers: [StockService],
})
export class StockModule {}
