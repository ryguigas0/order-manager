import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type OrderReportDocument = HydratedDocument<OrderReport>;

@Schema({
  collection: 'reports',
})
export class OrderReport {
  @Prop()
  eventId: string;

  @Prop()
  timestamp: string;

  @Prop()
  pending: number;

  @Prop()
  pendingPayment: number;

  @Prop()
  pendingStock: number;

  @Prop()
  ready: number;

  @Prop()
  shipped: number;

  @Prop()
  delivered: number;

  @Prop()
  canceled: number;
}

export const OrderReportSchema = SchemaFactory.createForClass(OrderReport);
