import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreatePaymentDto } from 'src/payment/dto/create-payment.dto';
import { CreateStockReservationDto } from 'src/stock/dto/create-stock-reservation.dto';
import { Order, OrderStatus } from './schemas/order.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { EventData } from 'src/util/EventData';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Injectable()
export class OrdersService {
  constructor(
    @Inject('ORDER_PAYMENT')
    private readonly paymentQueue: ClientProxy,
    @Inject('ORDER_STOCK_RESERVATION')
    private readonly stockQueue: ClientProxy,
    @InjectModel(Order.name) private orderModel: Model<Order>,
  ) {}

  async createOrder(payload: EventData<CreateOrderDto>) {
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
      statusHistory: [
        {
          eventId: payload.eventId,
          status: 'pending',
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

    const stockReservationPayload: CreateStockReservationDto = {
      orderId: order._id.toString(),
      items: order.items,
    };

    await this.stockQueue
      .emit(
        'stock.reservation.create',
        new EventData<CreateStockReservationDto>(stockReservationPayload),
      )
      .toPromise();
  }

  async getOrder(orderId: string) {
    return this.orderModel.findById(orderId);
  }

  async updateOrderStatus(
    updateStatusDto: UpdateOrderStatusDto,
  ): Promise<void> {
    const shouldProcess = await this.validateIdempotency(
      updateStatusDto.eventId,
    );
    if (!shouldProcess) {
      return;
    }

    await this.orderModel
      .updateOne(
        {
          _id: updateStatusDto.orderId,
        },
        {
          $set: {
            status: updateStatusDto.status,
          },
          $push: {
            statusHistory: {
              eventId: updateStatusDto.eventId,
              status: updateStatusDto.status,
              timestamp: new Date().toISOString(),
              reason: updateStatusDto.reason,
            },
          },
        },
      )
      .exec();
  }

  async emitNextStep(orderId: string) {
    const order = await this.getOrder(orderId);

    console.log({ order });

    // switch (order?.status as Status) {
    //   case Status.pending:
    //     this.stockQueue.emit(
    //       'stock.reservation.confirm',
    //       new EventData<ConfirmStockReservationDto>(),
    //     );
    //     this.paymentQueue.emit(
    //       'payment.confirm',
    //       new EventData<ConfirmPaymentDto>(),
    //     );
    //     break;
    //   case Status.pendingPayment:
    //     this.paymentQueue.emit(
    //       'payment.confirm',
    //       new EventData<ConfirmPaymentDto>(),
    //     );
    //     break;
    //   case Status.pendingStock:
    //     this.stockQueue.emit(
    //       'stock.reservation.confirm',
    //       new EventData<ConfirmStockReservationDto>(),
    //     );
    //     break;
    //   case Status.ready:
    //     this.paymentQueue.emit(
    //       'order.ship',
    //       new EventData<ConfirmPaymentDto>(),
    //     );
    //     break;
    //   case Status.shipped:
    //     this.paymentQueue.emit(
    //       'order.deliver',
    //       new EventData<ConfirmPaymentDto>(),
    //     );
    //     break;
    //   // no next steps for delivered or canceled orders
    //   case Status.delivered:
    //   case Status.canceled:
    //   default:
    //     return;
    // }
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
