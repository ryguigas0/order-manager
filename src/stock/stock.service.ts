import { Inject, Injectable } from '@nestjs/common';
import { CreateStockReservationDto } from './dto/create-stock-reservation.dto';
import { CreateStockReservationResponseDto } from './dto/create-stock-reservation-response.dto';
import { ClientProxy } from '@nestjs/microservices';
import { EventData } from 'src/util/EventData';
import { ConfirmStockReservationDto } from './dto/confirm-stock-reservation.dto';
import { ConfirmStockReservationReponseDto } from './dto/confirm-stock-reservation-response.dto';

@Injectable()
export class StockService {
  constructor(
    @Inject('STOCK') private readonly stockQueueClient: ClientProxy,
  ) {}

  async create(createStockDto: CreateStockReservationDto): Promise<void> {
    const apiResponse = await this.callReserveStock(createStockDto);

    if (apiResponse.success) {
      // console.log(`Stock reservation successful: ${apiResponse.reservationId}`);
      this.stockQueueClient.emit(
        'stock.reservation.create.result',
        new EventData<CreateStockReservationResponseDto>({
          success: true,
          orderId: createStockDto.orderId,
          reservationId: apiResponse.reservationId,
          message: apiResponse.message,
        }),
      );
    } else {
      // console.error(`Stock reservation failed: ${apiResponse.message}`);
      this.stockQueueClient.emit(
        'stock.reservation.create.result',
        new EventData<CreateStockReservationResponseDto>({
          success: false,
          orderId: createStockDto.orderId,
          message: apiResponse.message,
        }),
      );
    }
  }

  async callReserveStock(
    createReservationStockDto: CreateStockReservationDto,
  ): Promise<CreateStockReservationResponseDto> {
    console.log(
      `Reserving stock for OrderId: ${createReservationStockDto.orderId}`,
    );
    // API delay
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 10000));

    // Simulate 60% chance of success
    if (Math.random() < 0.6) {
      // console.log('Stock reserved successfully');
      return {
        success: true,
        orderId: createReservationStockDto.orderId,
        reservationId: Math.floor(Math.random() * 100000),
        message: 'Stock reserved successfully',
      };
    } else {
      // console.log('Error reserving stock');
      return {
        success: false,
        orderId: createReservationStockDto.orderId,
        message:
          'Failed to reserve stock due to insufficient inventory or API error',
      };
    }
  }

  async confirm(event: EventData<ConfirmStockReservationDto>): Promise<void> {
    const confirmStockReservationDto = event.data;

    const apiResponse = await this.callConfirmStockReservation(
      confirmStockReservationDto,
    );

    if (apiResponse.success) {
      console.log(`Stock reservation confirmed: ${apiResponse.reservationId}`);
      this.stockQueueClient.emit(
        'stock.reservation.confirm.result',
        new EventData<CreateStockReservationResponseDto>({
          success: true,
          orderId: confirmStockReservationDto.orderId,
          reservationId: apiResponse.reservationId,
          message: apiResponse.message,
        }),
      );
    } else {
      console.error(`Stock reservation confirm error: ${apiResponse.message}`);
      this.stockQueueClient.emit(
        'stock.reservation.confirm.result',
        new EventData<CreateStockReservationResponseDto>(
          {
            success: false,
            orderId: confirmStockReservationDto.orderId,
            message: apiResponse.message,
          },
          event.currentTry,
          event.backoff,
        ),
      );
    }
  }

  async callConfirmStockReservation(
    confirmReservationStockDto: ConfirmStockReservationDto,
  ): Promise<ConfirmStockReservationReponseDto> {
    console.log(
      `Confirm stock reservation for OrderId: ${confirmReservationStockDto.orderId}`,
    );
    // API delay
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 100));

    // Simulate chance of success
    if (Math.random() < 0.4) {
      // console.log('Stock reservation confirmed successfully');
      return {
        success: true,
        orderId: confirmReservationStockDto.orderId,
        reservationId: Math.floor(Math.random() * 100000),
        message: 'Stock reservation confirmed successfully',
      };
    } else {
      // console.log('Error reserving stock');
      return {
        success: false,
        orderId: confirmReservationStockDto.orderId,
        message:
          'Failed to confirm stock reservation due to insufficient inventory or API error',
      };
    }
  }
}
