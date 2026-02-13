/**
 * WW Excel Generator
 * Used by: SI Email Processor
 * Purpose: Populates XLSX template with parsed shipment data (5 sheets)
 * Input: shipmentData (JSON string)
 */
function main(workbook: ExcelScript.Workbook, shipmentData: string): string {
    try {
        // Define interfaces for type safety
        interface VehicleData {
            vin?: string;
            make?: string;
            model?: string;
            year?: string;
            vehicle_type?: string;
            color?: string;
            weight_kg?: string | number;
            cbm?: string | number;
            length_m?: string | number;
            width_m?: string | number;
            height_m?: string | number;
            hs_code?: string;
            customer_reference?: string;
            ecn_crn_number?: string;
            country_of_origin?: string;
            hazardous?: string | boolean;
            afv?: string | boolean;
        }

        interface ChargeData {
            fgj_chargecode?: string;
            fgj_description?: string;
            fgj_currency?: string;
            fgj_rateamount?: string | number;
            fgj_freightterms?: string;
            charge_type?: string;
            description?: string;
            currency?: string;
            amount?: string | number;
            quantity?: string | number;
        }

        interface ShipmentData {
            bl_number?: string;
            booking_number?: string;
            vessel?: string;
            voyage?: string;
            partner?: string;
            port_of_loading?: string;
            pol_code?: string;
            pol_berth?: string;
            port_of_destination?: string;
            pod_code?: string;
            pod_berth?: string;
            por?: string;
            pfd?: string;
            departure_from?: string;
            reference?: string;
            bl_type?: string;
            place_of_issue?: string;
            on_board_date?: string;
            issue_date?: string;
            ets?: string;
            eta?: string;
            received_date?: string;
            sender_email?: string;
            shipper_party_no?: string;
            shipper_name1?: string;
            shipper_name2?: string;
            shipper_address1?: string;
            shipper_address2?: string;
            shipper_address3?: string;
            shipper_city?: string;
            shipper_state?: string;
            shipper_postalcode?: string;
            shipper_country?: string;
            shipper_contact?: string;
            shipper_email?: string;
            consignee_name1?: string;
            consignee_name2?: string;
            consignee_address1?: string;
            consignee_address2?: string;
            consignee_address3?: string;
            consignee_city?: string;
            consignee_state?: string;
            consignee_postalcode?: string;
            consignee_country?: string;
            notify_name1?: string;
            notify_name2?: string;
            notify_address1?: string;
            notify_address2?: string;
            notify_address3?: string;
            notify_city?: string;
            notify_state?: string;
            notify_postalcode?: string;
            notify_country?: string;
            notify_contact?: string;
            forwarder_party_no?: string;
            forwarder_name?: string;
            vehicles?: VehicleData[];
            charges?: ChargeData[];
        }

        const data: ShipmentData = JSON.parse(shipmentData);

        const combineAddress = (addr1?: string, addr2?: string, addr3?: string): string => {
            return [addr1, addr2, addr3].filter(a => a && a.trim()).join(", ");
        };

        const combineName = (name1?: string, name2?: string): string => {
            return [name1, name2].filter(n => n && n.trim()).join(" ");
        };

        const sheets = workbook.getWorksheets();
        for (let i = sheets.length - 1; i > 0; i--) {
            sheets[i].delete();
        }

        const mainSheet = sheets[0];
        mainSheet.setName("Main Document");
        const partiesSheet = workbook.addWorksheet("Parties");
        const cargoSheet = workbook.addWorksheet("Cargo Units");
        const ratesSheet = workbook.addWorksheet("Rates & Charges");
        const rcvSheet = workbook.addWorksheet("RCV");

        // ========== SHEET 1: Main Document ==========
        const mainData: (string | number)[][] = [
            ["Field", "Value"],
            ["BL Number", data.bl_number || ""],
            ["Booking Number", data.booking_number || ""],
            ["Vessel", data.vessel || ""],
            ["Voyage", data.voyage || ""],
            ["Partner", data.partner || ""],
            ["Port of Loading (POL)", data.port_of_loading || ""],
            ["POL Code", data.pol_code || ""],
            ["POL Berth", data.pol_berth || ""],
            ["Port of Discharge (POD)", data.port_of_destination || ""],
            ["POD Code", data.pod_code || ""],
            ["POD Berth", data.pod_berth || ""],
            ["Place of Receipt (POR)", data.por || ""],
            ["Place of Delivery (PFD)", data.pfd || ""],
            ["Reference", data.reference || ""],
            ["B/L Type", data.bl_type || ""],
            ["Place of Issue", data.place_of_issue || ""],
            ["On Board Date", data.on_board_date || ""],
            ["Issue Date", data.issue_date || ""],
            ["ETS", data.ets || ""],
            ["ETA", data.eta || ""],
            ["Total Units", data.vehicles?.length || 0],
            ["Received Date", data.received_date || ""],
            ["Sender Email", data.sender_email || ""]
        ];
        mainSheet.getRange("A1:B" + mainData.length).setValues(mainData);
        formatAsTable(mainSheet, "A1:B" + mainData.length, "MainDocTable");
        mainSheet.getRange("A:A").getFormat().setColumnWidth(200);
        mainSheet.getRange("B:B").getFormat().setColumnWidth(250);

        // ========== SHEET 2: Parties ==========
        const partiesHeaders: string[] = [
            "Party Type", "Party No", "Name 1", "Name 2",
            "Address 1", "Address 2", "Address 3",
            "City", "State", "Postal Code", "Country",
            "Contact", "Email"
        ];
        const partiesData: (string | number)[][] = [
            partiesHeaders,
            ["SHIP", data.shipper_party_no || "", data.shipper_name1 || "", data.shipper_name2 || "",
                data.shipper_address1 || "", data.shipper_address2 || "", data.shipper_address3 || "",
                data.shipper_city || "", data.shipper_state || "", data.shipper_postalcode || "",
                data.shipper_country || "", data.shipper_contact || "", data.shipper_email || ""],
            ["CONS", "", data.consignee_name1 || "", data.consignee_name2 || "",
                data.consignee_address1 || "", data.consignee_address2 || "", data.consignee_address3 || "",
                data.consignee_city || "", data.consignee_state || "", data.consignee_postalcode || "",
                data.consignee_country || "", "", ""],
            ["NOT", "", data.notify_name1 || "", data.notify_name2 || "",
                data.notify_address1 || "", data.notify_address2 || "", data.notify_address3 || "",
                data.notify_city || "", data.notify_state || "", data.notify_postalcode || "",
                data.notify_country || "", data.notify_contact || "", ""],
            ["Forwarder", data.forwarder_party_no || "", data.forwarder_name || "", "",
                "", "", "", "", "", "", "", "", ""]
        ];
        partiesSheet.getRange("A1:M" + partiesData.length).setValues(partiesData);
        formatAsTable(partiesSheet, "A1:M" + partiesData.length, "PartiesTable");
        partiesSheet.getRange("A:M").getFormat().setColumnWidth(100);

        // ========== SHEET 3: Cargo Units ==========
        const cargoHeaders: string[] = [
            "VIN", "Make", "Model", "Year", "Vehicle Type", "Color",
            "Weight (kg)", "CBM", "Length (m)", "Width (m)", "Height (m)",
            "HS Code", "Customer Reference", "ECN/CRN", "Country of Origin",
            "Hazardous", "AFV", "Status"
        ];
        const cargoData: (string | number)[][] = [cargoHeaders];

        if (data.vehicles && Array.isArray(data.vehicles)) {
            for (const v of data.vehicles) {
                cargoData.push([
                    v.vin || "",
                    v.make || "",
                    v.model || "",
                    v.year || "",
                    v.vehicle_type || "",
                    v.color || "",
                    v.weight_kg || "",
                    v.cbm || "",
                    v.length_m || "",
                    v.width_m || "",
                    v.height_m || "",
                    v.hs_code || "",
                    v.customer_reference || "",
                    v.ecn_crn_number || "",
                    v.country_of_origin || "",
                    v.hazardous || "N",
                    v.afv || "N",
                    "NEW"
                ]);
            }
        }
        cargoSheet.getRange("A1:R" + cargoData.length).setValues(cargoData);
        formatAsTable(cargoSheet, "A1:R" + cargoData.length, "CargoTable");
        cargoSheet.getRange("A:A").getFormat().setColumnWidth(180);

        // ========== SHEET 4: Rates & Charges ==========
        const ratesHeaders: string[] = ["Charge Code", "Description", "Currency", "Rate", "Quantity", "Amount", "Freight Terms"];
        const ratesData: (string | number)[][] = [ratesHeaders];
        let grandTotal: number = 0;

        if (data.charges && Array.isArray(data.charges)) {
            for (const c of data.charges) {
                const rate: number = parseFloat(String(c.fgj_rateamount || c.amount || 0));
                const qty: number = parseInt(String(c.quantity || 1));
                const amount: number = rate * qty;
                grandTotal += amount;
                ratesData.push([
                    c.fgj_chargecode || c.charge_type || "",
                    c.fgj_description || c.description || "",
                    c.fgj_currency || c.currency || "USD",
                    rate,
                    qty,
                    amount,
                    c.fgj_freightterms || ""
                ]);
            }
        }
        ratesData.push(["", "", "", "", "TOTAL:", grandTotal, ""]);
        ratesSheet.getRange("A1:G" + ratesData.length).setValues(ratesData);
        formatAsTable(ratesSheet, "A1:G" + (ratesData.length - 1), "RatesTable");
        ratesSheet.getRange("F" + ratesData.length).getFormat().getFont().setBold(true);

        // ========== SHEET 5: RCV (SAGA Format) ==========
        const rcvHeaders: string[] = [
            "Partner", "Voyage Number", "Vessel Name", "Booking Number", "POR", "POL", "POL Berth",
            "POD", "POD Berth", "PFD", "Shipper Party No", "Shipper Party Name", "Forwarder Party No",
            "Forwarder Party Name", "Cargo Id", "Commodity Class", "Commodity Type", "Commodity Description",
            "Commodity Code", "Make", "Model", "Year", "Quantity", "Length", "Width", "Height", "Weight",
            "Customer Reference Number", "ECN/CRN Number", "Status", "Status Date", "Status Port",
            "Hazardous Flag", "Waitlisted Flag", "Comment", "AFV", "CountryofOrigin", "Nuf", "HS6"
        ];
        const rcvData: (string | number)[][] = [rcvHeaders];

        const today: string = new Date().toISOString().split('T')[0];
        const shipperFullName: string = combineName(data.shipper_name1, data.shipper_name2);

        if (data.vehicles && Array.isArray(data.vehicles)) {
            for (const v of data.vehicles) {
                const hsCode: string = v.hs_code || "";
                rcvData.push([
                    data.partner || "",
                    data.voyage || "",
                    data.vessel || "",
                    data.booking_number || data.bl_number || "",
                    data.por || "",
                    data.port_of_loading || "",
                    data.pol_berth || "",
                    data.port_of_destination || "",
                    data.pod_berth || "",
                    data.pfd || "",
                    data.shipper_party_no || "",
                    shipperFullName,
                    data.forwarder_party_no || "",
                    data.forwarder_name || "",
                    v.vin || "",
                    "AUTO",
                    v.vehicle_type || "CAR",
                    ((v.make || "") + " " + (v.model || "")).trim(),
                    hsCode,
                    v.make || "",
                    v.model || "",
                    v.year || "",
                    1,
                    v.length_m || "",
                    v.width_m || "",
                    v.height_m || "",
                    v.weight_kg || "",
                    v.customer_reference || "",
                    v.ecn_crn_number || "",
                    "NEW",
                    today,
                    data.port_of_loading || "",
                    v.hazardous || "N",
                    "N",
                    "",
                    v.afv || "N",
                    v.country_of_origin || "",
                    "",
                    hsCode.substring(0, 6)
                ]);
            }
        }
        rcvSheet.getRange("A1:AM" + rcvData.length).setValues(rcvData);
        formatAsTable(rcvSheet, "A1:AM" + rcvData.length, "RCVTable");

        mainSheet.activate();

        return JSON.stringify({ success: true, sheets: 5, vehicles: data.vehicles?.length || 0 });

    } catch (error) {
        return JSON.stringify({ success: false, error: String(error) });
    }
}

function formatAsTable(sheet: ExcelScript.Worksheet, range: string, tableName: string): void {
    const tableRange: ExcelScript.Range = sheet.getRange(range);
    const table: ExcelScript.Table = sheet.addTable(tableRange, true);
    table.setName(tableName);
    table.setPredefinedTableStyle("TableStyleMedium2");
    tableRange.getFormat().autofitColumns();
}
