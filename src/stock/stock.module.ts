import { Module } from '@nestjs/common';
import { StockService } from './stock.service';
import { StockController } from './stock.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'STOCK',
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
  controllers: [StockController],
  providers: [StockService],
})
export class StockModule {}
