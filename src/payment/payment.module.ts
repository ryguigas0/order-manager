import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { ClientsModule } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { getRmqOptions } from 'src/config/rmq-client.config';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'PAYMENT',
        inject: [ConfigService],
        useFactory: (configService: ConfigService) =>
          getRmqOptions('payment', configService),
      },
    ]),
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
})
export class PaymentModule {}
