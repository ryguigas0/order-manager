import { Controller, Get, Inject, Logger, Response } from '@nestjs/common';
import { AppService } from './app.service';
import {
  ClientProxy,
  Ctx,
  EventPattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @Inject('CATS_SERVICE') private readonly catsService: ClientProxy,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('send-event')
  async sendEvent() {
    this.catsService.emit('notifications', { name: 'Kitty', age: 2 });
    return { message: 'Event sent successfully' };
  }

  @EventPattern('notifications')
  async handleCatsEvent(@Payload() data: any, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    console.log('Received notifications:', data);
    console.log('Context:', context.getMessage());
  }
}
