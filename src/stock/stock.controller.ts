import { Controller, Inject } from '@nestjs/common';
import { ClientProxy, EventPattern, Payload } from '@nestjs/microservices';
import { StockService } from './stock.service';
import { CreateStockReservationDto } from './dto/create-stock-reservation.dto';

@Controller()
export class StockController {
  constructor(
    private readonly stockService: StockService,
    @Inject('STOCK') private readonly stockQueueClient: ClientProxy,
  ) {}

  @EventPattern('stock.reservation.create')
  async handleReserveStock(@Payload() payload: CreateStockReservationDto) {
    await this.stockService.create(payload);
  }
}
