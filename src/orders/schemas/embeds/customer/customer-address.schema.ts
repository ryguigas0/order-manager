import { Prop } from '@nestjs/mongoose';

export class CustomerAddress {
  @Prop()
  billing: string;

  @Prop()
  delivery: string;
}
