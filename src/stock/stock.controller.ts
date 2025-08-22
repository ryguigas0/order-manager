import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { StockService } from './stock.service';
import { CreateStockReservationDto } from './dto/create-stock-reservation.dto';
import { EventData } from 'src/util/EventData';
import { ConfirmStockReservationDto } from './dto/confirm-stock-reservation.dto';

@Controller()
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @EventPattern('stock.reservation.create')
  async handleReserveStock(
    @Payload() payload: EventData<CreateStockReservationDto>,
  ) {
    await this.stockService.create(payload.data);
  }

  @EventPattern('stock.reservation.confirm')
  async handleConfirmReserveStock(
    @Payload() payload: EventData<ConfirmStockReservationDto>,
  ) {
    await this.stockService.confirm(payload);
  }
}
