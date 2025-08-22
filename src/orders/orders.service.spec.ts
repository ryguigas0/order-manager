// src/orders/orders.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { getModelToken } from '@nestjs/mongoose';
import { Order, OrderStatus } from './schemas/order.schema';
import { Model } from 'mongoose';
import { CreateOrderDto } from './dto/create-order.dto';
import { EventData } from '../util/EventData';

// Mock do método save
const mockSave = jest.fn((dto) =>
  Promise.resolve({
    ...dto,
    _id: 'a-unique-object-id',
  }),
);

// Mock do Model do Mongoose como uma função construtora
const mockOrderModel = jest.fn().mockImplementation((dto) => ({
  ...dto,
  save: () => mockSave(dto),
}));

// Mock do ClientProxy para o RabbitMQ
const mockPaymentQueue = {
  // AQUI ESTÁ A CORREÇÃO:
  // O método emit agora retorna um objeto que tem a função toPromise.
  emit: jest.fn(() => ({
    toPromise: jest.fn(() => Promise.resolve()),
  })),
};
const mockStockQueue = {
  emit: jest.fn(() => ({
    toPromise: jest.fn(() => Promise.resolve()),
  })),
};

describe('OrdersService', () => {
  let service: OrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: getModelToken(Order.name),
          useValue: mockOrderModel,
        },
        {
          provide: 'ORDER_PAYMENT',
          useValue: mockPaymentQueue,
        },
        {
          provide: 'ORDER_STOCK_RESERVATION',
          useValue: mockStockQueue,
        },
        {
          provide: getModelToken('OrderReport'),
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleCreateOrder', () => {
    it('should save a new order and emit a payment.create event', async () => {
      const createOrderDto: CreateOrderDto = {
        customerId: 123,
        customer: {
          name: 'John Doe',
          email: 'john@doe.com',
          address: {
            billing: '123 Main St',
            delivery: '123 Main St',
          },
        },
        items: [],
        totalAmount: 100,
        paymentMethod: 'pix',
      };
      const eventPayload = new EventData<CreateOrderDto>(createOrderDto);

      // Mock para a validação de idempotência
      jest
        .spyOn(service as any, 'validateOrderIdempotency')
        .mockResolvedValueOnce(true);

      await service.handleCreateOrder(eventPayload);

      expect(mockOrderModel).toHaveBeenCalledWith(
        expect.objectContaining({
          status: OrderStatus.pending,
        }),
      );

      expect(mockSave).toHaveBeenCalled();

      expect(mockPaymentQueue.emit).toHaveBeenCalledWith(
        'payment.create',
        expect.any(Object),
      );

      const emittedEvent = mockPaymentQueue.emit.mock
        .calls[0][1] as EventData<any>;
      expect(emittedEvent.data.orderId).toBe('a-unique-object-id');
      expect(emittedEvent.data.amount).toBe(createOrderDto.totalAmount);
    });
  });
});
