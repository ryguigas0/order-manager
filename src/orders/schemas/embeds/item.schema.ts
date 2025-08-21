import { Prop } from '@nestjs/mongoose';

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
