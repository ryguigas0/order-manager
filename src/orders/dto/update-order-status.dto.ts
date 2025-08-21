import { OrderStatus } from '../schemas/order.schema';

export class UpdateOrderStatusDto {
  eventId: string;
  orderId: string;
  status: OrderStatus;
  reason?: string;
}
