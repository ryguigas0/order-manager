import { Prop, Schema } from '@nestjs/mongoose';

export enum PaymenthMethod {
  'pix',
  'debit',
}

@Schema()
export class Payment {
  @Prop()
  totalAmount: number;
  @Prop({
    enum: PaymenthMethod,
  })
  paymentMethod: string;
}
