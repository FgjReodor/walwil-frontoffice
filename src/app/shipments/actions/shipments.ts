'use server';

import { getShipments, getShipmentDetail, generateCsv, sendEmail, getEmailThread, updateShipment, ShipmentUpdateData } from '@/lib/api';
import type { Shipment, ShipmentDetail, ApiResponse, EmailThread } from '@/types/shipment';

/**
 * Server action to fetch all shipments
 */
export async function fetchShipments(): Promise<ApiResponse<Shipment[]>> {
  try {
    const response = await getShipments();
    return response;
  } catch (error) {
    console.error('[Action] fetchShipments error:', error);
    return {
      success: false,
      data: [],
      error: 'ServerError',
      message: 'Failed to fetch shipments',
    };
  }
}

/**
 * Server action to fetch shipment detail
 */
export async function fetchShipmentDetail(id: string): Promise<ApiResponse<ShipmentDetail>> {
  try {
    const response = await getShipmentDetail(id);
    return response;
  } catch (error) {
    console.error('[Action] fetchShipmentDetail error:', error);
    return {
      success: false,
      data: null as unknown as ShipmentDetail,
      error: 'ServerError',
      message: 'Failed to fetch shipment detail',
    };
  }
}

/**
 * Server action to generate CSV
 */
export async function generateShipmentCsv(
  id: string
): Promise<ApiResponse<{ fileName: string; fileUrl: string }>> {
  try {
    const response = await generateCsv(id);
    return response;
  } catch (error) {
    console.error('[Action] generateShipmentCsv error:', error);
    return {
      success: false,
      data: { fileName: '', fileUrl: '' },
      error: 'ServerError',
      message: 'Failed to generate CSV',
    };
  }
}

/**
 * Server action to send clarification email
 */
export async function sendShipmentEmail(
  shipmentId: string,
  emailData: { to: string; subject: string; body: string }
): Promise<ApiResponse<{ messageId: string; sentAt: string; shipmentId: string }>> {
  try {
    const response = await sendEmail(shipmentId, emailData);
    return response;
  } catch (error) {
    console.error('[Action] sendShipmentEmail error:', error);
    return {
      success: false,
      data: { messageId: '', sentAt: '', shipmentId: '' },
      error: 'ServerError',
      message: 'Failed to send email',
    };
  }
}

/**
 * Server action to fetch email thread for a shipment
 */
export async function fetchEmailThread(shipmentId: string): Promise<ApiResponse<EmailThread>> {
  try {
    const response = await getEmailThread(shipmentId);
    return response;
  } catch (error) {
    console.error('[Action] fetchEmailThread error:', error);
    return {
      success: false,
      data: { shipmentId, emails: [] },
      error: 'ServerError',
      message: 'Failed to fetch email thread',
    };
  }
}

/**
 * Server action to update shipment data
 */
export async function updateShipmentData(
  shipmentId: string,
  data: ShipmentUpdateData
): Promise<ApiResponse<Shipment>> {
  try {
    const response = await updateShipment(shipmentId, data);
    return response;
  } catch (error) {
    console.error('[Action] updateShipmentData error:', error);
    return {
      success: false,
      data: null as unknown as Shipment,
      error: 'ServerError',
      message: 'Failed to update shipment',
    };
  }
}
