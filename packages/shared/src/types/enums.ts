// Estos enums deben coincidir EXACTAMENTE con los del schema Prisma.
// El nombre del enum en Prisma se indica en comentario cuando difiere.

// Prisma: enum Role
export enum Role {
  CLIENT = 'CLIENT',
  WORKSHOP_ADMIN = 'WORKSHOP_ADMIN',
  TECHNICIAN = 'TECHNICIAN',
  SUPPLIER_ADMIN = 'SUPPLIER_ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export enum UserStatus {
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  BLOCKED = 'BLOCKED',
}

export enum VehicleStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum LegalObligationType {
  SOAT = 'SOAT',
  RTM = 'RTM',
  INSURANCE = 'INSURANCE',
}

export enum DiagnosticRequestStatus {
  PENDING = 'PENDING',
  TAKEN = 'TAKEN',
  DIAGNOSED = 'DIAGNOSED',
  EXPIRED = 'EXPIRED',
}

export enum QuotationStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum QuotationItemType {
  SERVICE = 'SERVICE',
  PART = 'PART',
}

export enum ProductStatus {
  ACTIVE = 'ACTIVE',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  INACTIVE = 'INACTIVE',
}

export enum SupplierQuoteRequestStatus {
  PENDING = 'PENDING',
  PARTIALLY_RESPONDED = 'PARTIALLY_RESPONDED',
  FULLY_RESPONDED = 'FULLY_RESPONDED',
  EXPIRED = 'EXPIRED',
}

export enum WorkOrderStatus {
  CREATED = 'CREATED',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum InvoiceStatus {
  ISSUED = 'ISSUED',
  PAYMENT_PENDING = 'PAYMENT_PENDING',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}
