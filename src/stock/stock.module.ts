import { Module } from '@nestjs/common';
import { StockService } from './stock.service';
import { StockController } from './stock.controller';
import { ClientsModule } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { getRmqOptions } from 'src/config/rmq-client.config';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'STOCK',
        inject: [ConfigService],
        useFactory: (configService: ConfigService) =>
          getRmqOptions('stock', configService),
      },
      {
        name: 'DEBUG_DLQ',
        inject: [ConfigService],
        useFactory: (configService: ConfigService) =>
          getRmqOptions('dlq', configService),
      },
    ]),
  ],
  controllers: [StockController],
  providers: [StockService],
})
export class StockModule {}
