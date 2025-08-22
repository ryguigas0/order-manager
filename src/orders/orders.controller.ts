import { Controller, Get } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { EventPattern, Payload } from '@nestjs/microservices';
import { EventData } from 'src/util/EventData';
import { CreatePaymentResponseDto } from 'src/payment/dto/create-payment-response.dto';
import { CreateStockReservationResponseDto } from 'src/stock/dto/create-stock-reservation-response.dto';
import { ConfirmPaymentResponseDto } from 'src/payment/dto/confirm-payment-response.dto';
import { ConfirmStockReservationReponseDto } from 'src/stock/dto/confirm-stock-reservation-response.dto';
import { CreateOrderReportDto } from './dto/create-report.dto';

@Controller('/orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('ready')
  async getReadyOrders() {
    return await this.ordersService.getReadyOrders();
  }

  @EventPattern('orders.create')
  async handleCreateOrder(@Payload() payload: EventData<CreateOrderDto>) {
    await this.ordersService.handleCreateOrder(payload);
  }

  @EventPattern('orders.reports.create')
  async handleCreateReport(
    @Payload() payload: EventData<CreateOrderReportDto>,
  ) {
    await this.ordersService.handleCreateReport(payload);
  }

  @EventPattern('payment.create.result')
  async handlePaymentCreateResult(
    @Payload() payload: EventData<CreatePaymentResponseDto>,
  ) {
    const { orderId, message } = payload.data;

    if (!payload.data.success || !payload.data.paymentId) {
      console.log('Canceling order', payload.data.orderId);
      await this.ordersService.cancelOrder({
        eventId: payload.eventId,
        orderId: orderId,
        reason: message,
      });
      return;
    }

    await this.ordersService.handleOrderPaymentCreated({
      eventId: payload.eventId,
      paymentId: payload.data.paymentId,
      orderId: payload.data.orderId,
      reason: payload.data.message,
    });
  }

  @EventPattern('payment.confirm.result')
  async handlePaymentConfirmResult(
    @Payload() payload: EventData<ConfirmPaymentResponseDto>,
  ) {
    await this.ordersService.handleOrderPaymentConfirmed(payload);
  }

  @EventPattern('stock.reservation.create.result')
  async handleStockReservationCreateResult(
    @Payload() payload: EventData<CreateStockReservationResponseDto>,
  ) {
    const { orderId, message } = payload.data;

    if (!payload.data.success || !payload.data.reservationId) {
      console.log('Canceling order', payload.data.orderId);
      await this.ordersService.cancelOrder({
        eventId: payload.eventId,
        orderId: orderId,
        reason: message,
      });
      return;
    }

    await this.ordersService.handleStockReservationCreated({
      eventId: payload.eventId,
      reservationId: payload.data.reservationId,
      orderId: payload.data.orderId,
      reason: payload.data.message,
    });
  }

  @EventPattern('stock.reservation.confirm.result')
  async handleStockReservationConfirmResult(
    @Payload() payload: EventData<ConfirmStockReservationReponseDto>,
  ) {
    await this.ordersService.handleStockReservationConfirmed(payload);
  }
}
