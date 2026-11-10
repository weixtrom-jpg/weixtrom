-- AddForeignKey
ALTER TABLE "supplier_quote_requests" ADD CONSTRAINT "supplier_quote_requests_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "workshops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
