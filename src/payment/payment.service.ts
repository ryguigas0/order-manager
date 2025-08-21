import { Inject, Injectable } from '@nestjs/common';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreatePaymentResponseDto } from './dto/create-payment-response.dto';
import { ClientProxy } from '@nestjs/microservices';
import { EventData } from 'src/util/EventData';

@Injectable()
export class PaymentService {
  constructor(
    @Inject('PAYMENT') private readonly paymentQueueClient: ClientProxy,
  ) {}

  async createPayment(createPaymentDto: CreatePaymentDto) {
    const apiResponse = await this.callPayment(createPaymentDto);

    if (apiResponse.success) {
      console.log(`Payment creation: ${apiResponse.paymentId}`);
      this.paymentQueueClient.emit(
        'payment.result',
        new EventData<CreatePaymentResponseDto>({
          success: true,
          orderId: createPaymentDto.orderId,
          paymentId: apiResponse.paymentId,
          message: apiResponse.message,
        }),
      );
    } else {
      console.error(`Payment creation failed: ${apiResponse.message}`);
      this.paymentQueueClient.emit(
        'payment.result',
        new EventData<CreatePaymentResponseDto>({
          orderId: createPaymentDto.orderId,
          success: false,
          message: apiResponse.message,
        }),
      );
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
      // console.log('Payment created successfully');
      return {
        orderId: createPaymentDto.orderId,
        success: true,
        paymentId: Math.floor(Math.random() * 100000),
        message: 'Payment created successfully',
      };
    } else {
      // console.log('Error creating payment');
      return {
        orderId: createPaymentDto.orderId,
        success: false,
        message: 'Failed to create payment due to API error',
      };
    }
  }
}
