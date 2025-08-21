import { Controller, Inject } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { ClientProxy, EventPattern, Payload } from '@nestjs/microservices';
import { CreateStockReservationResponseDto } from 'src/stock/dto/create-stock-reservation-response.dto';
import { EventData } from 'src/util/EventData';
import { CreatePaymentResponseDto } from 'src/payment/dto/create-payment-response.dto';

@Controller()
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    @Inject('ORDER') private readonly orderQueue: ClientProxy,
    @Inject('ORDER_STOCK_RESERVATION')
    private readonly stockReservationQueue: ClientProxy,
    @Inject('ORDER_PAYMENT') private readonly paymentQueue: ClientProxy,
  ) {}

  @EventPattern('orders.create')
  async handleCreateOrder(@Payload() payload: EventData<CreateOrderDto>) {
    await this.ordersService.createOrder(payload);
  }

  @EventPattern('payment.result')
  async handlePaymentResult(
    @Payload() payload: EventData<CreatePaymentResponseDto>,
  ) {
    if (!payload.data.success) {
      console.log('Canceling order', payload.data.orderId);
      await this.ordersService.cancelOrder({
        eventId: payload.eventId,
        orderId: payload.data.orderId,
        reason: payload.data.message,
      });
      return;
    }

    console.log('Payment: ', payload);
  }

  @EventPattern('stock.reservation.result')
  async handleStockReservationResult(
    @Payload() payload: EventData<CreateStockReservationResponseDto>,
  ) {
    if (!payload.data.success) {
      console.log('Canceling order', payload.data.orderId);
      await this.ordersService.cancelOrder({
        eventId: payload.eventId,
        orderId: payload.data.orderId,
        reason: payload.data.message,
      });
      return;
    }
    // Logic to handle stock reservation
    console.log('Stock Reservation:', payload);
  }
}
