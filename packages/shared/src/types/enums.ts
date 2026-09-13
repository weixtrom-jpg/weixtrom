export enum UserRole {
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

export enum LegalObligationType {
  SOAT = 'SOAT',
  RTM = 'RTM',
  INSURANCE = 'INSURANCE',
}
