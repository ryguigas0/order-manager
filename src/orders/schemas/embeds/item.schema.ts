import { Schema, Prop } from '@nestjs/mongoose';

@Schema()
export class Item {
  @Prop()
  itemId: number;

  @Prop()
  itemName: string;

  //   @Prop()
  //   imageURL: string;

  @Prop()
  unitPrice: number;

  @Prop()
  quantity: number;
}
