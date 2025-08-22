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
import { UpdateOrderStockReservationDto } from './dto/update-order-stock-reservation.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

describe('OrdersService', () => {
  let service: OrdersService;
  let paymentQueue: ClientProxy;
  let stockQueue: ClientProxy;
  let orderModel: Model<Order>;
  let orderReportModel: Model<OrderReport>;

  const mockSave = jest.fn();
  const mockOrderModel = jest.fn().mockImplementation((dto) => ({
    ...dto,
    save: mockSave,
  }));

  mockOrderModel.find = jest.fn();
  mockOrderModel.findById = jest.fn();
  mockOrderModel.findOne = jest.fn();
  mockOrderModel.updateOne = jest.fn().mockReturnThis();
  mockOrderModel.exec = jest.fn();
  mockOrderModel.aggregate = jest.fn();

  const mockClientProxy = {
    emit: jest.fn(() => ({
      toPromise: jest.fn().mockResolvedValue(undefined),
    })),
  };

  const mockOrderReportModel = {
    new: jest.fn().mockResolvedValue({ save: jest.fn().mockResolvedValue({}) }),
    findOne: jest.fn(),
    find: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    exec: jest.fn(),
  };

  beforeEach(async () => {
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
    orderReportModel = module.get<Model<OrderReport>>(
      getModelToken(OrderReport.name),
    );
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

      const savedOrder = {
        ...createOrderDto,
        _id: 'a-unique-object-id',
        payment: {
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

      expect(mockOrderModel).not.toHaveBeenCalled();
      expect(paymentQueue.emit).not.toHaveBeenCalled();
    });
  });

  describe('handleOrderPaymentConfirmed', () => {
    it('should retry payment confirmation upon failure', async () => {
      const confirmDto: ConfirmPaymentResponseDto = {
        orderId: 'order1',
        success: false,
        message: 'Confirmation Failed',
      };
      const eventPayload = new EventData(confirmDto, 1);
      const mockOrder = {
        _id: 'order1',
        status: OrderStatus.pendingPayment,
        payment: { paymentId: 12345 },
      };
      jest
        .spyOn(service as any, 'validateOrderIdempotency')
        .mockResolvedValue(true);
      jest.spyOn(service, 'getOrder').mockResolvedValue(mockOrder as any);

      await service.handleOrderPaymentConfirmed(eventPayload);

      expect(paymentQueue.emit).toHaveBeenCalledWith(
        'payment.confirm',
        expect.any(Object),
      );
    });

    it('should cancel the order after exceeding max retries for payment confirmation', async () => {
      const confirmDto: ConfirmPaymentResponseDto = {
        orderId: 'order1',
        success: false,
        message: 'Confirmation Failed',
      };
      // CORREÇÃO: currentTry deve ser maior que maxTries para acionar o cancelamento
      const eventPayload = new EventData(confirmDto, 6);
      const mockOrder = {
        _id: 'order1',
        status: OrderStatus.pendingPayment,
        payment: { paymentId: 12345 },
      };
      jest
        .spyOn(service as any, 'validateOrderIdempotency')
        .mockResolvedValue(true);
      jest.spyOn(service, 'getOrder').mockResolvedValue(mockOrder as any);
      const cancelOrderSpy = jest
        .spyOn(service, 'cancelOrder')
        .mockResolvedValue(undefined);

      await service.handleOrderPaymentConfirmed(eventPayload);

      expect(cancelOrderSpy).toHaveBeenCalledWith(
        expect.objectContaining({ orderId: 'order1' }),
      );
    });

    it('should not confirm payment for an order with an invalid status', async () => {
      const confirmDto: ConfirmPaymentResponseDto = {
        orderId: 'order1',
        success: true,
        message: 'Confirmed',
      };
      const eventPayload = new EventData(confirmDto);
      const mockOrder = {
        _id: 'order1',
        status: OrderStatus.shipped,
      };
      jest
        .spyOn(service as any, 'validateOrderIdempotency')
        .mockResolvedValue(true);
      jest.spyOn(service, 'getOrder').mockResolvedValue(mockOrder as any);

      await service.handleOrderPaymentConfirmed(eventPayload);

      expect(orderModel.updateOne).not.toHaveBeenCalled();
      expect(stockQueue.emit).not.toHaveBeenCalled();
    });
  });

  describe('handleStockReservationCreated', () => {
    it('should update the order with the stock reservation ID', async () => {
      const updateDto: UpdateOrderStockReservationDto = {
        eventId: 'event1',
        orderId: 'order1',
        reservationId: 54321,
      };
      const mockOrder = {
        _id: 'order1',
        status: OrderStatus.pendingStock,
      };
      jest
        .spyOn(service as any, 'validateOrderIdempotency')
        .mockResolvedValue(true);
      jest.spyOn(service, 'getOrder').mockResolvedValue(mockOrder as any);

      await service.handleStockReservationCreated(updateDto);

      // CORREÇÃO: O teste agora espera o objeto completo que é enviado para o updateOne
      expect(orderModel.updateOne).toHaveBeenCalledWith(
        { _id: 'order1' },
        {
          $set: {
            stockReservationId: 54321,
            status: OrderStatus.pendingStock,
          },
          $push: {
            statusHistory: expect.objectContaining({
              eventId: 'event1',
              status: OrderStatus.pendingStock,
            }),
          },
        },
      );
    });

    it('should emit a stock.reservation.confirm event', async () => {
      const updateDto: UpdateOrderStockReservationDto = {
        eventId: 'event1',
        orderId: 'order1',
        reservationId: 54321,
      };
      const mockOrder = {
        _id: 'order1',
        status: OrderStatus.pendingStock,
      };
      jest
        .spyOn(service as any, 'validateOrderIdempotency')
        .mockResolvedValue(true);
      jest.spyOn(service, 'getOrder').mockResolvedValue(mockOrder as any);

      await service.handleStockReservationCreated(updateDto);

      expect(paymentQueue.emit).toHaveBeenCalledWith(
        'stock.reservation.confirm',
        expect.any(EventData),
      );
    });
  });

  describe('handleStockReservationConfirmed', () => {
    it('should retry stock confirmation upon failure', async () => {
      const confirmDto: ConfirmStockReservationReponseDto = {
        orderId: 'order1',
        success: false,
        message: 'Reservation Failed',
      };
      const eventPayload = new EventData(confirmDto, 1);
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

      expect(stockQueue.emit).toHaveBeenCalledWith(
        'stock.reservation.confirm',
        expect.any(Object),
      );
    });

    it('should cancel the order after exceeding max retries for stock confirmation', async () => {
      const confirmDto: ConfirmStockReservationReponseDto = {
        orderId: 'order1',
        success: false,
        message: 'Reservation Failed',
      };
      // CORREÇÃO: currentTry deve ser maior que maxTries
      const eventPayload = new EventData(confirmDto, 6);
      const mockOrder = {
        _id: 'order1',
        status: OrderStatus.pendingStock,
        stockReservationId: 54321,
      };
      jest
        .spyOn(service as any, 'validateOrderIdempotency')
        .mockResolvedValue(true);
      jest.spyOn(service, 'getOrder').mockResolvedValue(mockOrder as any);
      const cancelOrderSpy = jest
        .spyOn(service, 'cancelOrder')
        .mockResolvedValue(undefined);

      await service.handleStockReservationConfirmed(eventPayload);

      expect(cancelOrderSpy).toHaveBeenCalledWith(
        expect.objectContaining({ orderId: 'order1' }),
      );
    });

    it('should set the order status to ready upon successful stock confirmation', async () => {
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

      expect(orderModel.updateOne).toHaveBeenCalledWith(
        { _id: 'order1' },
        expect.objectContaining({
          $set: { status: OrderStatus.ready },
        }),
      );
    });

    it('should not confirm stock reservation for an order with an invalid status', async () => {
      const confirmDto: ConfirmStockReservationReponseDto = {
        orderId: 'order1',
        success: true,
        message: 'Reserved',
      };
      const eventPayload = new EventData(confirmDto);
      const mockOrder = {
        _id: 'order1',
        status: OrderStatus.delivered,
        stockReservationId: 54321,
      };
      jest
        .spyOn(service as any, 'validateOrderIdempotency')
        .mockResolvedValue(true);
      jest.spyOn(service, 'getOrder').mockResolvedValue(mockOrder as any);

      await service.handleStockReservationConfirmed(eventPayload);

      expect(orderModel.updateOne).not.toHaveBeenCalled();
    });
  });

  describe('cancelOrder', () => {
    it('should set the order status to canceled', async () => {
      const updateDto: UpdateOrderDto = {
        eventId: 'event1',
        orderId: 'order1',
      };
      jest
        .spyOn(service as any, 'validateOrderIdempotency')
        .mockResolvedValue(true);

      await service.cancelOrder(updateDto);

      expect(orderModel.updateOne).toHaveBeenCalledWith(
        { _id: 'order1' },
        expect.objectContaining({
          $set: { status: OrderStatus.canceled },
        }),
      );
    });

    it('should add a reason to the status history when an order is canceled', async () => {
      const updateDto: UpdateOrderDto = {
        eventId: 'event1',
        orderId: 'order1',
        reason: 'Out of stock',
      };
      jest
        .spyOn(service as any, 'validateOrderIdempotency')
        .mockResolvedValue(true);

      await service.cancelOrder(updateDto);

      expect(orderModel.updateOne).toHaveBeenCalledWith(
        { _id: 'order1' },
        expect.objectContaining({
          $push: {
            statusHistory: expect.objectContaining({
              reason: 'Out of stock',
            }),
          },
        }),
      );
    });
  });

  describe('getOrderReports', () => {
    it('should return a list of order reports', async () => {
      const mockReports = [
        { timestamp: '2023-01-01' },
        { timestamp: '2023-01-02' },
      ];
      (orderReportModel.exec as jest.Mock).mockResolvedValue(mockReports);

      const reports = await service.getOrderReports();

      expect(reports).toEqual(mockReports);
      expect(orderReportModel.find).toHaveBeenCalledWith({});
    });

    it('should limit the number of reports based on pageSize', async () => {
      await service.getOrderReports(5);

      expect(orderReportModel.limit).toHaveBeenCalledWith(5);
    });
  });
});
