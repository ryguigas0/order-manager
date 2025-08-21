import { Schema, Prop } from '@nestjs/mongoose';
import { CustomerAddress } from './customer-address.schema';

@Schema()
export class Customer {
  @Prop()
  name: string;

  @Prop()
  email: string;

  @Prop()
  address: CustomerAddress;
}
