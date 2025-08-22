import { Prop } from '@nestjs/mongoose';

export enum PaymenthMethod {
  'pix',
  'debit',
}

export class Payment {
  @Prop()
  totalAmount: number;
  @Prop({
    enum: PaymenthMethod,
  })
  paymentMethod: string;
  @Prop({})
  paymentId?: number;
}
