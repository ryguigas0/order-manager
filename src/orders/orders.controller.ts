import { Body, Controller, Inject, Post } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { ClientProxy, EventPattern, Payload } from '@nestjs/microservices';
import { CreateStockReservationResponseDto } from 'src/stock/dto/create-stock-reservation-response.dto';
import { PayloadData } from 'types/payload-data';

@Controller()
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    @Inject('ORDER_SERVICE') private readonly orderServiceClient: ClientProxy,
  ) {}

  @Post('orders')
  callCreateOrder(@Body() payload: CreateOrderDto) {
    this.orderServiceClient.emit('orders.create', payload);
    return { message: 'Order creation request sent' };
  }

  @EventPattern('orders.create')
  createOrder(@Payload() payload: PayloadData<CreateOrderDto>) {
    // Logic to handle order creation
    this.ordersService.createOrder(payload.data);
  }

  // @EventPattern('payment.result')
  // handlePaymentResult(@Payload() paymentResult: any) {
  //   // Logic to handle payment result
  //   console.log('Payment Result:', paymentResult);
  // }

  @EventPattern('stock.reservation.result')
  handleStockReservationResult(
    @Payload() payload: PayloadData<CreateStockReservationResponseDto>,
  ) {
    // Logic to handle stock reservation
    console.log('Stock Reservation:', payload.data);
  }
}
