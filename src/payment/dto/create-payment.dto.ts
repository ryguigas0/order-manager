export class CreatePaymentDto {
  orderId: number;
  amount: number;
  paymentMethod: string;
  shippingAddress: string;
  billingAddress: string;
}
