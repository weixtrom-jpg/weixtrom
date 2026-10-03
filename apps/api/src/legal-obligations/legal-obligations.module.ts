import { Module } from '@nestjs/common';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { LegalObligationsService } from './legal-obligations.service';
import { LegalObligationsController } from './legal-obligations.controller';
import { LegalAlertsCronService } from './legal-alerts-cron.service';

@Module({
  imports: [VehiclesModule],
  controllers: [LegalObligationsController],
  providers: [LegalObligationsService, LegalAlertsCronService],
  exports: [LegalObligationsService],
})
export class LegalObligationsModule {}
