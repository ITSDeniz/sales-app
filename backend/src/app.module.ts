import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { ReservationsModule } from './reservations/reservations.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    ProductsModule,
    ReservationsModule,
  ],
})
export class AppModule { }