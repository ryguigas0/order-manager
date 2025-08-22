import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy, RmqRecordBuilder } from '@nestjs/microservices';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreatePaymentDto } from 'src/payment/dto/create-payment.dto';
import { CreateStockReservationDto } from 'src/stock/dto/create-stock-reservation.dto';
import { Order, OrderStatus } from './schemas/order.schema';
import { HydratedDocument, Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { EventData } from 'src/util/EventData';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ConfirmPaymentDto } from 'src/payment/dto/confirm-payment.dto';
import { UpdateOrderPaymentDto } from './dto/update-order-payment.dto';
import { ConfirmStockReservationDto } from 'src/stock/dto/confirm-stock-reservation.dto';
import { UpdateOrderStockReservationDto } from './dto/update-order-stock-reservation.dto';
import { ConfirmPaymentResponseDto } from 'src/payment/dto/confirm-payment-response.dto';
import { ConfirmStockReservationReponseDto } from 'src/stock/dto/confirm-stock-reservation-response.dto';
import { CreateOrderReportDto } from './dto/create-report.dto';
import { OrderReport } from './schemas/order-report.schema';
import { AggregationResult } from './dto/aggregation-result.dto';

@Injectable()
export class OrdersService {
  constructor(
    @Inject('ORDER_PAYMENT')
    private readonly paymentQueue: ClientProxy,
    @Inject('ORDER_STOCK_RESERVATION')
    private readonly stockQueue: ClientProxy,
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(OrderReport.name) private orderReportModel: Model<OrderReport>,
  ) {}
  private readonly logger = new Logger(OrdersService.name);

  async getReadyOrders(): Promise<HydratedDocument<Order>[]> {
    return await this.orderModel.find({ status: OrderStatus.ready }).exec();
  }

  async getOrderReports(
    pageSize?: number,
  ): Promise<HydratedDocument<OrderReport>[]> {
    let size = 10;
    if (pageSize) size = pageSize;

    return await this.orderReportModel
      .find({})
      .sort({ timestamp: -1 })
      .limit(size)
      .exec();
  }

  async handleCreateOrder(payload: EventData<CreateOrderDto>) {
    const shouldProcess = await this.validateOrderIdempotency(payload.eventId);
    if (!shouldProcess) {
      return;
    }

    const newOrder: CreateOrderDto = payload.data;

    const createdOrder = new this.orderModel({
      customerId: newOrder.customerId,
      customer: newOrder.customer,
      items: newOrder.items,
      payment: {
        paymentMethod: newOrder.paymentMethod,
        totalAmount: newOrder.totalAmount,
      },
      status: OrderStatus.pending,
      statusHistory: [
        {
          eventId: payload.eventId,
          status: OrderStatus.pending,
          timestamp: new Date().toISOString(),
        },
      ],
    });

    const order = await createdOrder.save();

    const paymentPayload: CreatePaymentDto = {
      orderId: order._id.toString(),
      amount: order.payment.totalAmount,
      paymentMethod: order.payment.paymentMethod,
      shippingAddress: order.customer.address.delivery,
      billingAddress: order.customer.address.billing,
    };

    await this.emitMessage(
      this.paymentQueue,
      'payment.create',
      new EventData<CreatePaymentDto>(paymentPayload),
    );

    this.logger.debug('Order created');
  }

  async handleOrderPaymentCreated(updateOrderPayment: UpdateOrderPaymentDto) {
    const shouldProcess = await this.validateOrderIdempotency(
      updateOrderPayment.eventId,
    );
    if (!shouldProcess) {
      return;
    }

    const order = await this.getOrder(updateOrderPayment.orderId);

    if (!order) {
      this.logger.error('Order not found for setting payment');
      return;
    }

    if (order.status !== OrderStatus.pending) {
      this.logger.error(
        `Order ${updateOrderPayment.orderId} is not in a valid state for setting payment`,
      );
      return;
    }

    this.logger.debug(
      `Setting payment for order ${updateOrderPayment.orderId}`,
    );
    await this.orderModel
      .updateOne(
        {
          _id: updateOrderPayment.orderId,
        },
        {
          $set: {
            payment: {
              ...order.payment,
              paymentId: updateOrderPayment.paymentId,
            },
            status: OrderStatus.pendingPayment,
          },
          $push: {
            statusHistory: {
              eventId: updateOrderPayment.eventId,
              status: OrderStatus.pendingPayment,
              timestamp: new Date().toISOString(),
              reason: updateOrderPayment.reason,
            },
          },
        },
      )
      .exec();

    await this.emitMessage(
      this.paymentQueue,
      'payment.confirm',
      new EventData<ConfirmPaymentDto>({
        orderId: order._id.toString(),
        paymentId: updateOrderPayment.paymentId,
      }),
    );
  }

  async handleOrderPaymentConfirmed(
    event: EventData<ConfirmPaymentResponseDto>,
  ) {
    const { eventId, currentTry, data } = event;
    const { orderId, message } = data;

    const shouldProcess = await this.validateOrderIdempotency(eventId);
    if (!shouldProcess) {
      return;
    }

    const order = await this.getOrder(orderId);

    if (!order) {
      this.logger.error(`Order ${orderId} not found`);
      return;
    }

    if (order.status !== OrderStatus.pendingPayment) {
      this.logger.error(
        `Order ${orderId} is not in a valid state for confirming payment ${order.status}`,
      );
      return;
    }

    if (!order.payment.paymentId) {
      this.logger.error(`Order ${orderId} without payment to confirm`);
      return;
    }

    if (!data.success) {
      if (event.currentTry <= event.backoff.maxTries) {
        this.logger.debug('Retry', currentTry + 1, 'confirm payment', orderId);

        const retryEvent = new EventData<ConfirmPaymentDto>(
          {
            orderId: order._id.toString(),
            paymentId: order.payment.paymentId,
          },
          currentTry + 1,
          { ...event.backoff },
        );

        await this.emitMessage(
          this.paymentQueue,
          'payment.confirm',
          retryEvent,
          retryEvent.backoff.delay + Math.pow(5, retryEvent.currentTry) * 1000,
        );
      } else {
        this.logger.error('Canceling order', orderId);
        await this.cancelOrder({
          eventId: eventId,
          orderId: orderId,
          reason: message,
        });
      }
      return;
    }

    this.logger.debug(`Setting payment confirmed for order ${orderId}`);
    await this.orderModel
      .updateOne(
        {
          _id: orderId,
        },
        {
          $set: {
            status: OrderStatus.pendingStock,
          },
          $push: {
            statusHistory: {
              eventId: eventId,
              status: OrderStatus.pendingStock,
              timestamp: new Date().toISOString(),
              reason: message,
            },
          },
        },
      )
      .exec();

    await this.emitMessage(
      this.stockQueue,
      'stock.reservation.create',
      new EventData<CreateStockReservationDto>({
        orderId: order._id.toString(),
        items: order.items,
      }),
    );
  }

  async handleStockReservationCreated(
    updateOrderStockReservation: UpdateOrderStockReservationDto,
  ) {
    const shouldProcess = await this.validateOrderIdempotency(
      updateOrderStockReservation.eventId,
    );
    if (!shouldProcess) {
      return;
    }

    const order = await this.getOrder(updateOrderStockReservation.orderId);

    if (!order) {
      this.logger.error('Order not found for setting stock reservation');
      return;
    }

    if (order.status !== OrderStatus.pendingStock) {
      this.logger.error(
        `Order ${updateOrderStockReservation.orderId} is not in a valid state for setting stock reservation`,
      );
      return;
    }

    this.logger.debug(
      `Setting stock reservation for order ${updateOrderStockReservation.orderId}`,
    );
    await this.orderModel
      .updateOne(
        {
          _id: updateOrderStockReservation.orderId,
        },
        {
          $set: {
            stockReservationId: updateOrderStockReservation.reservationId,
            status: OrderStatus.pendingStock,
          },
          $push: {
            statusHistory: {
              eventId: updateOrderStockReservation.eventId,
              status: OrderStatus.pendingStock,
              timestamp: new Date().toISOString(),
              reason: updateOrderStockReservation.reason,
            },
          },
        },
      )
      .exec();

    await this.emitMessage(
      this.paymentQueue,
      'stock.reservation.confirm',
      new EventData<ConfirmStockReservationDto>({
        orderId: order._id.toString(),
        reservationId: updateOrderStockReservation.reservationId,
      }),
    );
  }

  async handleStockReservationConfirmed(
    event: EventData<ConfirmStockReservationReponseDto>,
  ) {
    const { eventId, currentTry, data } = event;
    const { orderId, message } = data;

    const shouldProcess = await this.validateOrderIdempotency(eventId);
    if (!shouldProcess) {
      return;
    }

    const order = await this.getOrder(orderId);

    if (!order) {
      this.logger.error('Order not found for confirming stock reservation');
      return;
    }

    if (order.status !== OrderStatus.pendingStock) {
      this.logger.error(
        `Order ${orderId} is not in a valid state for confirming stock reservation`,
      );
      return;
    }

    if (!order.stockReservationId) {
      this.logger.error(`Order ${orderId} without stock reservation`);
      return;
    }

    if (!data.success) {
      if (event.currentTry <= event.backoff.maxTries) {
        this.logger.debug(
          'Retry',
          currentTry + 1,
          'confirm stock reservation',
          orderId,
        );

        const retryEvent = new EventData<ConfirmStockReservationDto>(
          {
            orderId: order._id.toString(),
            reservationId: order.stockReservationId,
          },
          currentTry + 1,
          { ...event.backoff },
        );

        await this.emitMessage(
          this.stockQueue,
          'stock.reservation.confirm',
          retryEvent,
          retryEvent.backoff.delay + Math.pow(5, retryEvent.currentTry) * 1000,
        );
      } else {
        this.logger.error('Canceling order', orderId);
        await this.cancelOrder({
          eventId: eventId,
          orderId: orderId,
          reason: message,
        });
      }
      return;
    }

    this.logger.debug(`Confirming stock reservation for order ${orderId}`);

    await this.orderModel
      .updateOne(
        {
          _id: orderId,
        },
        {
          $set: {
            status: OrderStatus.ready,
          },
          $push: {
            statusHistory: {
              eventId: eventId,
              status: OrderStatus.ready,
              timestamp: new Date().toISOString(),
              reason: message,
            },
          },
        },
      )
      .exec();
  }

  async handleCreateReport(payload: EventData<CreateOrderReportDto>) {
    const eventId = payload.eventId;

    const shouldProcess = await this.validateOrderReportIdempotency(eventId);
    if (!shouldProcess) return;

    const timestamp = payload.data.timestamp;

    const aggregationResult = (await this.orderModel
      .aggregate([
        {
          $match: {
            status: { $ne: null },
          },
        },
        {
          $group: {
            _id: '$status',
            count: {
              $sum: 1,
            },
          },
        },
        {
          $group: {
            _id: null,
            data: {
              $push: {
                k: '$_id',
                v: '$count',
              },
            },
          },
        },
        {
          $replaceRoot: {
            newRoot: { $arrayToObject: '$data' },
          },
        },
      ])
      .exec()) as AggregationResult[];

    const reportData = aggregationResult[0] || {};

    const newModel = {
      ...reportData,
      eventId: eventId,
      timestamp,
    };

    console.log({ newModel });

    const newReport = new this.orderReportModel(newModel);

    const savedReport = await newReport.save();

    console.log({ savedReport });

    this.logger.debug('Created report ', timestamp);
  }

  async getOrder(orderId: string): Promise<HydratedDocument<Order> | null> {
    return this.orderModel.findById(orderId).exec();
  }

  async cancelOrder(updateOrderDto: UpdateOrderDto) {
    const shouldProcess = await this.validateOrderIdempotency(
      updateOrderDto.eventId,
    );
    if (!shouldProcess) {
      return;
    }

    await this.orderModel
      .updateOne(
        {
          _id: updateOrderDto.orderId,
        },
        {
          $set: {
            status: OrderStatus.canceled,
          },
          $push: {
            statusHistory: {
              eventId: updateOrderDto.eventId,
              status: OrderStatus.canceled,
              timestamp: new Date().toISOString(),
              reason: updateOrderDto.reason,
            },
          },
        },
      )
      .exec();
  }

  private async validateOrderIdempotency(eventId: string): Promise<boolean> {
    const order = await this.orderModel
      .findOne({
        statusHistory: {
          eventId,
        },
      })
      .exec();

    return order === null;
  }

  private async validateOrderReportIdempotency(
    eventId: string,
  ): Promise<boolean> {
    const report = await this.orderReportModel
      .findOne({
        eventId,
      })
      .exec();

    return report === null;
  }

  async emitMessage(
    queue: ClientProxy,
    queueName: string,
    message: EventData<any>,
    delay?: number,
  ): Promise<void> {
    if (!delay) {
      await queue.emit(queueName, message).toPromise();
      return;
    }

    const delayedMessage = new RmqRecordBuilder(message)
      .setOptions({
        headers: {
          'x-delay': delay.toString(),
        },
      })
      .build();

    await queue.emit(queueName, delayedMessage).toPromise();
  }
}
