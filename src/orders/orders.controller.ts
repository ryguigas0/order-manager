import { Controller, Inject } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { ClientProxy, EventPattern, Payload } from '@nestjs/microservices';
import { CreateStockReservationResponseDto } from 'src/stock/dto/create-stock-reservation-response.dto';

@Controller()
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    @Inject('ORDER') private readonly orderServiceClient: ClientProxy,
    @Inject('ORDER_STOCK_RESERVATION')
    private readonly orderStockReservationClient: ClientProxy,
  ) {}

  @EventPattern('orders.create')
  handleCreateOrder(@Payload() payload: CreateOrderDto) {
    this.ordersService.createOrder(payload);
  }

  // @EventPattern('payment.result')
  // handlePaymentResult(@Payload() paymentResult: any) {
  //   // Logic to handle payment result
  //   console.log('Payment Result:', paymentResult);
  // }

  @EventPattern('stock.reservation.result')
  handleStockReservationResult(
    @Payload() payload: CreateStockReservationResponseDto,
  ) {
    // Logic to handle stock reservation
    console.log('Stock Reservation:', payload);
  }
}
