import { ApiResult } from 'src/util/ApiResponse';

export class ConfirmPaymentResponseDto extends ApiResult {
  paymentId?: number;
}
