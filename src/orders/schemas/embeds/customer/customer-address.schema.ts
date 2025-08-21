import { Schema, Prop } from '@nestjs/mongoose';

@Schema()
export class CustomerAddress {
  @Prop()
  billing: string;

  @Prop()
  delivery: string;
}
