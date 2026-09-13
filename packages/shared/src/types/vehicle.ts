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
  notified30: boolean;
  notified15: boolean;
  notified5: boolean;
}

export interface CreateVehicleRequest {
  plate: string;
  brand: string;
  model: string;
  year: number;
  color?: string;
}
