import { Customer } from '../schemas/embeds/customer/customer.schema';
import { Item } from '../schemas/embeds/item.schema';

export class CreateOrderDto {
  customerId: number;
  customer: Customer;
  items: Item[];
  totalAmount: number;
  paymentMethod: string;
}
