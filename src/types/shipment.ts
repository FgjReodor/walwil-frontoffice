// Shipment types for WalWil Front Office

// Party types: SHIP = Shipper, CONS = Consignee, NOT = Notify Party
// Dataverse choice values: 795450000 = SHIP, 795450001 = CONS, 795450002 = NOT
export type PartyType = 'SHIP' | 'CONS' | 'NOT';
export type PartyTypeNumeric = 795450000 | 795450001 | 795450002;

// Map numeric Dataverse values to string types
export const PARTY_TYPE_MAP: Record<PartyTypeNumeric, PartyType> = {
  795450000: 'SHIP',
  795450001: 'CONS',
  795450002: 'NOT',
};

export function normalizePartyType(value: PartyType | PartyTypeNumeric | number): PartyType {
  if (typeof value === 'string') return value;
  return PARTY_TYPE_MAP[value as PartyTypeNumeric] || 'SHIP';
}

export interface ShipmentParty {
  id: string;
  partyType: PartyType;
  nameLine1: string;
  nameLine2?: string;
  addressLine1?: string;
  addressLine2?: string;
  addressLine3?: string;
  city?: string;
  country?: string;
  postalCode?: string;
}

export interface Shipment {
  id: string;
  blNumber: string;
  vesselVoyage?: string;
  manufacturer: string;
  status: string;
  polCode?: string;  // Port of Loading code (e.g., "GBSOU")
  podCode?: string;  // Port of Destination code (e.g., "AUSYD")
  // Legacy fields - kept for backwards compatibility
  departureFrom?: string;
  portOfDestination?: string;
  totalUnits: number;
  totalWeightKg?: number;
  totalCbm?: number;
  hasMissingData: boolean;
  missingFields?: string;
  ambiguousFields?: string;  // Comma-separated "field:reason" pairs for data that needs verification
  vehiclesMissingWeight?: string;
  // Parties (structured data from Shipment Parties table)
  parties?: ShipmentParty[];
  // Legacy flat fields (kept for backwards compatibility)
  shipperInfo?: string;
  consigneeInfo?: string;
  notifyInfo?: string;
  siFileUrl?: string;
  receivedDate: string;
  replyReceived?: boolean;
  // Email fields (to be added to API)
  senderEmail?: string;
  emailSubject?: string;
  emailBodyPreview?: string;
  // User notes for issues
  notes?: string;
}

export interface ShipmentDetail extends Shipment {
  vehicles: Vehicle[];
  charges: Charge[];
}

export interface Vehicle {
  id: string;
  vin: string;
  model: string;
  weightKg: number | null;
  cbm: number;
  hsCode?: string;
}

export interface Charge {
  id: string;
  chargeCode: string;
  description: string;
  quantity: number;
  rate: number;
  currency: string;
  amount: number;
  freightTerms: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  count?: number;
  error?: string;
  message?: string;
}

// Email thread types
export interface EmailMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  from: string;
  to: string;
  subject: string;
  body: string;
  sentAt?: string;
  receivedAt?: string;
  hasAttachment?: boolean;
}

export interface EmailThread {
  shipmentId: string;
  emails: EmailMessage[];
}

// Priority and Status types
export type Priority = 'critical' | 'medium' | 'ready';
export type ShipmentStatus = 'urgent' | 'awaiting_customer' | 'new' | 'processing' | 'completed';

// Filter options
export interface ShipmentFilters {
  search?: string;
  manufacturer?: string;
  priority?: Priority;
  status?: ShipmentStatus;
  departureFrom?: string;
  hasMissingData?: boolean;
}
