import { Item } from 'src/orders/schemas/embeds/item.schema';

export class CreateStockReservationDto {
  orderId: string;
  items: Item[];
}
