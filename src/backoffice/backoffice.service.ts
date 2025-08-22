import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy, RmqContext } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { CreateOrderDto } from 'src/orders/dto/create-order.dto';
import { EventData } from 'src/util/EventData';
import { DeadLetter } from './schemas/dead-letter.schema';
import { Model } from 'mongoose';

@Injectable()
export class BackofficeService {
  constructor(
    @Inject('DEBUG_ORDER') private readonly orderQueue: ClientProxy,
    @Inject('DEBUG_DLQ')
    private readonly deadLetterQueue: ClientProxy,
    @InjectModel(DeadLetter.name) private deadLetterModel: Model<DeadLetter>,
  ) {}

  async callCreateOrder(createOrderDto: CreateOrderDto) {
    await this.orderQueue
      .emit('orders.create', new EventData<CreateOrderDto>(createOrderDto))
      .toPromise();
    // console.debug('Order creation request sent:', payload);
    return { message: 'Order creation request sent' };
  }

  async saveDeadLetter(payload: object, ctx: RmqContext) {
    const msg = ctx.getMessage();
    const channel = ctx.getChannelRef();

    console.log({ msg, channel });

    // const newDeadLetter = new this.deadLetterModel({
    //   payload: payload,
    //   context: {
    //     message: ,
    //     channel: ,
    //   },
    // });

    // await newDeadLetter.save();
    return;
  }
}
