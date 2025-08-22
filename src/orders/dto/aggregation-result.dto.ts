import { OrderStatus } from '../schemas/order.schema';

export type AggregationResult = { [key in OrderStatus]?: number };
