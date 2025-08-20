import { Inject, Injectable } from '@nestjs/common';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreatePaymentResponseDto } from './dto/create-payment-response.dto';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class PaymentService {
  constructor(
    @Inject('PAYMENT') private readonly paymentQueueClient: ClientProxy,
  ) {}

  async createPayment(createPaymentDto: CreatePaymentDto) {
    const apiResponse = await this.callPayment(createPaymentDto);

    if (apiResponse.success) {
      console.log(`Payment creation: ${apiResponse.paymentId}`);
      this.paymentQueueClient.emit('payment.result', {
        success: true,
        paymentId: apiResponse.paymentId,
        message: apiResponse.message,
      } as CreatePaymentResponseDto);
    } else {
      console.error(`Stock reservation failed: ${apiResponse.message}`);
      this.paymentQueueClient.emit('payment.result', {
        success: false,
        message: apiResponse.message,
      } as CreatePaymentResponseDto);
    }
  }

  async callPayment(
    createPaymentDto: CreatePaymentDto,
  ): Promise<CreatePaymentResponseDto> {
    console.log(
      `Creating payment for OrderId: ${createPaymentDto.orderId}, Amount: ${createPaymentDto.amount}, Method: ${createPaymentDto.paymentMethod}`,
    );
    // API delay
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 10000));

    // Simulate 60% chance of success
    if (Math.random() < 0.6) {
      console.log('Stock reserved successfully');
      return {
        success: true,
        paymentId: Math.floor(Math.random() * 100000),
        message: 'Payment created successfully',
      };
    } else {
      console.log('Error reserving stock');
      return {
        success: false,
        message: 'Failed to create payment due to API error',
      };
    }
  }
}
