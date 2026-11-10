import { Module } from '@nestjs/common';
import { SupplierQuotesService } from './supplier-quotes.service';
import { SupplierQuotesController } from './supplier-quotes.controller';

@Module({
  controllers: [SupplierQuotesController],
  providers: [SupplierQuotesService],
  exports: [SupplierQuotesService],
})
export class SupplierQuotesModule {}
