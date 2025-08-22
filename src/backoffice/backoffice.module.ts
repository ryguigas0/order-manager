import { Module } from '@nestjs/common';
import { BackofficeController } from './backoffice.controller';
import { ClientsModule } from '@nestjs/microservices';
import { MongooseModule } from '@nestjs/mongoose';
import { BackofficeService } from './backoffice.service';
import { DeadLetter, DeadLetterSchema } from './schemas/dead-letter.schema';
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
