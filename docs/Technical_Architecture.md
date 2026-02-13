# WalWil Shipping - Technical Architecture

## System Overview

WalWil Shipping automates the processing of shipping instructions (SI) for vehicle logistics. The system receives SI documents via email, extracts data using AI, stores it in Dataverse, and provides a web-based front office for review, editing, and CSV generation.

```
                    ┌─────────────────────────────────────────────┐
                    │              External Inputs                 │
                    ├─────────────────────────────────────────────┤
                    │  Manufacturer emails (BMW, Rolls-Royce)     │
                    │  WWO Rate worksheets (Excel via OneDrive)   │
                    │  Customer reply emails                      │
                    └──────────────┬──────────────────────────────┘
                                   │
                    ┌──────────────▼──────────────────────────────┐
                    │         Power Automate Flows                │
                    │  (Event-triggered processing layer)         │
                    ├─────────────────────────────────────────────┤
                    │  SI Email Processor    → AI Builder         │
                    │  SI Monitor Replies    → AI Builder         │
                    │  WWO Worksheet Parser  → AI Builder         │
                    ├─────────────────────────────────────────────┤
                    │  HTTP API Flows (6 endpoints)               │
                    │  GetShipments, GetShipmentDetail,           │
                    │  SendEmail, GetEmailThread,                 │
                    │  UpdateShipment, GenerateCSV                │
                    └──────────────┬──────────────────────────────┘
                                   │
                    ┌──────────────▼──────────────────────────────┐
                    │         Microsoft Dataverse                  │
                    │  (Central data store)                        │
                    ├─────────────────────────────────────────────┤
                    │  fgj_shipment (central)                     │
                    │  fgj_vehicle, fgj_shipmentparties           │
                    │  fgj_shipmentcharge, fgj_shipmentemail      │
                    │  fgj_rate, fgj_charge, fgj_wwo_bookings    │
                    └──────────────┬──────────────────────────────┘
                                   │
                    ┌──────────────▼──────────────────────────────┐
                    │         Next.js Frontend                     │
                    │  (Azure App Service)                         │
                    ├─────────────────────────────────────────────┤
                    │  Server Actions → Power Automate HTTP APIs  │
                    │  Shipment list, detail, editing              │
                    │  Email compose & thread view                 │
                    │  CSV generation & download                   │
                    └─────────────────────────────────────────────┘
```

---

## Environments

### Production: WalWil USA

| Component | Details |
|-----------|---------|
| Power Platform env | WalWil USA |
| Frontend | Azure App Service: `walwil-frontoffice-fzakgzcgd9ehhvhc.westeurope-01.azurewebsites.net` |
| Auth | Microsoft Entra ID (Easy Auth), multi-tenant |
| API Key | `ww-frontoffice-2026-xK9mP2nQ` |
| OneDrive folder | `/WalWil-Test/` (legacy name) |
| Office Scripts | BMW-Script, WW Excel Generator, WWO Worksheet Parser |
| Email trigger | Main Inbox (Reodor@powerai.no) |
| Frontend env file | `.env.prod` → copy to `.env.local` |
| CI/CD | GitHub Actions → Azure App Service (repo: FgjReodor/walwil-frontoffice) |

### Development/Test: WalWil Test

| Component | Details |
|-----------|---------|
| Power Platform env | WalWil Test |
| Frontend | Local dev server (`localhost:3000`) |
| API Key | `ww-frontoffice-test-2026-xK9mP2nQ` |
| OneDrive folder | `/WalWil-Dev/` |
| Office Scripts | BMW-Script-Dev, WW Excel Generator-Dev, WWO Worksheet Parser-Dev |
| Email trigger | Main Inbox (shared with prod — emails processed in parallel) |
| Frontend env file | `.env.test` → copy to `.env.local` |
| Solution | Unmanaged import of "WalWil Shipping" v1.0.0.1 |

### Switching Environments (Frontend)

```bash
# Switch to test
cp .env.test .env.local

# Switch to production
cp .env.prod .env.local
```

### Change Workflow

```
  Make changes in WalWil Test
         │
         ▼
  Verify changes work
         │
         ▼
  Manually apply same changes to WalWil USA (production)
```

---

## Process Flows

### Flow 1: SI Email Processing (Inbound Shipping Instructions)

```
  Manufacturer sends SI email with Excel attachment
         │
         ▼
  ┌─ SI Email Processor (Outlook trigger: new email with attachment) ─┐
  │                                                                    │
  │  For each attachment:                                              │
  │  1. Save attachment to OneDrive                                    │
  │  2. Run BMW-Script (Office Script) to extract structured data      │
  │  3. AI CALL 1: "Extract SI Data" → header, parties, validation     │
  │     (vehicles: [] — vehicles NOT extracted here)                   │
  │  4. AI CALL 2: "Extract Vehicles" → pipe-delimited vehicle list    │
  │     (VIN|Model|WeightKG|CBM|HSCode per line)                      │
  │  5. Parse vehicle lines → build vehicle records                    │
  │  6. Check: is_shipping_instruction == true?                        │
  │     │                                                              │
  │     ├─ NO → Skip (not a shipping instruction)                      │
  │     │                                                              │
  │     └─ YES ↓                                                       │
  │  7. Look up booking data from fgj_wwo_bookings (by BL number)     │
  │  8. Create fgj_shipment record                                     │
  │  9. Create fgj_shipmentparties (SHIP, CONS, NOT)                   │
  │  10. Create fgj_vehicle records (all vehicles)                     │
  │  11. Look up fgj_rate + fgj_charge by route code                  │
  │  12. Create fgj_shipmentcharge records                             │
  │  13. Generate CSV file → OneDrive /Finished CSV/                   │
  │  14. Generate XLSX from template → OneDrive /Finished XLSX/        │
  │                                                                    │
  └────────────────────────────────────────────────────────────────────┘
```

**AI calls:** 2 per attachment (header+validation, then vehicles)
**Dataverse writes:** shipment, vehicles, parties, charges
**Output files:** CSV + XLSX in OneDrive

#### Why Two AI Calls?

GPT-4.1 truncates output when asked to return both structured JSON (header/party data) and hundreds of vehicle records in a single response. Splitting into two calls solves this:

| Call | Prompt | Input | Output | Tokens |
|------|--------|-------|--------|--------|
| 1 | Extract SI Data | subject, filename, documentContent | JSON with header, parties, validation, `vehicles: []` | ~2,000 |
| 2 | Extract Vehicles | documentContent | Pipe-delimited lines: `VIN\|Model\|WeightKG\|CBM\|HSCode` | ~12,000 (395 vehicles) |

The vehicle prompt uses a dead-simple pipe-delimited format (~15 tokens/vehicle vs ~150 for JSON objects), which prevents the model from being "lazy" and truncating.

### Flow 2: Customer Reply Processing

```
  Customer replies to clarification email (RE: subject)
         │
         ▼
  ┌─ SI Monitor Replies (Outlook trigger: email with "RE:") ──────────┐
  │                                                                    │
  │  1. Match email conversation ID to fgj_shipment                    │
  │  2. Set replyreceived = true on shipment                           │
  │  3. Create inbound fgj_shipmentemail record                        │
  │  4. Send to AI Builder "Extract Reply Data" prompt                 │
  │  5. Parse extracted_weights → update fgj_vehicle weight_kg by VIN  │
  │  6. Parse extracted_fields → update shipment columns               │
  │  7. Re-check vehicles still missing weight                         │
  │  8. Update shipment hasmissingdata + vehiclesmissingweight         │
  │  9. Send notification email to Reodor@powerai.no                   │
  │                                                                    │
  └────────────────────────────────────────────────────────────────────┘
```

**Dataverse writes:** shipment (update), vehicles (update), shipment email (create)

### Flow 3: WWO Rate/Booking Import

```
  Rate worksheet uploaded to OneDrive /WWO-Worksheets/
         │
         ▼
  ┌─ WWO Worksheet Parser (OneDrive trigger: file modified) ──────────┐
  │                                                                    │
  │  1. Run WWO Worksheet Parser script (extract bookings + sheets)    │
  │  2. Send rate sheet data to AI Builder "Structure WWO Rates"       │
  │  3. Parse AI response for rate/charge structures                   │
  │  4. Create fgj_rate records per manufacturer/route                 │
  │  5. Create fgj_charge records linked to rates                      │
  │  6. Filter out existing bookings (no duplicates)                   │
  │  7. Create new fgj_wwo_bookings records                            │
  │                                                                    │
  └────────────────────────────────────────────────────────────────────┘
```

**Dataverse writes:** rates, charges, bookings

### Flow 4: Front Office User Workflow

```
  User opens Front Office (Next.js app)
         │
         ▼
  ┌─ Shipment List ──────────────────────────────────────────────────┐
  │  GET /shipments → API-GetShipments flow → list from Dataverse    │
  │  Shows: BL number, vessel, manufacturer, status, missing data    │
  └──────────────────────────────┬───────────────────────────────────┘
                                 │ Click shipment
                                 ▼
  ┌─ Shipment Detail ────────────────────────────────────────────────┐
  │  GET /shipments/{id} → API-GetShipmentDetail flow                │
  │  Shows: full shipment data, vehicles, parties, charges           │
  │                                                                   │
  │  Actions available:                                               │
  │  ├─ Edit fields → POST /shipments/{id} (UpdateShipment)          │
  │  ├─ Send email → POST /shipments/{id}/send_email (SendEmail)     │
  │  ├─ View thread → GET /shipments/{id}/emails (GetEmailThread)    │
  │  └─ Generate CSV → POST /shipments/{id}/generate_csv (GenerateCSV)│
  └──────────────────────────────────────────────────────────────────┘
```

---

## Data Model

```
  fgj_wwo_bookings ─── (BL number match) ──→ fgj_shipment (CENTRAL)
                                                    │
                              ┌──────────┬──────────┼──────────┬──────────┐
                              │          │          │          │          │
                              ▼          ▼          ▼          ▼          │
                        fgj_vehicle  fgj_ship-  fgj_ship-  fgj_ship-    │
                        (via text    ment-      ment-      ment-        │
                         GUID)      parties    charge     email        │
                                   (lookup)   (lookup)   (lookup)      │
                                                  │                     │
  fgj_rate ──────────────────────────────────────(route match)          │
     │                                                                   │
     ▼                                                                   │
  fgj_charge (lookup to rate)                                           │
```

### Key Relationships
- **fgj_vehicle** → shipment via `fgj_shipmentid` text field (NOT a formal lookup)
- **fgj_shipmentcharge, fgj_shipmentemail, fgj_shipmentparties** → shipment via Dataverse lookup
- **fgj_charge** → rate via Dataverse lookup
- **fgj_wwo_bookings** → shipment via BL number string match (no formal relationship)

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16.1.4, React 19, TypeScript, Tailwind CSS v4, shadcn/ui |
| Frontend hosting | Azure App Service (Linux, Node 22, Basic B1) |
| Authentication | Microsoft Entra ID (Easy Auth, multi-tenant) |
| API layer | Power Automate HTTP-triggered flows (x-api-key auth) |
| AI processing | AI Builder custom prompts (4 prompts, GPT-4.1) |
| Data extraction | Office Scripts (3 scripts running in Excel Online) |
| Data store | Microsoft Dataverse (8 tables, 5 global option sets) |
| File storage | OneDrive for Business (SI files, CSV output, XLSX output, rate worksheets) |
| Email | Office 365 Outlook (send/receive via Power Automate) |
| CI/CD | GitHub Actions → Azure App Service |
| Solution management | Power Platform Solution "WalWil Shipping" v1.0.0.1 |

## Frontend Architecture

```
  Next.js App (App Router)
  │
  ├─ src/app/shipments/
  │    ├─ page.tsx (shipment list)
  │    ├─ [id]/page.tsx (shipment detail)
  │    └─ actions/shipments.ts ('use server' - server actions)
  │
  ├─ src/lib/api.ts (API client, env var config, mock data fallback)
  │
  ├─ src/types/shipment.ts (TypeScript interfaces)
  │
  ├─ .env.local (active config - copy from .env.prod or .env.test)
  ├─ .env.prod (production Power Automate URLs)
  └─ .env.test (test Power Automate URLs)
```

### API Flow (Frontend → Backend)

```
  Browser → Next.js Server Action → api.ts fetch → Power Automate HTTP flow → Dataverse
```

All API calls go through server actions (`'use server'`), keeping Power Automate URLs and API keys server-side only.

---

## Connectors & External Dependencies

| Connector | Used By | Purpose |
|-----------|---------|---------|
| Microsoft Dataverse | All 9 flows | Read/write shipment data |
| Office 365 Outlook | SI Email Processor, Monitor Replies, SendEmail | Email triggers + sending |
| OneDrive for Business | SI Email Processor, WWO Parser, GenerateCSV | File storage + triggers |
| Excel Online (Business) | SI Email Processor, WWO Parser | Run Office Scripts |
| AI Builder | SI Email Processor (x2), Monitor Replies, WWO Parser | Custom prompt AI extraction (4 prompts) |

---

## Component Requirements Overview

Everything WalWil needs for the solution to function:

### Microsoft 365 / Power Platform Licenses

| Component | License Requirement | Purpose |
|-----------|-------------------|---------|
| Power Automate | Premium (per user or per flow) | Cloud flows with premium connectors (Dataverse, AI Builder) |
| AI Builder | AI Builder credits (included with some Power Automate Premium, or add-on) | GPT-4.1 custom prompts for document parsing |
| Microsoft Dataverse | Included with Power Apps/Automate Premium | Structured data storage (8 tables) |
| OneDrive for Business | Microsoft 365 Business | File storage for SI attachments, CSV, XLSX, rate worksheets |
| Office 365 Outlook | Microsoft 365 Business | Email trigger + send (SI processing, replies) |
| Excel Online (Business) | Microsoft 365 Business | Run Office Scripts on Excel files |

### Azure Services

| Component | SKU / Tier | Purpose |
|-----------|-----------|---------|
| Azure App Service | Linux, Node 22, Basic B1 | Host Next.js frontend (standalone mode) |
| Microsoft Entra ID | Free tier (Easy Auth) | User authentication (multi-tenant SSO) |

### Power Automate Flows (9 total)

| Flow | Trigger | AI Calls | Description |
|------|---------|----------|-------------|
| SI Email Processor | New email with attachment | 2 (Extract SI Data + Extract Vehicles) | Main inbound flow — parse SI, create shipment+vehicles+parties+charges |
| SI Monitor Replies | Reply email (RE: subject) | 1 (Extract Reply Data) | Update shipment from customer reply (weights, missing fields) |
| WWO Worksheet Parser | OneDrive file modified | 1 (Structure WWO Rates) | Import rates+charges+bookings from WWO Excel worksheets |
| API-GetShipments | HTTP GET | 0 | List all shipments for frontend |
| API-GetShipmentDetail | HTTP GET | 0 | Full shipment detail (vehicles, parties, charges) |
| API-GetEmailThread | HTTP GET | 0 | Email thread history for a shipment |
| API-SendEmail | HTTP POST | 0 | Send/reply email, log outbound |
| API-UpdateShipment | HTTP POST | 0 | Update shipment, vehicles, parties from frontend |
| API-GenerateCSV | HTTP POST | 0 | Build CSV from shipment data, return download link |

### AI Builder Prompts (4 total)

| Prompt | Model | Used By | Input | Output |
|--------|-------|---------|-------|--------|
| Extract SI Data | GPT-4.1 | SI Email Processor | subject, filename, documentContent | JSON: header, parties, validation (no vehicles) |
| Extract Vehicles | GPT-4.1 | SI Email Processor | documentContent | Pipe-delimited lines: `VIN\|Model\|WeightKG\|CBM\|HSCode` |
| Extract Reply Data | GPT-4.1 | SI Monitor Replies | missingFields, vehiclesMissingWeight, emailContent | JSON: extracted weights + fields from reply |
| Structure WWO Rates | GPT-4.1 | WWO Worksheet Parser | rawData | JSON: rates array with charges per route |

### Office Scripts (3 total)

| Script | Used By | Input | Output |
|--------|---------|-------|--------|
| BMW-Script | SI Email Processor | Excel SI attachment | ParseResult: si (header), vinlist (rows), shipperTable |
| WW Excel Generator | SI Email Processor | Shipment data JSON | Populated XLSX with 5 sheets |
| WWO Worksheet Parser | WWO Worksheet Parser flow | WWO Excel workbook | Bookings array + raw rate sheet data |

### Dataverse Tables (8 total)

| Table | Role | Key Fields |
|-------|------|------------|
| fgj_shipment | Central record | blnumber, vessel, manufacturer, status, polcode, podcode |
| fgj_vehicle | Vehicle line items | vin, model, weightkg, cbm, hscode |
| fgj_shipmentparties | Shipper/Consignee/Notify | partytype, name1, address1, city, country |
| fgj_shipmentcharge | Freight charges | chargecode, amount, rate, quantity, currency |
| fgj_shipmentemail | Email thread log | subject, body, direction, messageid |
| fgj_rate | Rate definitions | manufacturer, routecode, routename |
| fgj_charge | Rate charge lines | chargecode, rateamount, currency, freightterms |
| fgj_wwo_bookings | WWO booking data | blnumber, bookingnumber, vessel, customer |

### Global Option Sets (5)

| Option Set | Values |
|-----------|--------|
| fgj_currency | USD, EUR |
| fgj_freightterms | PREPAID, COLLECT |
| fgj_manufacturer | BMW, ROLLS_ROYCE |
| fgj_outboundinbound | Outbound, Inbound |
| fgj_partytype | SHIP, CONS, NOT |

### Frontend (Next.js)

| Component | Details |
|-----------|---------|
| Framework | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS v4, shadcn/ui |
| Output mode | Standalone (for Azure App Service) |
| Auth | Microsoft Entra ID (Easy Auth) |
| API pattern | Server Actions → Power Automate HTTP flows |
| CI/CD | GitHub Actions → Azure App Service |
| Repository | GitHub: FgjReodor/walwil-frontoffice |

### OneDrive Folder Structure

```
OneDrive for Business/
├── WalWil-Test/              (Production — legacy name)
│   ├── SI-Attachments/       Saved SI Excel files
│   ├── Finished CSV/         Generated CSV output
│   ├── Finished XLSX/        Generated XLSX output
│   └── XLSX Template/        Template for WW Excel Generator
├── WalWil-Dev/               (Test environment)
│   ├── SI-Attachments/
│   ├── Finished CSV/
│   ├── Finished XLSX/
│   └── XLSX Template/
└── WWO-Worksheets/           Rate worksheets (triggers WWO Parser)
```
