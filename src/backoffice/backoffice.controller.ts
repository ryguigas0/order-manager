import { Body, Controller, Post } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { CreateOrderDto } from 'src/orders/dto/create-order.dto';
import { BackofficeService } from './backoffice.service';

@Controller('backoffice')
export class BackofficeController {
  constructor(private readonly backofficeService: BackofficeService) {}

  @Post('orders')
  async callCreateOrder(@Body() payload: CreateOrderDto) {
    return await this.backofficeService.callCreateOrder(payload);
  }

  @EventPattern('*')
  async handleDeadLetter(@Payload() payload, @Ctx() ctx: RmqContext) {
    await this.backofficeService.saveDeadLetter(payload, ctx);
  }
}
