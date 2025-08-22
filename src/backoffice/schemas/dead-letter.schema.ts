import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type DeadLetterDocument = HydratedDocument<DeadLetter>;

@Schema({
  collection: 'dlq',
})
export class DeadLetter {
  @Prop({
    type: mongoose.Schema.Types.Mixed,
  })
  payload: object;

  @Prop({
    type: mongoose.Schema.Types.Mixed,
  })
  context: object;
}

export const DeadLetterSchema = SchemaFactory.createForClass(DeadLetter);
