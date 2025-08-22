// test/app.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request, { Response } from 'supertest'; // 1. Importe 'Response' de 'supertest'
import { AppModule } from './../src/app.module';
import { ConfigService } from '@nestjs/config';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let configService: ConfigService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    configService = moduleFixture.get<ConfigService>(ConfigService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('/ (GET)', () => {
    const expectedVersion = configService.get<string>('VERSION');

    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect((res: Response) => {
        const body: { version: string } = res.body;

        expect(body).toHaveProperty('version');
        expect(body.version).toBe(expectedVersion);
      });
  });
});
