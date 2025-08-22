import { UpdateOrderDto } from './update-order.dto';

export class UpdateOrderPaymentDto extends UpdateOrderDto {
  paymentId: number;
}
