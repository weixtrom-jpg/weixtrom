import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { HealthController } from './health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AuditModule } from './audit/audit.module';
import { NotificationsModule } from './notifications/notifications.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { UploadsModule } from './uploads/uploads.module';
import { LegalObligationsModule } from './legal-obligations/legal-obligations.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    // S1: Rate limiting global — 60 req/min por IP
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    PrismaModule,
    AuditModule,
    NotificationsModule,
    AuthModule,
    UsersModule,
    VehiclesModule,
    UploadsModule,
    LegalObligationsModule,
  ],
  controllers: [HealthController],
  providers: [
    // S1: Aplicar ThrottlerGuard globalmente
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
