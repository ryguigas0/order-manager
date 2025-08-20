import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreatePaymentDto } from 'src/payment/dto/create-payment.dto';
import { CreateStockReservationDto } from 'src/stock/dto/create-stock-reservation.dto';

@Injectable()
export class OrdersService {
  constructor(
    @Inject('ORDER_PAYMENT')
    private readonly paymentManagerClient: ClientProxy,
    @Inject('ORDER_STOCK_RESERVATION')
    private readonly stockManagerClient: ClientProxy,
  ) {}

  async createOrder(newOrder: CreateOrderDto) {
    const orderId = Math.floor(Math.random() * 1000);

    const paymentPayload: CreatePaymentDto = {
      orderId: orderId,
      amount: newOrder.totalAmount,
      paymentMethod: newOrder.paymentMethod,
      shippingAddress: newOrder.shippingAddress,
      billingAddress: newOrder.billingAddress,
    };

    await this.paymentManagerClient
      .emit('payment.create', paymentPayload)
      .toPromise();

    const stockReservationPayload: CreateStockReservationDto = {
      orderId: orderId,
      productId: newOrder.productId,
      quantity: newOrder.quantity,
    };

    await this.stockManagerClient
      .emit('stock.reservation.create', stockReservationPayload)
      .toPromise();
  }
}
