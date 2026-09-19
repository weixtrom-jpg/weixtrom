import { VehicleStatus, LegalObligationType } from './enums';

export interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  color?: string;
  ownerId: string;
  status: VehicleStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface LegalObligation {
  id: string;
  vehicleId: string;
  type: LegalObligationType;
  expiryDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface LegalAlert {
  id: string;
  obligationId: string;
  daysBeforeDue: number;
  sentAt: Date | null;
  cancelled: boolean;
  createdAt: Date;
}

export interface CreateVehicleRequest {
  plate: string;
  brand: string;
  model: string;
  year: number;
  color?: string;
}
