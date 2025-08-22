import { Inject, Injectable } from '@nestjs/common';

import { CreatePaymentResponseDto } from './dto/create-payment-response.dto';
import { ClientProxy } from '@nestjs/microservices';
import { EventData } from 'src/util/EventData';
import { ConfirmPaymentResponseDto } from './dto/confirm-payment-response.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentService {
  constructor(
    @Inject('PAYMENT') private readonly paymentQueueClient: ClientProxy,
  ) {}

  async createPayment(createPaymentDto: CreatePaymentDto) {
    const apiResponse = await this.callCreatePayment(createPaymentDto);

    if (apiResponse.success) {
      console.log(`Payment creation: ${apiResponse.paymentId}`);
      this.paymentQueueClient.emit(
        'payment.create.result',
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
        'payment.create.result',
        new EventData<CreatePaymentResponseDto>({
          orderId: createPaymentDto.orderId,
          success: false,
          message: apiResponse.message,
        }),
      );
    }
  }

  async callCreatePayment(
    createPaymentDto: CreatePaymentDto,
  ): Promise<CreatePaymentResponseDto> {
    console.log(`Creating payment for OrderId: ${createPaymentDto.orderId}`);
    // API delay
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 10000));

    // Simulate 99% chance of success
    if (Math.random() < 0.99) {
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

  async confirmPayment(confirmPaymentDto: ConfirmPaymentDto): Promise<void> {
    const apiResponse = await this.callConfirmPayment(confirmPaymentDto);

    if (apiResponse.success) {
      console.log(`Payment confimed: ${apiResponse.paymentId}`);
      this.paymentQueueClient.emit(
        'payment.confirm.result',
        new EventData<CreatePaymentResponseDto>({
          success: true,
          orderId: confirmPaymentDto.orderId,
          paymentId: apiResponse.paymentId,
          message: apiResponse.message,
        }),
      );
    } else {
      console.error(`Payment creation failed: ${apiResponse.message}`);
      this.paymentQueueClient.emit(
        'payment.confirm.result',
        new EventData<CreatePaymentResponseDto>({
          orderId: confirmPaymentDto.orderId,
          success: false,
          message: apiResponse.message,
        }),
      );
    }
  }

  async callConfirmPayment(
    confirmPaymentDto: ConfirmPaymentDto,
  ): Promise<ConfirmPaymentResponseDto> {
    console.log(`Confirming payment for OrderId: ${confirmPaymentDto.orderId}`);
    // API delay
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 10000));

    // Simulate 99% chance of success
    if (Math.random() < 0.99) {
      // console.log('Payment created successfully');
      return {
        orderId: confirmPaymentDto.orderId,
        success: true,
        paymentId: Math.floor(Math.random() * 100000),
        message: 'Payment confirmed successfully',
      };
    } else {
      // console.log('Error creating payment');
      return {
        orderId: confirmPaymentDto.orderId,
        success: false,
        message: 'Failed to confirm payment due to API error',
      };
    }
  }
}
