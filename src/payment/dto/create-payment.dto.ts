export class CreatePaymentDto {
  orderId: string;
  amount: number;
  paymentMethod: string;
  shippingAddress: string;
  billingAddress: string;
}
