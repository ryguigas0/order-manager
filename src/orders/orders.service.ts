import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreatePaymentDto } from 'src/payment/dto/create-payment.dto';
import { CreateStockReservationDto } from 'src/stock/dto/create-stock-reservation.dto';
import { Order } from './schemas/order.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { EventData } from 'src/util/EventData';
import { CancelOrderDto } from './dto/cancel-order.dto';

@Injectable()
export class OrdersService {
  constructor(
    @Inject('ORDER_PAYMENT')
    private readonly paymentManagerClient: ClientProxy,
    @Inject('ORDER_STOCK_RESERVATION')
    private readonly stockManagerClient: ClientProxy,
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

    console.log({ order });

    const paymentPayload: CreatePaymentDto = {
      orderId: order._id.toString(),
      amount: order.payment.totalAmount,
      paymentMethod: order.payment.paymentMethod,
      shippingAddress: order.customer.address.delivery,
      billingAddress: order.customer.address.billing,
    };

    await this.paymentManagerClient
      .emit('payment.create', new EventData<CreatePaymentDto>(paymentPayload))
      .toPromise();

    const stockReservationPayload: CreateStockReservationDto = {
      orderId: order._id.toString(),
      items: order.items,
    };

    await this.stockManagerClient
      .emit(
        'stock.reservation.create',
        new EventData<CreateStockReservationDto>(stockReservationPayload),
      )
      .toPromise();
  }

  async cancelOrder(cancelOrderDto: CancelOrderDto): Promise<void> {
    const shouldProcess = await this.validateIdempotency(
      cancelOrderDto.eventId,
    );
    if (!shouldProcess) {
      return;
    }

    await this.orderModel
      .updateOne(
        {
          _id: cancelOrderDto.orderId,
        },
        {
          $set: {
            status: 'canceled',
          },
          $push: {
            statusHistory: {
              eventId: cancelOrderDto.eventId,
              status: 'canceled',
              timestamp: new Date().toISOString(),
              reason: cancelOrderDto.reason,
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
