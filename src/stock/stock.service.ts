import { Inject, Injectable } from '@nestjs/common';
import { CreateStockReservationDto } from './dto/create-stock-reservation.dto';
import { CreateStockReservationResponseDto } from './dto/create-stock-reservation-response.dto';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class StockService {
  constructor(
    @Inject('STOCK') private readonly stockQueueClient: ClientProxy,
  ) {}

  async create(createStockDto: CreateStockReservationDto): Promise<void> {
    const apiResponse = await this.callReserveStock(createStockDto);

    if (apiResponse.success) {
      console.log(`Stock reservation successful: ${apiResponse.reservationId}`);
      this.stockQueueClient.emit('stock.reservation.result', {
        success: true,
        reservationId: apiResponse.reservationId,
        message: apiResponse.message,
      } as CreateStockReservationResponseDto);
    } else {
      console.error(`Stock reservation failed: ${apiResponse.message}`);
      this.stockQueueClient.emit('stock.reservation.result', {
        success: false,
        message: apiResponse.message,
      } as CreateStockReservationResponseDto);
    }
  }

  async callReserveStock(
    createReservationStockDto: CreateStockReservationDto,
  ): Promise<CreateStockReservationResponseDto> {
    console.log(
      `Reserving stock for OrderId: ${createReservationStockDto.orderId}, ProductId: ${createReservationStockDto.productId}, Quantity: ${createReservationStockDto.quantity}`,
    );
    // API delay
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 10000));

    // Simulate 60% chance of success
    if (Math.random() < 0.6) {
      console.log('Stock reserved successfully');
      return {
        success: true,
        reservationId: Math.floor(Math.random() * 100000),
        message: 'Stock reserved successfully',
      };
    } else {
      console.log('Error reserving stock');
      return {
        success: false,
        message:
          'Failed to reserve stock due to insufficient inventory or API error',
      };
    }
  }
}
