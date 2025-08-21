import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreatePaymentDto } from 'src/payment/dto/create-payment.dto';
import { CreateStockReservationDto } from 'src/stock/dto/create-stock-reservation.dto';
import { Order } from './schemas/order.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { EventData } from 'src/util/EventData';

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

    for (let i = 0; i < order.items.length; i++) {
      const item = order.items[i];

      const stockReservationPayload: CreateStockReservationDto = {
        orderId: order._id.toString(),
        productId: item.itemId,
        quantity: item.quantity,
      };

      await this.stockManagerClient
        .emit(
          'stock.reservation.create',
          new EventData<CreateStockReservationDto>(stockReservationPayload),
        )
        .toPromise();
    }
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
