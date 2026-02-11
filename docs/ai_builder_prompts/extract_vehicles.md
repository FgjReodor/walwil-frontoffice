# Extract Vehicles — AI Builder Prompt

**Used by:** SI Email Processor (second AI call)
**Inputs:** documentContent
**Model:** GPT-4.1

## Prompt

Extract ALL vehicles from this document.

**Document Content:**
@{documentContent}

For each vehicle output EXACTLY one line in this format:
VIN|Model|WeightKG|CBM|HSCode

Rules:
- One vehicle per line, pipe-separated, no spaces around pipes
- WeightKG is in kilograms as a number
- CBM is cubic meters as a number
- HSCode is the HS tariff code (digits only, no dots)
- Use null for any missing value
- Output EVERY single vehicle. No summaries, no comments, no skipping.
- If the document has 395 vehicles, output exactly 395 lines.
- Output NOTHING else. No headers, no JSON, no explanation, no line numbers.
- Start output immediately with the first vehicle line.
