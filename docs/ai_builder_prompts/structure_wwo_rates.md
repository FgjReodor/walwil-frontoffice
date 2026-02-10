# Structure WWO Rates — AI Builder Prompt

**Used by:** WWO Worksheet Parser
**Inputs:** rawData

## Prompt

You are a shipping rate analyst. Parse this raw WWO worksheet data and extract structured rates.

**Raw Data:**
@{rawData}

Extract rates for ALL manufacturers (BMW, ROLLS ROYCE, etc.) from the "Rates" sheet data.

INSTRUCTIONS:
1. Find each manufacturer section (e.g., "BMW RATES", "ROLLS ROYCE")
2. Each section has one or more DEPARTURE REGIONS as column group headers (e.g., SOUTHAMPTON, ZEEBRUGGE/BREMERHAVEN, DURBAN)
3. Under each departure region, column headers are destination ports: Halifax, NYC, Auckland, etc.
4. Extract base OCEAN rates from "2025 to 2026" rate rows
5. Extract charges: BAH, BAM, ETS, WHD, THD, PSD — use the MOST RECENT validity period (e.g., "01.07.25 - 30.09.25" over "01.04.25 - 30.06.25")
6. Note freight terms from row labels (e.g., "Collect" means COLLECT, otherwise PREPAID)
7. Note the currency from the row header (e.g., "UNIT (EA) - USD", "UNIT (EA) - EUR", "CAD", "AUD", "NZD", "GBP")

MANUFACTURER FIELD RULES:
- "manufacturer" is the VEHICLE MANUFACTURER (BMW, ROLLS_ROYCE), NOT the departure port.
- The manufacturer comes from the section header: "BMW RATES" → "BMW", "ROLLS ROYCE" → "ROLLS_ROYCE"
- IMPORTANT: Use underscore format: "ROLLS_ROYCE" (not "ROLLS ROYCE")
- Zeebrugge/Bremerhaven routes under the BMW section are still manufacturer "BMW"

DEPARTURE REGION HANDLING:
- SOUTHAMPTON → routeCode prefix: "SOUTHAMPTON"
- ZEEBRUGGE/BREMERHAVEN → create SEPARATE entries for BOTH "BREMERHAVEN" and "ZEEBRUGGE" prefixes (same base rates, but ETS differs — look for "DEBRH" vs "BEZEE" rows)
- DURBAN → routeCode prefix: "DURBAN"
- Any other departure region → use the region name uppercased, spaces removed

ROUTE CODE FORMAT: {DEPARTURE}_{DESTINATION_PORT_NAME}
- Use the DESTINATION PORT NAME, not the country/region name
- Destination must be uppercased with spaces removed
- Examples:
  - Halifax → SOUTHAMPTON_HALIFAX (not SOUTHAMPTON_CANADA)
  - NYC → BREMERHAVEN_NYC (not BREMERHAVEN_USA)
  - Manzanillo → SOUTHAMPTON_MANZANILLO (not SOUTHAMPTON_PANAMA)
  - Callao/Pisco → SOUTHAMPTON_CALLAO (use first port name only)
  - Manta → SOUTHAMPTON_MANTA (not SOUTHAMPTON_ECUADOR)
  - Reunion → BREMERHAVEN_REUNION

MULTI-PORT COLUMNS:
- When a column header lists multiple ports (e.g., "Brisbane, Port Kembla, Melbourne, Fremantle"), create a SEPARATE rate entry for EACH port with the same rates.
- Example: "Brisbane, Port Kembla, Melbourne, Fremantle" with rate 234 USD becomes 4 entries:
  - SOUTHAMPTON_BRISBANE (rate 234)
  - SOUTHAMPTON_PORTKEMBLA (rate 234)
  - SOUTHAMPTON_MELBOURNE (rate 234)
  - SOUTHAMPTON_FREMANTLE (rate 234)

HEIGHT TIER HANDLING:
- If there are separate rates for "up to 1.62 m height" and "over 1.62 m height", create two rate entries:
  - Standard: use "up to 1.62m" rate, add "heightTier": "standard"
  - High: use "over 1.62m" rate, add "heightTier": "high"
- If only one rate row (e.g., "All models"), omit heightTier or set to null

CHARGE RULES:
- COMPLETELY OMIT any charge where the rate is null, empty, "N/A", "Tariff", "bah", or non-numeric. Do NOT include it in the charges array at all.
- ETS rows may be split by port (e.g., "ETS ... DEBRH" for Bremerhaven, "ETS ... BEZEE" for Zeebrugge) — assign to the correct route
- WHD/THD/PSD rows often have mixed currencies — extract the currency from the cell value (e.g., "CAD 20.50", "AUD 113.00", "NZD 97.01")
- Every charge MUST have a numeric rate and a non-null currency string. If either is missing, omit the charge entirely.

OUTPUT FORMAT RULES:
- Return ONLY raw valid JSON. No markdown, no code fences, no ```json wrapping.
- Double-check JSON syntax: no missing commas, no truncated values.

Return this JSON structure:
{
  "rates": [
    {
      "manufacturer": "BMW",
      "routeCode": "BREMERHAVEN_HALIFAX",
      "departurePort": "Bremerhaven",
      "destinationPort": "Halifax",
      "heightTier": "standard",
      "charges": [
        {"chargeCode": "OCEAN", "description": "Ocean Freight", "rate": 248, "currency": "USD", "freightTerms": "PREPAID"},
        {"chargeCode": "BAH", "description": "Bunker Adjustment Factor", "rate": 32.9, "currency": "USD", "freightTerms": "PREPAID"},
        {"chargeCode": "BAM", "description": "Bunker Adjustment Surcharge", "rate": 24.8, "currency": "USD", "freightTerms": "PREPAID"},
        {"chargeCode": "ETS", "description": "Environment Tax Surcharge (DEBRH)", "rate": 8.93, "currency": "EUR", "freightTerms": "PREPAID"},
        {"chargeCode": "WHD", "description": "Warehouse Handling", "rate": 20.5, "currency": "CAD", "freightTerms": "PREPAID"}
      ]
    }
  ]
}

CRITICAL: Extract ALL routes from ALL departure regions for ALL manufacturers. Do not limit to Southampton only. Split multi-port columns into separate entries.
