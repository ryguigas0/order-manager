import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Customer } from './embeds/customer/customer.schema';
import { Item } from './embeds/item.schema';
import { Payment } from './embeds/payment.schema';

export type OrderDocument = HydratedDocument<Order>;

export enum Status {
  'pending',
  'pending-payment',
  'pending-stock',
  'ready',
  'shipped',
  'delivered',
  'canceled',
}

export class StatusHistory {
  @Prop()
  eventId: string;

  @Prop()
  timestamp: string; // datetime string

  @Prop({
    type: String,
    enum: [
      'pending',
      'pending-payment',
      'pending-stock',
      'ready',
      'shipped',
      'delivered',
      'canceled',
    ],
  })
  status: Status;

  @Prop()
  reason?: string;
}

@Schema({
  collection: 'orders',
})
export class Order {
  @Prop()
  customerId: string;

  @Prop({
    type: {
      name: 'String',
      email: 'String',
      address: {
        billing: 'String',
        deivery: 'String',
      },
    },
  })
  customer: Customer;

  @Prop({})
  items: Item[];

  @Prop()
  payment: Payment;

  @Prop({
    type: String,
    enum: [
      'pending',
      'pending-payment',
      'pending-stock',
      'ready',
      'shipped',
      'delivered',
      'canceled',
    ],
  })
  status: number;

  @Prop()
  statusHistory: StatusHistory[];
}

export const OrderSchema = SchemaFactory.createForClass(Order);
