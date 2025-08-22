import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { getModelToken } from '@nestjs/mongoose';
import { Order, OrderStatus } from './schemas/order.schema';
import { Model } from 'mongoose';
import { CreateOrderDto } from './dto/create-order.dto';
import { EventData } from '../util/EventData';
import { ClientProxy } from '@nestjs/microservices';
import { OrderReport } from './schemas/order-report.schema';
import { UpdateOrderPaymentDto } from './dto/update-order-payment.dto';
import { ConfirmPaymentResponseDto } from '../payment/dto/confirm-payment-response.dto';
import { ConfirmStockReservationReponseDto } from '../stock/dto/confirm-stock-reservation-response.dto';

describe('OrdersService', () => {
  let service: OrdersService;
  let paymentQueue: ClientProxy;
  let stockQueue: ClientProxy;
  let orderModel: Model<Order>;

  // --- MOCK UNIFICADO E CORRIGIDO ---
  const mockSave = jest.fn();

  // 1. O mock principal é uma função (para funcionar com 'new')
  const mockOrderModel = jest.fn().mockImplementation((dto) => ({
    ...dto,
    save: mockSave,
  }));

  // 2. Anexamos os métodos estáticos diretamente à função mockada
  mockOrderModel.find = jest.fn();
  mockOrderModel.findById = jest.fn();
  mockOrderModel.findOne = jest.fn();
  mockOrderModel.updateOne = jest.fn().mockReturnThis(); // Permite encadear .exec()
  mockOrderModel.exec = jest.fn();
  mockOrderModel.aggregate = jest.fn();
  // --- FIM DO MOCK UNIFICADO ---

  const mockClientProxy = {
    emit: jest.fn(() => ({
      toPromise: jest.fn().mockResolvedValue(undefined),
    })),
  };

  const mockOrderReportModel = {
    new: jest.fn().mockResolvedValue({ save: jest.fn().mockResolvedValue({}) }),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    // Limpa os mocks antes de cada teste para garantir isolamento
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: getModelToken(Order.name),
          useValue: mockOrderModel,
        },
        {
          provide: getModelToken(OrderReport.name),
          useValue: mockOrderReportModel,
        },
        {
          provide: 'ORDER_PAYMENT',
          useValue: mockClientProxy,
        },
        {
          provide: 'ORDER_STOCK_RESERVATION',
          useValue: mockClientProxy,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    paymentQueue = module.get<ClientProxy>('ORDER_PAYMENT');
    stockQueue = module.get<ClientProxy>('ORDER_STOCK_RESERVATION');
    orderModel = module.get<Model<Order>>(getModelToken(Order.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleCreateOrder', () => {
    const createOrderDto: CreateOrderDto = {
      customerId: 123,
      customer: {
        name: 'John Doe',
        email: 'john@doe.com',
        address: { billing: '123 Main St', delivery: '123 Main St' },
      },
      items: [],
      totalAmount: 100,
      paymentMethod: 'pix',
    };

    it('should create an order successfully', async () => {
      const eventPayload = new EventData<CreateOrderDto>(createOrderDto);
      jest
        .spyOn(service as any, 'validateOrderIdempotency')
        .mockResolvedValue(true);

      // CORREÇÃO: Garante que o mock do save retorne o objeto completo que o serviço espera
      const savedOrder = {
        ...createOrderDto,
        _id: 'a-unique-object-id',
        payment: {
          // Propriedade `payment` adicionada
          paymentMethod: createOrderDto.paymentMethod,
          totalAmount: createOrderDto.totalAmount,
        },
      };
      mockSave.mockResolvedValueOnce(savedOrder);

      await service.handleCreateOrder(eventPayload);

      expect(mockOrderModel).toHaveBeenCalledWith(
        expect.objectContaining({ status: OrderStatus.pending }),
      );
      expect(mockSave).toHaveBeenCalled();
      expect(paymentQueue.emit).toHaveBeenCalledWith(
        'payment.create',
        expect.any(EventData),
      );
    });

    it('should not create a duplicate order', async () => {
      const eventPayload = new EventData<CreateOrderDto>(createOrderDto);
      jest
        .spyOn(service as any, 'validateOrderIdempotency')
        .mockResolvedValue(false);

      await service.handleCreateOrder(eventPayload);

      // CORREÇÃO: A asserção deve ser no construtor mockado, não em uma propriedade '.new'
      expect(mockOrderModel).not.toHaveBeenCalled();
      expect(paymentQueue.emit).not.toHaveBeenCalled();
    });
  });

  describe('Order Status Transitions', () => {
    it(`should update order to 'pending-payment' after payment is created`, async () => {
      const updateDto: UpdateOrderPaymentDto = {
        eventId: 'event1',
        orderId: 'order1',
        paymentId: 12345,
      };
      const mockOrder = {
        _id: 'order1',
        status: OrderStatus.pending,
        payment: {},
      };
      jest
        .spyOn(service as any, 'validateOrderIdempotency')
        .mockResolvedValue(true);
      jest.spyOn(service, 'getOrder').mockResolvedValue(mockOrder as any);

      await service.handleOrderPaymentCreated(updateDto);

      expect(mockOrderModel.updateOne).toHaveBeenCalledWith(
        { _id: 'order1' },
        expect.objectContaining({
          $set: { status: OrderStatus.pendingPayment },
        }),
      );
      expect(paymentQueue.emit).toHaveBeenCalledWith(
        'payment.confirm',
        expect.any(EventData),
      );
    });

    it(`should update order to 'pending-stock' after payment is confirmed`, async () => {
      const confirmDto: ConfirmPaymentResponseDto = {
        orderId: 'order1',
        success: true,
        message: 'Confirmed',
      };
      const eventPayload = new EventData(confirmDto);
      const mockOrder = {
        _id: 'order1',
        status: OrderStatus.pendingPayment,
        payment: { paymentId: 12345 },
        items: [],
      };
      jest
        .spyOn(service as any, 'validateOrderIdempotency')
        .mockResolvedValue(true);
      jest.spyOn(service, 'getOrder').mockResolvedValue(mockOrder as any);

      await service.handleOrderPaymentConfirmed(eventPayload);

      expect(mockOrderModel.updateOne).toHaveBeenCalledWith(
        { _id: 'order1' },
        expect.objectContaining({ $set: { status: OrderStatus.pendingStock } }),
      );
      expect(stockQueue.emit).toHaveBeenCalledWith(
        'stock.reservation.create',
        expect.any(EventData),
      );
    });

    it(`should update order to 'ready' after stock is reserved and confirmed`, async () => {
      const confirmDto: ConfirmStockReservationReponseDto = {
        orderId: 'order1',
        success: true,
        message: 'Reserved',
      };
      const eventPayload = new EventData(confirmDto);
      const mockOrder = {
        _id: 'order1',
        status: OrderStatus.pendingStock,
        stockReservationId: 54321,
      };
      jest
        .spyOn(service as any, 'validateOrderIdempotency')
        .mockResolvedValue(true);
      jest.spyOn(service, 'getOrder').mockResolvedValue(mockOrder as any);

      await service.handleStockReservationConfirmed(eventPayload);

      expect(mockOrderModel.updateOne).toHaveBeenCalledWith(
        { _id: 'order1' },
        expect.objectContaining({ $set: { status: OrderStatus.ready } }),
      );
    });
  });

  // Você pode adicionar os outros blocos de teste ('Order Cancellation' e 'Retries') aqui
});
