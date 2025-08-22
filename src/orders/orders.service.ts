import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
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

@Injectable()
export class OrdersService {
  constructor(
    @Inject('ORDER_PAYMENT')
    private readonly paymentQueue: ClientProxy,
    @Inject('ORDER_STOCK_RESERVATION')
    private readonly stockQueue: ClientProxy,
    @InjectModel(Order.name) private orderModel: Model<Order>,
  ) {}

  async handleCreateOrder(payload: EventData<CreateOrderDto>) {
    const shouldProcess = await this.validateIdempotency(payload.eventId);
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

    // console.log({ order });

    const paymentPayload: CreatePaymentDto = {
      orderId: order._id.toString(),
      amount: order.payment.totalAmount,
      paymentMethod: order.payment.paymentMethod,
      shippingAddress: order.customer.address.delivery,
      billingAddress: order.customer.address.billing,
    };

    await this.paymentQueue
      .emit('payment.create', new EventData<CreatePaymentDto>(paymentPayload))
      .toPromise();
  }

  async handleOrderPaymentCreated(updateOrderPayment: UpdateOrderPaymentDto) {
    const shouldProcess = await this.validateIdempotency(
      updateOrderPayment.eventId,
    );
    if (!shouldProcess) {
      return;
    }

    const order = await this.getOrder(updateOrderPayment.orderId);

    if (!order) {
      throw new Error('Order not found for setting payment');
    }

    if (order.status !== OrderStatus.pending) {
      console.log(
        `Order ${updateOrderPayment.orderId} is not in a valid state for setting payment`,
      );
      return;
    }

    console.log(`Setting payment for order ${updateOrderPayment.orderId}`);
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

    this.paymentQueue.emit(
      'payment.confirm',
      new EventData<ConfirmPaymentDto>({
        orderId: order._id.toString(),
        paymentId: updateOrderPayment.paymentId,
      }),
    );
  }

  async handleOrderPaymentConfirmed(updateOrderPayment: UpdateOrderPaymentDto) {
    const shouldProcess = await this.validateIdempotency(
      updateOrderPayment.eventId,
    );
    if (!shouldProcess) {
      return;
    }

    const order = await this.getOrder(updateOrderPayment.orderId);

    if (!order) {
      throw new Error('Order not found for confirming payment');
    }

    if (order.status !== OrderStatus.pendingPayment) {
      console.log(
        `Order ${updateOrderPayment.orderId} is not in a valid state for confirming payment ${order.status}`,
      );
      return;
    }

    console.log(
      `Setting payment confirmed for order ${updateOrderPayment.orderId}`,
    );
    await this.orderModel
      .updateOne(
        {
          _id: updateOrderPayment.orderId,
        },
        {
          $set: {
            status: OrderStatus.pendingStock,
          },
          $push: {
            statusHistory: {
              eventId: updateOrderPayment.eventId,
              status: OrderStatus.pendingStock,
              timestamp: new Date().toISOString(),
              reason: updateOrderPayment.reason,
            },
          },
        },
      )
      .exec();

    this.paymentQueue.emit(
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
    const shouldProcess = await this.validateIdempotency(
      updateOrderStockReservation.eventId,
    );
    if (!shouldProcess) {
      return;
    }

    const order = await this.getOrder(updateOrderStockReservation.orderId);

    if (!order) {
      throw new Error('Order not found for setting stock reservation');
    }

    if (order.status !== OrderStatus.pendingStock) {
      console.log(
        `Order ${updateOrderStockReservation.orderId} is not in a valid state for setting stock reservation`,
      );
      return;
    }

    console.log(
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

    this.paymentQueue.emit(
      'stock.reservation.confirm',
      new EventData<ConfirmStockReservationDto>({
        orderId: order._id.toString(),
        reservationId: updateOrderStockReservation.reservationId,
      }),
    );
  }

  async handleStockReservationConfirmed(
    updateOrderStockReservation: UpdateOrderStockReservationDto,
  ) {
    const shouldProcess = await this.validateIdempotency(
      updateOrderStockReservation.eventId,
    );
    if (!shouldProcess) {
      return;
    }

    const order = await this.getOrder(updateOrderStockReservation.orderId);

    if (!order) {
      throw new Error('Order not found for confirming stock reservation');
    }

    if (order.status !== OrderStatus.pendingStock) {
      console.log(
        `Order ${updateOrderStockReservation.orderId} is not in a valid state for confirming stock reservation`,
      );
      return;
    }

    console.log(
      `Confirming stock reservation for order ${updateOrderStockReservation.orderId}`,
    );
    const updatedOrder = await this.orderModel
      .updateOne(
        {
          _id: updateOrderStockReservation.orderId,
        },
        {
          $set: {
            status: OrderStatus.ready,
          },
          $push: {
            statusHistory: {
              eventId: updateOrderStockReservation.eventId,
              status: OrderStatus.ready,
              timestamp: new Date().toISOString(),
              reason: updateOrderStockReservation.reason,
            },
          },
        },
      )
      .exec();

    // this.paymentQueue.emit(
    //   'stock.reservation.confirm',
    //   new EventData<ConfirmStockReservationDto>({
    //     orderId: order._id.toString(),
    //     reservationId: updateOrderStockReservation.reservationId,
    //   }),
    // );

    console.log({ ready: updatedOrder });
  }

  async getOrder(orderId: string): Promise<HydratedDocument<Order> | null> {
    return this.orderModel.findById(orderId).exec();
  }

  async cancelOrder(updateOrderDto: UpdateOrderDto) {
    const shouldProcess = await this.validateIdempotency(
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

  private async validateIdempotency(eventId: string): Promise<boolean> {
    const order = await this.orderModel
      .findOne({
        statusHistory: {
          eventId,
        },
      })
      .exec();

    return order === null;
  }
}
