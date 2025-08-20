import { Body, Controller, Inject, Post } from '@nestjs/common';
import { ClientProxy, MessagePattern, Payload } from '@nestjs/microservices';
import { StockService } from './stock.service';
import { CreateStockReservationDto } from './dto/create-stock-reservation.dto';
import { PayloadData } from 'types/payload-data';

@Controller()
export class StockController {
  constructor(
    private readonly stockService: StockService,
    @Inject('STOCK_SERVICE') private readonly stockQueueClient: ClientProxy,
  ) {}

  @Post('/stock-reservation')
  callStockReservation(
    @Body() payload: PayloadData<CreateStockReservationDto>,
  ) {
    this.stockQueueClient.send('stock.reservation.create', payload.data);
    return { message: 'Stock reservation request sent' };
  }

  @MessagePattern('stock.reservation.create')
  async create(@Payload() payload: PayloadData<CreateStockReservationDto>) {
    await this.stockService.create(payload.data);
  }
}
