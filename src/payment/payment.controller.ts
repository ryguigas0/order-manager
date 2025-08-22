import { Controller } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { EventPattern, Payload } from '@nestjs/microservices';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { EventData } from 'src/util/EventData';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';

@Controller()
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @EventPattern('payment.create')
  async handlePaymentCreated(@Payload() payload: EventData<CreatePaymentDto>) {
    return await this.paymentService.createPayment(payload.data);
  }

  @EventPattern('payment.confirm')
  async handlePaymentConfirm(@Payload() payload: EventData<ConfirmPaymentDto>) {
    return await this.paymentService.confirmPayment(payload);
  }
}
