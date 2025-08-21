import { Customer } from '../schemas/embeds/customer/customer.schema';

export class CreateOrderDto {
  customerId: number;
  customer: Customer;
  items: Item[];
  totalAmount: number;
  paymentMethod: string;
}
