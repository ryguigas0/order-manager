import { Module } from '@nestjs/common';
import { BackofficeController } from './backoffice.controller';
import { ClientsModule } from '@nestjs/microservices';
import { MongooseModule } from '@nestjs/mongoose';
import { BackofficeService } from './backoffice.service';
import { DeadLetter, DeadLetterSchema } from './schemas/dead-letter.schema';
import { ConfigService } from '@nestjs/config';
import { getRmqOptions } from 'src/config/rmq-client.config';

@Module({
  imports: [
    MongooseModule.forRoot(
      'mongodb://root:root@localhost:27017/order_manager',
      { authSource: 'admin' },
    ),
    MongooseModule.forFeature([
      { name: DeadLetter.name, schema: DeadLetterSchema },
    ]),
    ClientsModule.registerAsync([
      {
        name: 'DEBUG_ORDER',
        inject: [ConfigService],
        useFactory: (configService: ConfigService) =>
          getRmqOptions('orders', configService),
      },
      {
        name: 'DEBUG_DLQ',
        inject: [ConfigService],
        useFactory: (configService: ConfigService) =>
          getRmqOptions('dlq', configService),
      },
    ]),
  ],
  controllers: [BackofficeController],
  providers: [BackofficeService],
})
export class BackofficeModule {}
