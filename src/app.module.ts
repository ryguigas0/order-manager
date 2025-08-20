import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OrdersModule } from './orders/orders.module';
// import { PaymentModule } from './payment/payment.module';
import { StockModule } from './stock/stock.module';
import { BackofficeModule } from './backoffice/backoffice.module';

@Module({
  imports: [OrdersModule, StockModule, BackofficeModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
