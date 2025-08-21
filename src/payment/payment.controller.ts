import { Controller, Inject } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { ClientProxy, EventPattern, Payload } from '@nestjs/microservices';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { EventData } from 'src/util/EventData';

@Controller()
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    @Inject('PAYMENT') private readonly client: ClientProxy,
  ) {}

  @EventPattern('payment.create')
  async handlePaymentCreated(@Payload() payload: EventData<CreatePaymentDto>) {
    return await this.paymentService.createPayment(payload.data);
  }
}
