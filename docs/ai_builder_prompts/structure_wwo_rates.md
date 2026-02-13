# Structure WWO Rates — AI Builder Prompt

**Used by:** WWO Worksheet Parser
**Inputs:** rawData

## Prompt

You are a shipping rate analyst. Parse this raw WWO worksheet data and extract structured rates with UN/LOCODE port codes.

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

PORT CODE MAPPING — UN/LOCODE format (2-letter country + 3-letter port):

Departure regions → polCode:
- SOUTHAMPTON → "GBSOU"
- BREMERHAVEN → "DEBRH"
- ZEEBRUGGE → "BEZEE"
- DURBAN → "ZADUR"

Destination ports → podCode:
- Halifax → "CAHAL"
- NYC / New York → "USNYC"
- Manzanillo → "PAMIT"
- Callao / Pisco → "PEPIO"
- Manta → "ECMEC"
- Brisbane → "AUBNE"
- Port Kembla → "AUPKL"
- Melbourne → "AUMEL"
- Fremantle → "AUFRE"
- Auckland → "NZAKL"
- Reunion → "RERUN"

If a port name is NOT in the list above, construct the UN/LOCODE: 2-letter ISO country code + first 3 letters of port name, uppercased (e.g., Yokohama Japan → "JPYOK").

DEPARTURE REGION HANDLING:
- ZEEBRUGGE/BREMERHAVEN → create SEPARATE entries for BOTH polCode "DEBRH" and polCode "BEZEE" (same base OCEAN/BAH/BAM rates, but ETS differs — look for "DEBRH" vs "BEZEE" rows)
- Each other departure maps directly to its polCode above.

MULTI-PORT COLUMNS:
- When a column header lists multiple ports (e.g., "Brisbane, Port Kembla, Melbourne, Fremantle"), create a SEPARATE rate entry for EACH port with the same rates.
- Example: "Brisbane, Port Kembla, Melbourne, Fremantle" with rate 234 USD becomes 4 entries with podCodes: AUBNE, AUPKL, AUMEL, AUFRE — all with the same rates.

HEIGHT TIER HANDLING:
- If there are separate rates for "up to 1.62 m height" and "over 1.62 m height", create TWO rate entries:
  - "standard": use the "up to 1.62m" / "<1.62m" rate, set "heightTier": "standard"
  - "high": use the "over 1.62m" / ">1.62m" rate, set "heightTier": "high"
- If only one rate row (e.g., "All models"), set "heightTier": null
- IMPORTANT: Height tier applies to the ENTIRE rate entry including ALL its charges. Both height tiers get the SAME charges (BAH, BAM, ETS, etc.) — only the OCEAN base rate differs.

CHARGE RULES:
- COMPLETELY OMIT any charge where the rate is null, empty, "N/A", "Tariff", "bah", or non-numeric. Do NOT include it in the charges array at all.
- ETS rows may be split by port (e.g., "ETS ... DEBRH" for Bremerhaven, "ETS ... BEZEE" for Zeebrugge) — assign the correct ETS rate to the matching polCode entry.
- WHD/THD/PSD rows often have mixed currencies — extract the currency from the cell value (e.g., "CAD 20.50", "AUD 113.00", "NZD 97.01")
- Every charge MUST have a numeric rate and a non-null currency string. If either is missing, omit the charge entirely.

OUTPUT FORMAT RULES:
- Return ONLY raw valid JSON. No markdown, no code fences, no ```json wrapping.
- Double-check JSON syntax: no missing commas, no truncated values.

Return this JSON structure (example — actual data will vary):
{
  "rates": [
    {
      "manufacturer": "BMW",
      "polCode": "DEBRH",
      "podCode": "CAHAL",
      "heightTier": "standard",
      "charges": [
        {"chargeCode": "OCEAN", "description": "Ocean Freight", "rate": 248, "currency": "USD", "freightTerms": "PREPAID"},
        {"chargeCode": "BAH", "description": "Bunker Adjustment Factor", "rate": 30.52, "currency": "USD", "freightTerms": "PREPAID"},
        {"chargeCode": "ETS", "description": "EU Emissions Trading", "rate": 11.95, "currency": "USD", "freightTerms": "PREPAID"},
        {"chargeCode": "WHD", "description": "Wharfage Destination", "rate": 20.5, "currency": "CAD", "freightTerms": "PREPAID"}
      ]
    }
  ]
}

CRITICAL - COMPLETENESS:
- Extract ALL routes from ALL departure regions for ALL manufacturers found in the data.
- Every unique combination of (manufacturer, departure region, destination port, height tier) = one rate entry.
- For height tiers: if a departure+destination has both "standard" and "high" rates, output BOTH entries.
- Split multi-port columns into separate entries (one per port).
- Do NOT stop early. Do NOT truncate. Do NOT summarize.
- Output EVERY SINGLE rate entry. No shortcuts, no omissions.
- If any departure region, destination port, or manufacturer appears in the data that is not listed in the mapping above, still include it — construct the best UN/LOCODE you can.
