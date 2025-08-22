import { Inject, Injectable, Logger } from '@nestjs/common';

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
  private readonly logger = new Logger(PaymentService.name);

  async createPayment(createPaymentDto: CreatePaymentDto) {
    const apiResponse = await this.callCreatePayment(createPaymentDto);

    if (apiResponse.success) {
      this.logger.debug(`Payment creation: ${apiResponse.paymentId}`);
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
      this.logger.error(`Payment creation failed: ${apiResponse.message}`);
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
    this.logger.debug(
      `Creating payment for OrderId: ${createPaymentDto.orderId}`,
    );
    // API delay
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 100));

    // Simulate 99% chance of success
    if (Math.random() < 0.99) {
      this.logger.debug('Payment created successfully');
      return {
        orderId: createPaymentDto.orderId,
        success: true,
        paymentId: Math.floor(Math.random() * 10000),
        message: 'Payment created successfully',
      };
    } else {
      this.logger.error('Error creating payment');
      return {
        orderId: createPaymentDto.orderId,
        success: false,
        message: 'Failed to create payment due to API error',
      };
    }
  }

  async confirmPayment(event: EventData<ConfirmPaymentDto>): Promise<void> {
    const { data } = event;

    const apiResponse = await this.callConfirmPayment(data);

    if (apiResponse.success) {
      this.logger.debug(`Payment confimed: ${apiResponse.paymentId}`);
      this.paymentQueueClient.emit(
        'payment.confirm.result',
        new EventData<CreatePaymentResponseDto>(
          {
            success: true,
            orderId: data.orderId,
            paymentId: apiResponse.paymentId,
            message: apiResponse.message,
          },
          event.currentTry,
          event.backoff,
        ),
      );
    } else {
      this.logger.error(`Payment confirmation failed: ${apiResponse.message}`);
      this.paymentQueueClient.emit(
        'payment.confirm.result',
        new EventData<CreatePaymentResponseDto>(
          {
            orderId: data.orderId,
            success: false,
            message: apiResponse.message,
          },
          event.currentTry,
          event.backoff,
        ),
      );
    }
  }

  async callConfirmPayment(
    confirmPaymentDto: ConfirmPaymentDto,
  ): Promise<ConfirmPaymentResponseDto> {
    this.logger.debug(
      `Confirming payment for OrderId: ${confirmPaymentDto.orderId}`,
    );
    // API delay
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 100));

    if (Math.random() < 0.4) {
      this.logger.debug('Payment created successfully');
      return {
        orderId: confirmPaymentDto.orderId,
        success: true,
        paymentId: Math.floor(Math.random() * 100000),
        message: 'Payment confirmed successfully',
      };
    } else {
      this.logger.error('Error creating payment');
      return {
        orderId: confirmPaymentDto.orderId,
        success: false,
        message: 'Failed to confirm payment due to API error',
      };
    }
  }
}
