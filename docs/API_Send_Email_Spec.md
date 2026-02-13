# Send Email API Specification

**Status:** ✅ Implemented
**Flow Name:** API - Send Email
**Last Updated:** February 5, 2026

---

## Overview

HTTP-triggered Power Automate flow that sends clarification emails to customers and tracks the action in Dataverse.

---

## Endpoint

```
POST /shipments/{id}/send-email
```

## Authentication

Header: `x-api-key: ww-frontoffice-2026-xK9mP2nQ`

---

## Request

### URL Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string (GUID) | Shipment ID from Dataverse |

### Request Body

```json
{
  "to": "john.smith@bmw.com",
  "subject": "URGENT: Container Number Verification - WLWHAEF513U9",
  "body": "Dear John,\n\nWe have identified an issue with the shipping documentation for booking WLWHAEF513U9 for vessel TORRENS departing UK to SYDNEY.\n\n**Issue Detected:** Container number does not follow the standard ISO format required for customs clearance.\n\nPlease verify and confirm the correct container number immediately.\n\nBest regards,\nDocumentation Specialist\nWalWil Shipping"
}
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| to | string | Yes | Recipient email address |
| subject | string | Yes | Email subject line |
| body | string | Yes | Email body (plain text, can include markdown) |

---

## Response

### Success (200)

```json
{
  "success": true,
  "data": {
    "messageId": "AAMkADA0OGYx...",
    "sentAt": "2026-01-26T14:30:00Z",
    "shipmentId": "ad0d5446-baf7-f011-8406-00224802e073"
  }
}
```

### Error (400 - Bad Request)

```json
{
  "success": false,
  "error": "ValidationError",
  "message": "Missing required field: to"
}
```

### Error (404 - Not Found)

```json
{
  "success": false,
  "error": "NotFound",
  "message": "Shipment not found"
}
```

### Error (401 - Unauthorized)

```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Invalid or missing API key"
}
```

---

## Flow Implementation (Actual)

### HTTP Trigger

```json
{
  "type": "Request",
  "kind": "Http",
  "inputs": {
    "triggerAuthenticationType": "All",
    "schema": {
      "type": "object",
      "properties": {
        "to": { "type": "string" },
        "subject": { "type": "string" },
        "body": { "type": "string" }
      },
      "required": ["to", "subject", "body"]
    },
    "method": "POST",
    "relativePath": "/shipments/{id}/send_email"
  }
}
```

### Validate API Key (Condition)

```
Expression: triggerOutputs()?['headers']?['x-api-key'] equals 'ww-frontoffice-2026-xK9mP2nQ'
```

### If Valid - Get Shipment

```json
{
  "type": "OpenApiConnection",
  "inputs": {
    "parameters": {
      "entityName": "fgj_shipments",
      "recordId": "@triggerOutputs()?['relativePathParameters']['id']"
    },
    "host": {
      "operationId": "GetItem"
    }
  }
}
```

### Check Shipment Exists (Condition 2)

```
Expression: outputs('Get_Shipment')?['body/fgj_shipmentid'] not equals ''
```

### If Found - Send Email

```json
{
  "type": "OpenApiConnection",
  "inputs": {
    "parameters": {
      "emailMessage/To": "@triggerBody()?['to']",
      "emailMessage/Subject": "@triggerBody()?['subject']",
      "emailMessage/Body": "<p>@{triggerBody()?['body']}</p>",
      "emailMessage/Importance": "Normal"
    },
    "host": {
      "operationId": "SendEmailV2"
    }
  }
}
```

### Create Outbound Email Record

```json
{
  "type": "OpenApiConnection",
  "inputs": {
    "parameters": {
      "entityName": "fgj_shipmentemails",
      "item/fgj_direction": 1,
      "item/fgj_from": "reodor@power.ai",
      "item/fgj_Shipment@odata.bind": "/fgj_shipments(@{outputs('Get_Shipment')?['body/fgj_shipmentid']})",
      "item/fgj_to": "@triggerBody()?['to']",
      "item/fgj_body": "@triggerBody()?['body']",
      "item/fgj_sentat": "@utcNow()"
    },
    "host": {
      "operationId": "CreateRecord"
    }
  }
}
```

**Note:** The `fgj_Shipment@odata.bind` must use the format `/fgj_shipments(GUID)` for the lookup to work.

### Update Shipment

```json
{
  "type": "OpenApiConnection",
  "inputs": {
    "parameters": {
      "entityName": "fgj_shipments",
      "recordId": "@outputs('Get_Shipment')?['body/fgj_shipmentid']",
      "item/fgj_emailsubject": "@triggerBody()?['subject']",
      "item/fgj_emailsent": true,
      "item/fgj_emailsentdate": "@utcNow()",
      "item/fgj_lastemailto": "@triggerBody()?['to']",
      "item/fgj_status": "Email Sent"
    },
    "host": {
      "operationId": "UpdateOnlyRecord"
    }
  }
}
```

### Success Response (200)

```json
{
  "success": true,
  "data": {
    "messageId": "@{outputs('Send_Email')?['body/Id']}",
    "sentAt": "@{utcNow()}",
    "shipmentId": "@{outputs('Get_Shipment')?['body/fgj_shipmentid']}"
  }
}
```

### Error Responses

**Not Found (404):**
```json
{
  "success": false,
  "error": "NotFound",
  "message": "Shipment not found"
}
```

**Unauthorized (401):**
```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Invalid or missing API key"
}
```

---

## Dataverse Tables

### fgj_shipments (updated fields)

| Field | Type | Description |
|-------|------|-------------|
| fgj_emailsent | Yes/No | Whether clarification email was sent |
| fgj_emailsentdate | DateTime | When email was sent |
| fgj_lastemailto | Text | Last email recipient |
| fgj_emailsubject | Text | Last email subject |
| fgj_status | Text | Current status (e.g., "Email Sent") |

### fgj_shipmentemails

| Field | Type | Description |
|-------|------|-------------|
| fgj_shipmentemailid | GUID | Primary key |
| fgj_direction | Choice | 1 = Outbound, 0 = Inbound |
| fgj_from | Text | Sender email address |
| fgj_to | Text | Recipient email address |
| fgj_subject | Text | Email subject |
| fgj_body | Multiline Text | Email body content |
| fgj_sentat | DateTime | When email was sent |
| fgj_receivedat | DateTime | When email was received |
| fgj_Shipment | Lookup | Reference to fgj_shipments |

---

## Frontend Integration

Environment variables configured in `.env.local`:

```env
POWER_AUTOMATE_SEND_EMAIL_BASE=https://prod-08.norwayeast.logic.azure.com/workflows/.../triggers/manual/paths/invoke/shipments/
POWER_AUTOMATE_SEND_EMAIL_QUERY=/send_email?api-version=2016-06-01&sp=...&sig=...
```

The frontend calls this API via `sendShipmentEmail()` in `frontend/src/app/shipments/actions/shipments.ts`.
