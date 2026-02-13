# Get Email Thread API Specification

**Status:** ✅ Implemented
**Flow Name:** API - Get Email Thread
**Last Updated:** February 5, 2026

---

## Overview

HTTP-triggered Power Automate flow that retrieves the email thread (sent emails and customer replies) for a shipment.

---

## Endpoint

```
GET /shipments/{id}/emails
```

## Authentication

Header: `x-api-key: ww-frontoffice-2026-xK9mP2nQ`

---

## Response

### Success (200)

```json
{
  "success": true,
  "data": {
    "shipmentId": "ad0d5446-baf7-f011-8406-00224802e073",
    "emails": [
      {
        "id": "msg-001",
        "direction": "outbound",
        "from": "docs@walwil.com",
        "to": "john.smith@bmw.com",
        "subject": "URGENT: Container Number Verification - WLWHAEF513U9",
        "body": "Dear John,\n\nWe have identified an issue...",
        "sentAt": "2026-01-26T14:30:00Z",
        "receivedAt": null,
        "hasAttachment": false
      },
      {
        "id": "msg-002",
        "direction": "inbound",
        "from": "john.smith@bmw.com",
        "to": "docs@walwil.com",
        "subject": "RE: URGENT: Container Number Verification - WLWHAEF513U9",
        "body": "Hi,\n\nThe correct container number is MSCU1234567.\n\nThanks,\nJohn",
        "sentAt": null,
        "receivedAt": "2026-01-26T15:45:00Z",
        "hasAttachment": false
      }
    ]
  }
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| shipmentId | string (GUID) | The shipment ID |
| emails | array | Array of email messages in chronological order |
| emails[].id | string | Unique message ID |
| emails[].direction | "inbound" \| "outbound" | Whether email was sent or received |
| emails[].from | string | Sender email address |
| emails[].to | string | Recipient email address |
| emails[].subject | string | Email subject line |
| emails[].body | string | Email body (plain text) |
| emails[].sentAt | string (ISO 8601) | When outbound email was sent |
| emails[].receivedAt | string (ISO 8601) | When inbound email was received |
| emails[].hasAttachment | boolean | Whether email has attachments |

### Error (401 - Unauthorized)

```json
{
  "success": false,
  "error": "Unauthorized"
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
    "method": "GET",
    "relativePath": "/shipments/{id}/emails"
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

### List Emails

```json
{
  "type": "OpenApiConnection",
  "inputs": {
    "parameters": {
      "entityName": "fgj_shipmentemails",
      "$filter": "_fgj_shipment_value eq '@{outputs('Get_Shipments')?['body/fgj_shipmentid']}'",
      "$orderby": "fgj_sentat asc,fgj_receivedat asc"
    },
    "host": {
      "operationId": "ListRecords"
    }
  }
}
```

### Format Emails (Select)

```json
{
  "type": "Select",
  "inputs": {
    "from": "@outputs('List_Emails')?['body/value']",
    "select": {
      "id": "@item()?['fgj_shipmentemailid']",
      "direction": "@if(equals(item()?['fgj_direction'], 1), 'outbound', 'inbound')",
      "from": "@item()?['fgj_from']",
      "to": "@item()?['fgj_to']",
      "subject": "@item()?['fgj_subject']",
      "body": "@item()?['fgj_body']",
      "sentAt": "@item()?['fgj_sentat']",
      "receivedAt": "@item()?['fgj_receivedat']",
      "hasAttachment": "@item()?['fgj_hasattachment']"
    }
  }
}
```

**Note:** Direction choice values: 1 = Outbound, 0 = Inbound

### Success Response (200)

```json
{
  "success": true,
  "data": {
    "shipmentId": "@{outputs('Get_Shipments')?['body/fgj_shipmentid']}",
    "emails": "@body('Format_Emails')"
  }
}
```

### Unauthorized Response (401)

```json
{
  "success": false,
  "error": "Unauthorized"
}
```

---

## Dataverse Table: fgj_shipmentemails

| Column | Type | Description |
|--------|------|-------------|
| fgj_shipmentemailid | GUID | Primary key |
| fgj_shipment | Lookup | Link to fgj_shipments table |
| fgj_direction | Choice | 1 = Outbound, 0 = Inbound |
| fgj_from | Text | Sender email |
| fgj_to | Text | Recipient email |
| fgj_subject | Text | Subject line |
| fgj_body | Multiline Text | Email body |
| fgj_sentat | DateTime | When sent (outbound) |
| fgj_receivedat | DateTime | When received (inbound) |
| fgj_hasattachment | Yes/No | Has attachments |

---

## Related Flows

### API - Send Email
Creates outbound email records when sending clarification emails.

### SI Monitor Replies
Creates inbound email records when processing customer replies.

---

## Frontend Integration

Environment variables configured in `.env.local`:

```env
POWER_AUTOMATE_EMAIL_THREAD_BASE=https://prod-08.norwayeast.logic.azure.com/workflows/.../triggers/manual/paths/invoke/shipments/
POWER_AUTOMATE_EMAIL_THREAD_QUERY=/emails?api-version=2016-06-01&sp=...&sig=...
```

The frontend calls this API via `fetchEmailThread()` in `frontend/src/app/shipments/actions/shipments.ts`.
