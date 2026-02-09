import { Shipment, ShipmentDetail, ApiResponse, EmailThread } from '@/types/shipment';

// Environment variables (server-side only)
const API_KEY = process.env.POWER_AUTOMATE_API_KEY || '';
const SHIPMENTS_URL = process.env.POWER_AUTOMATE_GET_SHIPMENTS_URL || '';
const SHIPMENT_DETAIL_BASE = process.env.POWER_AUTOMATE_SHIPMENT_DETAIL_BASE || '';
const SHIPMENT_DETAIL_QUERY = process.env.POWER_AUTOMATE_SHIPMENT_DETAIL_QUERY || '';
const GENERATE_CSV_BASE = process.env.POWER_AUTOMATE_GENERATE_CSV_BASE || '';
const GENERATE_CSV_QUERY = process.env.POWER_AUTOMATE_GENERATE_CSV_QUERY || '';
const SEND_EMAIL_BASE = process.env.POWER_AUTOMATE_SEND_EMAIL_BASE || '';
const SEND_EMAIL_QUERY = process.env.POWER_AUTOMATE_SEND_EMAIL_QUERY || '';
const EMAIL_THREAD_BASE = process.env.POWER_AUTOMATE_EMAIL_THREAD_BASE || '';
const EMAIL_THREAD_QUERY = process.env.POWER_AUTOMATE_EMAIL_THREAD_QUERY || '';

// Check if we're using real API or mock data
const USE_MOCK_DATA = !SHIPMENTS_URL || SHIPMENTS_URL.includes('your-flow-url');

interface FetchOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  timeout?: number;
}

async function fetchApi<T>(url: string, options: FetchOptions = {}): Promise<ApiResponse<T>> {
  const { method = 'GET', body, timeout = 30000 } = options;

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    console.log(`[API] ${method} ${url.substring(0, 80)}...`);

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`[API] Error: ${response.status} ${response.statusText}`);

      if (response.status === 401) {
        return {
          success: false,
          data: null as T,
          error: 'Unauthorized',
          message: 'Invalid or missing API key',
        };
      }

      // Try to parse error response
      try {
        const errorData = await response.json();
        return {
          success: false,
          data: null as T,
          error: `HTTP ${response.status}`,
          message: errorData.message || response.statusText,
        };
      } catch {
        return {
          success: false,
          data: null as T,
          error: `HTTP ${response.status}`,
          message: response.statusText,
        };
      }
    }

    const data = await response.json();
    console.log(`[API] Success:`, { success: data.success, count: data.count });
    return data;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[API] Request timeout');
      return {
        success: false,
        data: null as T,
        error: 'Timeout',
        message: 'Request timed out. Please try again.',
      };
    }

    console.error('[API] Fetch error:', error);
    return {
      success: false,
      data: null as T,
      error: 'NetworkError',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Fetch all shipments from Power Automate API
 */
export async function getShipments(): Promise<ApiResponse<Shipment[]>> {
  if (USE_MOCK_DATA) {
    console.log('[API] Using mock data for shipments list');
    return {
      success: true,
      data: mockShipments,
      count: mockShipments.length,
    };
  }

  return fetchApi<Shipment[]>(SHIPMENTS_URL);
}

/**
 * Fetch single shipment with vehicles and charges
 */
export async function getShipmentDetail(id: string): Promise<ApiResponse<ShipmentDetail>> {
  if (USE_MOCK_DATA) {
    console.log('[API] Using mock data for shipment detail:', id);
    const shipment = mockShipments.find((s) => s.id === id);
    if (!shipment) {
      return {
        success: false,
        data: null as unknown as ShipmentDetail,
        error: 'NotFound',
        message: 'Shipment not found',
      };
    }
    return {
      success: true,
      data: { ...mockShipmentDetail, ...shipment },
    };
  }

  const url = `${SHIPMENT_DETAIL_BASE}${id}${SHIPMENT_DETAIL_QUERY}`;
  return fetchApi<ShipmentDetail>(url);
}

/**
 * Generate CSV for a shipment
 */
export async function generateCsv(
  id: string
): Promise<ApiResponse<{ fileName: string; fileUrl: string }>> {
  if (USE_MOCK_DATA) {
    console.log('[API] Mock: Generate CSV for shipment:', id);
    return {
      success: true,
      data: {
        fileName: `WW_MOCK_${id}_${new Date().toISOString().split('T')[0]}.csv`,
        fileUrl: 'https://example.com/mock-csv-file.csv',
      },
    };
  }

  const url = `${GENERATE_CSV_BASE}${id}/generate_csv${GENERATE_CSV_QUERY}`;
  return fetchApi<{ fileName: string; fileUrl: string }>(url, { method: 'POST' });
}

/**
 * Send clarification email for a shipment
 */
export async function sendEmail(
  shipmentId: string,
  emailData: { to: string; subject: string; body: string }
): Promise<ApiResponse<{ messageId: string; sentAt: string; shipmentId: string }>> {
  if (USE_MOCK_DATA) {
    console.log('[API] Mock: Send email for shipment:', shipmentId, emailData.to);
    return {
      success: true,
      data: {
        messageId: `mock-msg-${Date.now()}`,
        sentAt: new Date().toISOString(),
        shipmentId,
      },
    };
  }

  const url = `${SEND_EMAIL_BASE}${shipmentId}${SEND_EMAIL_QUERY}`;
  return fetchApi<{ messageId: string; sentAt: string; shipmentId: string }>(url, {
    method: 'POST',
    body: emailData,
  });
}

/**
 * Get email thread for a shipment
 */
export async function getEmailThread(shipmentId: string): Promise<ApiResponse<EmailThread>> {
  // Check if API is configured
  if (!EMAIL_THREAD_BASE || USE_MOCK_DATA) {
    console.log('[API] Email thread API not configured, returning empty thread');
    return {
      success: true,
      data: {
        shipmentId,
        emails: [],
      },
    };
  }

  const url = `${EMAIL_THREAD_BASE}${shipmentId}${EMAIL_THREAD_QUERY}`;
  return fetchApi<EmailThread>(url);
}

/**
 * Update shipment data fields
 */
export interface VehicleUpdateData {
  id: string;
  vin: string;
  model: string;
  weightKg: number | null;
  cbm: number;
  hsCode?: string;
}

export interface PartyUpdateData {
  id: string;
  partyType: 'SHIP' | 'CONS' | 'NOT';
  nameLine1: string;
  nameLine2?: string;
  addressLine1?: string;
  addressLine2?: string;
  addressLine3?: string;
  city?: string;
  country?: string;
  postalCode?: string;
}

export interface ShipmentUpdateData {
  vesselVoyage?: string;
  polCode?: string;
  podCode?: string;
  notes?: string;
  vehicles?: VehicleUpdateData[];
  parties?: PartyUpdateData[];
}

const UPDATE_SHIPMENT_BASE = process.env.POWER_AUTOMATE_UPDATE_SHIPMENT_BASE || '';
const UPDATE_SHIPMENT_QUERY = process.env.POWER_AUTOMATE_UPDATE_SHIPMENT_QUERY || '';

export async function updateShipment(
  shipmentId: string,
  data: ShipmentUpdateData
): Promise<ApiResponse<Shipment>> {
  if (USE_MOCK_DATA) {
    console.log('[API] Mock: Update shipment:', shipmentId, data);
    // Find and update the mock shipment
    const shipment = mockShipments.find(s => s.id === shipmentId);
    if (!shipment) {
      return {
        success: false,
        data: null as unknown as Shipment,
        error: 'NotFound',
        message: 'Shipment not found',
      };
    }
    // Merge updates into the mock
    const updated = { ...shipment, ...data };
    return {
      success: true,
      data: updated,
    };
  }

  // Check if API is configured
  if (!UPDATE_SHIPMENT_BASE) {
    console.log('[API] Update shipment API not configured');
    return {
      success: false,
      data: null as unknown as Shipment,
      error: 'NotConfigured',
      message: 'Update API not configured. Changes saved locally only.',
    };
  }

  const url = `${UPDATE_SHIPMENT_BASE}${shipmentId}${UPDATE_SHIPMENT_QUERY}`;
  return fetchApi<Shipment>(url, {
    method: 'POST',
    body: data,
  });
}

// =============================================================================
// Mock Data (used when API is not configured or for development)
// =============================================================================

export const mockShipments: Shipment[] = [
  {
    id: '1',
    blNumber: 'WLWHAEF513U9',
    vesselVoyage: 'TORRENS',
    manufacturer: 'BMW Group',
    status: 'New',
    polCode: 'GBSOU',
    podCode: 'AUSYD',
    totalUnits: 14,
    hasMissingData: true,
    missingFields: 'container_number',
    receivedDate: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // 48 hours ago - critical
    senderEmail: 'john.smith@bmw.com',
  },
  {
    id: '2',
    blNumber: 'WLWHAEF514U0',
    vesselVoyage: 'ANIARA',
    manufacturer: 'Aston Martin',
    status: 'New',
    polCode: 'GBSOU',
    podCode: 'NZAKL',
    totalUnits: 8,
    hasMissingData: true,
    missingFields: 'duplicate_vin',
    receivedDate: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(), // 36 hours ago - critical
    senderEmail: 'logistics@astonmartin.com',
  },
  {
    id: '3',
    blNumber: 'WLWHAEF515U1',
    vesselVoyage: 'ENDURANCE',
    manufacturer: 'BMW Group',
    status: 'New',
    polCode: 'DEHAM',
    podCode: 'USNYC',
    totalUnits: 22,
    hasMissingData: true,
    missingFields: 'hs_code',
    vehiclesMissingWeight: 'WBA123456789, WBA987654321',
    receivedDate: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago - medium
    senderEmail: 'shipping@bmw.de',
  },
  {
    id: '4',
    blNumber: 'WLWHAEF516U2',
    vesselVoyage: 'PARSIFAL',
    manufacturer: 'BMW Group',
    status: 'New',
    polCode: 'GBSOU',
    podCode: 'CAHAL',
    totalUnits: 18,
    hasMissingData: false,
    receivedDate: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago - ready
    senderEmail: 'exports@bmw.co.uk',
  },
];

export const mockShipmentDetail: ShipmentDetail = {
  ...mockShipments[0],
  totalWeightKg: 29400,
  totalCbm: 212.8,
  shipperInfo: 'BMW AG\nPetuelring 130\n80788 Munich, Germany',
  consigneeInfo: 'BMW Australia\n783 Springvale Road\nMulgrave VIC 3170',
  notifyInfo: 'Same as consignee',
  siFileUrl: 'https://example.com/si-file.xlsx',
  vehicles: [
    { id: 'v1', vin: 'WBA123456789012345', model: 'X5 xDrive40i', weightKg: 2100, cbm: 15.2 },
    { id: 'v2', vin: 'WBA234567890123456', model: 'X7 M50i', weightKg: 2450, cbm: 17.8 },
    { id: 'v3', vin: 'WBA345678901234567', model: '330i', weightKg: null, cbm: 12.1 },
  ],
  charges: [
    {
      id: 'c1',
      chargeCode: 'OCEAN',
      description: 'Ocean Freight',
      quantity: 14,
      rate: 280,
      currency: 'USD',
      amount: 3920,
      freightTerms: 'PREPAID',
    },
    {
      id: 'c2',
      chargeCode: 'BAH',
      description: 'Bunker Adjustment',
      quantity: 14,
      rate: 45,
      currency: 'USD',
      amount: 630,
      freightTerms: 'PREPAID',
    },
    {
      id: 'c3',
      chargeCode: 'THC',
      description: 'Terminal Handling',
      quantity: 14,
      rate: 85,
      currency: 'USD',
      amount: 1190,
      freightTerms: 'COLLECT',
    },
  ],
};
