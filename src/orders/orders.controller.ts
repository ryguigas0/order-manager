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
    @Inject('ORDER') private readonly orderServiceClient: ClientProxy,
    @Inject('ORDER_STOCK_RESERVATION')
    private readonly orderStockReservationClient: ClientProxy,
    @Inject('ORDER_PAYMENT') private readonly orderPaymentClient: ClientProxy,
  ) {}

  @EventPattern('orders.create')
  async handleCreateOrder(@Payload() payload: EventData<CreateOrderDto>) {
    await this.ordersService.createOrder(payload);
  }

  @EventPattern('payment.result')
  handlePaymentResult(
    @Payload() paymentResult: EventData<CreatePaymentResponseDto>,
  ) {
    // Logic to handle payment result
    console.log('Payment: ', paymentResult);
  }

  @EventPattern('stock.reservation.result')
  handleStockReservationResult(
    @Payload() payload: EventData<CreateStockReservationResponseDto>,
  ) {
    // Logic to handle stock reservation
    console.log('Stock Reservation:', payload);
  }
}
