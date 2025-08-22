import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { OrdersService } from '../src/orders/orders.service';
import { OrderStatus } from '../src/orders/schemas/order.schema';

describe('OrdersController (e2e)', () => {
  let app: INestApplication;
  let ordersService: OrdersService;

  // Mock de dados que esperamos que o serviço retorne
  const mockReadyOrders = [
    {
      _id: 'order1',
      status: OrderStatus.ready,
      items: [{ itemName: 'Test Item 1', quantity: 1 }],
    },
    {
      _id: 'order2',
      status: OrderStatus.ready,
      items: [{ itemName: 'Test Item 2', quantity: 2 }],
    },
  ];

  beforeAll(async () => {
    // Cria um mock do serviço para não depender do banco de dados real
    const mockOrdersService = {
      getReadyOrders: () => Promise.resolve(mockReadyOrders),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      // Sobrescreve o provedor original pelo nosso mock
      .overrideProvider(OrdersService)
      .useValue(mockOrdersService)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    ordersService = moduleFixture.get<OrdersService>(OrdersService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('/orders/ready (GET)', () => {
    // 1. Arrange: Mock do método do serviço
    const getReadyOrdersSpy = jest.spyOn(ordersService, 'getReadyOrders');

    // 2. Act & 3. Assert
    return request(app.getHttpServer())
      .get('/orders/ready')
      .expect(200)
      .expect((res) => {
        // Verifica se o serviço foi chamado
        expect(getReadyOrdersSpy).toHaveBeenCalled();
        // Verifica se o corpo da resposta é igual ao nosso mock
        expect(res.body).toEqual(mockReadyOrders);
      });
  });
});
