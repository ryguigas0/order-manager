import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'PAYMENT',
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
    ]),
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
})
export class PaymentModule {}
