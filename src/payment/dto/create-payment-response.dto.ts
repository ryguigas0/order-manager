export class CreatePaymentResponseDto {
  orderId: string;
  success: boolean;
  message: string;
  paymentId?: number;
}
