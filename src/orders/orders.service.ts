import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CreateOrderDto } from './dto/create-order.dto';
// import { CreatePaymentDto } from 'src/payment/dto/create-payment.dto';
import { CreateStockReservationDto } from 'src/stock/dto/create-stock-reservation.dto';

@Injectable()
export class OrdersService {
  constructor(
    // @Inject('PAYMENT_MANAGER')
    // private readonly paymentManagerClient: ClientProxy,
    @Inject('ORDER_STOCK_RESERVATION')
    private readonly stockManagerClient: ClientProxy,
  ) {}

  createOrder(newOrder: CreateOrderDto) {
    const orderId = Math.floor(Math.random() * 1000);

    // this.paymentManagerClient.emit('payment.create', {
    //   amount: newOrder.totalAmount,
    //   paymentMethod: newOrder.paymentMethod,
    //   shippingAddress: newOrder.shippingAddress,
    //   billingAddress: newOrder.billingAddress,
    // } as CreatePaymentDto);

    const stockReservationPayload: CreateStockReservationDto = {
      orderId: orderId,
      productId: newOrder.productId,
      quantity: newOrder.quantity,
    };

    this.stockManagerClient.emit(
      'stock.reservation.create',
      stockReservationPayload,
    );
  }
}
