export class CreateOrderDto {
  customerId: number;
  productId: number;
  quantity: number;
  totalAmount: number;
  paymentMethod: string;
  shippingAddress: string;
  billingAddress: string;
}
