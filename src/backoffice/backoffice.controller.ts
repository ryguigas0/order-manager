import { Body, Controller, Inject, Post } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CreateOrderDto } from 'src/orders/dto/create-order.dto';
import { CreateStockReservationDto } from 'src/stock/dto/create-stock-reservation.dto';
import { EventData } from 'src/util/EventData';

@Controller('backoffice')
export class BackofficeController {
  constructor(
    @Inject('DEBUG_ORDER') private readonly orderServiceClient: ClientProxy,
    @Inject('DEBUG_STOCK_RESERVATION')
    private readonly stockQueueClient: ClientProxy,
  ) {}

  @Post('orders')
  async callCreateOrder(@Body() payload: CreateOrderDto) {
    await this.orderServiceClient
      .emit('orders.create', new EventData<CreateOrderDto>(payload))
      .toPromise();
    // console.debug('Order creation request sent:', payload);
    return { message: 'Order creation request sent' };
  }

  @Post('/stock-reservation')
  async callStockReservation(@Body() payload: CreateStockReservationDto) {
    await this.stockQueueClient
      .emit(
        'stock.reservation.create',
        new EventData<CreateStockReservationDto>(payload),
      )
      .toPromise();
    // console.debug('Stock reservation request sent:', payload);
    return { message: 'Stock reservation request sent' };
  }
}
