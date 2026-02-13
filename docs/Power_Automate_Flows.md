# Power Automate Flows - Technical Reference

**Last Updated:** January 26, 2026

This document contains the raw Power Automate flow definitions for the WalWil Shipping Automation system.

---

## Flow 1: SI Monitor Replies (Check Shipment Found)

Monitors incoming email replies and updates shipment records with extracted data.

**Trigger:** New email with "RE:" in subject

### Flow Definition

```json
{
  "type": "OpenApiConnectionNotification",
  "inputs": {
    "parameters": {
      "includeAttachments": true,
      "subjectFilter": "RE:",
      "folderPath": "Id::AAMkADA0OGYxOGRlLWJiM2UtNDU5NC05ZjhkLWQ5Y2IzNTA5YmJhMgAuAAAAAAARAcYyT_6sQpnHcdRl7nqQAQBzMbDQGpDZQbvj05CU3M5lAAAAAAEMAAA="
    },
    "host": {
      "apiId": "/providers/Microsoft.PowerApps/apis/shared_office365",
      "connection": "shared_office365",
      "operationId": "OnNewEmailV3"
    }
  },
  "splitOn": "@triggerOutputs()?['body/value']",
  "metadata": {
    "Id::AAMkADA0OGYxOGRlLWJiM2UtNDU5NC05ZjhkLWQ5Y2IzNTA5YmJhMgAuAAAAAAARAcYyT_6sQpnHcdRl7nqQAQBzMbDQGpDZQbvj05CU3M5lAAAAAAEMAAA=": "Innboks",
    "operationMetadataId": "f816a03f-17dd-4d63-890b-4552aa80cde2"
  }
}
```

### Variable Initializations

```json
{
  "type": "InitializeVariable",
  "inputs": {
    "variables": [
      {
        "name": "var_departurefrom",
        "type": "string"
      }
    ]
  },
  "runAfter": {},
  "metadata": {
    "operationMetadataId": "f98ede5b-e88e-4921-9928-847d0ccbb96d"
  }
}

{
  "type": "InitializeVariable",
  "inputs": {
    "variables": [
      {
        "name": "var_portofdestination",
        "type": "string"
      }
    ]
  },
  "runAfter": {
    "POL": [
      "Succeeded"
    ]
  },
  "metadata": {
    "operationMetadataId": "d0e5d419-1a7b-48eb-8833-7bfb0a563fbf"
  }
}

{
  "type": "InitializeVariable",
  "inputs": {
    "variables": [
      {
        "name": "var_vesselvoyage",
        "type": "string"
      }
    ]
  },
  "runAfter": {
    "POD": [
      "Succeeded"
    ]
  },
  "metadata": {
    "operationMetadataId": "47e9b8ab-72d5-4ac9-81c2-be306dfa5220"
  }
}

{
  "type": "InitializeVariable",
  "inputs": {
    "variables": [
      {
        "name": "var_ets",
        "type": "string"
      }
    ]
  },
  "runAfter": {
    "VesselVoyage": [
      "Succeeded"
    ]
  },
  "metadata": {
    "operationMetadataId": "c6e37c89-e359-4471-800f-221b378ff76b"
  }
}

{
  "type": "InitializeVariable",
  "inputs": {
    "variables": [
      {
        "name": "var_reference",
        "type": "string"
      }
    ]
  },
  "runAfter": {
    "ETS": [
      "Succeeded"
    ]
  },
  "metadata": {
    "operationMetadataId": "306f6183-2095-4542-81e9-98228afe1867"
  }
}

{
  "type": "InitializeVariable",
  "inputs": {
    "variables": [
      {
        "name": "var_shipperinfo",
        "type": "string"
      }
    ]
  },
  "runAfter": {
    "Reference": [
      "Succeeded"
    ]
  },
  "metadata": {
    "operationMetadataId": "4544bc9b-8d5c-4d91-805e-06bdf238ce57"
  }
}

{
  "type": "InitializeVariable",
  "inputs": {
    "variables": [
      {
        "name": "var_consigneeinfo",
        "type": "string"
      }
    ]
  },
  "runAfter": {
    "Shipper_Info": [
      "Succeeded"
    ]
  },
  "metadata": {
    "operationMetadataId": "35661bc0-946f-4729-b45a-9d0cb6f25112"
  }
}

{
  "type": "InitializeVariable",
  "inputs": {
    "variables": [
      {
        "name": "var_notifyinfo",
        "type": "string"
      }
    ]
  },
  "runAfter": {
    "Consignee_Info": [
      "Succeeded"
    ]
  },
  "metadata": {
    "operationMetadataId": "df83b5ec-4408-42c6-b868-a8a15770902b"
  }
}
```

### Find Shipment

```json
{
  "type": "OpenApiConnection",
  "inputs": {
    "parameters": {
      "entityName": "fgj_shipments",
      "$filter": "fgj_conversationid eq '@{triggerOutputs()?['body/conversationId']}'"
    },
    "host": {
      "apiId": "/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps",
      "connection": "shared_commondataserviceforapps",
      "operationId": "ListRecords"
    }
  },
  "runAfter": {
    "Notify_Info": [
      "Succeeded"
    ]
  },
  "metadata": {
    "operationMetadataId": "f8724ad5-d54f-4b64-ba9f-acc4fb9a8ee4"
  }
}
```

### Main Condition (If Shipment Found)

```json
{
  "type": "If",
  "expression": {
    "and": [
      {
        "greater": [
          "@length(outputs('Find_Shipment')?['body/value'])",
          0
        ]
      }
    ]
  },
  "actions": {
    "Notify_Front_Office": {
      "type": "OpenApiConnection",
      "inputs": {
        "parameters": {
          "emailMessage/To": "Reodor@powerai.no",
          "emailMessage/Subject": "Reply Received for BL: @{first(outputs('Find_Shipment')?['body/value'])?['fgj_blnumber']}",
          "emailMessage/Body": "<p class=\"editor-paragraph\">A customer reply was received for a shipment.<br><br>  BL Number: @{first(outputs('Find_Shipment')?['body/value'])?['fgj_blnumber']}<br>  From: @{triggerOutputs()?['body/from']}<br>  Subject: @{triggerOutputs()?['body/subject']}<br><br>  Please review in the Front Office app.<br><br>  For the BL Number in the body, use the Expression tab and paste:<br>  first(outputs('Find_Shipment')?['body/value'])?['fgj_blnumber']</p>",
          "emailMessage/Importance": "Normal"
        },
        "host": {
          "apiId": "/providers/Microsoft.PowerApps/apis/shared_office365",
          "connection": "shared_office365",
          "operationId": "SendEmailV2"
        }
      },
      "runAfter": {
        "Update_Shipment_All_Fields": [
          "Succeeded"
        ]
      },
      "metadata": {
        "operationMetadataId": "c4a4a9f4-9c12-4477-8f71-dae08ae36d9b"
      }
    },
    "Run_a_prompt": {
      "type": "OpenApiConnection",
      "inputs": {
        "parameters": {
          "recordId": "0fee6130-3771-46a3-bb1f-c2cedd92a10d",
          "item/requestv2/emailContent": "@triggerOutputs()?['body/body']",
          "item/requestv2/vehiclesMissingWeight": "@outputs('Get_Shipment_Details')?['body/fgj_vehiclesmissingweight']",
          "item/requestv2/missingFields": "@outputs('Get_Shipment_Details')?['body/fgj_missingfields']"
        },
        "host": {
          "apiId": "providers/Microsoft.ProcessSimple/operationGroups/aibuilder",
          "connection": "shared_commondataserviceforapps",
          "operationId": "aibuilderpredict_customprompt"
        }
      },
      "runAfter": {
        "Update_Shipment_Reply_Received": [
          "Succeeded"
        ]
      },
      "metadata": {
        "operationMetadataId": "a358c81b-f362-4217-b3b8-1acecba430cf",
        "flowSystemMetadata": {
          "portalOperationApiDisplayNameOverride": "AI Builder",
          "portalOperationIconOverride": "https://content.powerapps.com/resource/makerx/static/pauto/images/designeroperations/aiBuilderNew.51dbdb6b.png",
          "portalOperationBrandColorOverride": "#0A76C4",
          "portalOperationApiTierOverride": "Standard"
        }
      }
    },
    "Parse_Extraction": {
      "type": "ParseJson",
      "inputs": {
        "content": "@outputs('Run_a_prompt')?['body/responsev2/predictionOutput/text']",
        "schema": {
          "type": "object",
          "properties": {
            "extracted_weights": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "vin": {
                    "type": "string"
                  },
                  "weight_kg": {
                    "type": "number"
                  }
                }
              }
            },
            "extracted_fields": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "column": {
                    "type": "string"
                  },
                  "value": {
                    "type": "string"
                  }
                }
              }
            },
            "confidence": {
              "type": "string"
            },
            "notes": {
              "type": "string"
            }
          }
        }
      },
      "runAfter": {
        "Run_a_prompt": [
          "Succeeded"
        ]
      },
      "metadata": {
        "operationMetadataId": "c466da66-f0d7-4eca-bb67-79eae4f18909"
      }
    },
    "Update_Vehicle_Weights": {
      "type": "Foreach",
      "foreach": "@body('Parse_Extraction')?['extracted_weights']",
      "actions": {
        "Find_Vehicle": {
          "type": "OpenApiConnection",
          "inputs": {
            "parameters": {
              "entityName": "fgj_vehicles",
              "$filter": "fgj_vin eq '@{items('Update_Vehicle_Weights')?['vin']}'"
            },
            "host": {
              "apiId": "/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps",
              "connection": "shared_commondataserviceforapps",
              "operationId": "ListRecords"
            }
          },
          "metadata": {
            "operationMetadataId": "cf42327f-0a19-4c25-8d70-23bce9f6827c"
          }
        },
        "Condition": {
          "type": "If",
          "expression": {
            "and": [
              {
                "greater": [
                  "@length(outputs('Find_Vehicle')?['body/value'])",
                  0
                ]
              }
            ]
          },
          "actions": {
            "Update_a_row": {
              "type": "OpenApiConnection",
              "inputs": {
                "parameters": {
                  "entityName": "fgj_vehicles",
                  "recordId": "@first(body('Find_Vehicle')?['value'])?['fgj_vehicleid']",
                  "item/fgj_weightkg": "@items('Update_Vehicle_Weights')?['weight_kg']"
                },
                "host": {
                  "apiId": "/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps",
                  "connection": "shared_commondataserviceforapps",
                  "operationId": "UpdateOnlyRecord"
                }
              },
              "metadata": {
                "operationMetadataId": "bd8df9a9-45e7-495b-85f0-f76c41afa144"
              }
            }
          },
          "else": {
            "actions": {}
          },
          "runAfter": {
            "Find_Vehicle": [
              "Succeeded"
            ]
          },
          "metadata": {
            "operationMetadataId": "c9a57ee9-eab4-435a-8c1e-1e96b17f5d47"
          }
        }
      },
      "runAfter": {
        "Parse_Extraction": [
          "Succeeded"
        ]
      },
      "metadata": {
        "operationMetadataId": "a210e9e3-9096-4cee-b0f0-26926206dc5f"
      }
    },
    "Update_Shipment_Reply_Received": {
      "type": "OpenApiConnection",
      "inputs": {
        "parameters": {
          "entityName": "fgj_shipments",
          "recordId": "@outputs('Get_Shipment_Details')?['body/fgj_shipmentid']",
          "item/fgj_replyreceived": true
        },
        "host": {
          "apiId": "/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps",
          "connection": "shared_commondataserviceforapps",
          "operationId": "UpdateOnlyRecord"
        }
      },
      "runAfter": {
        "Get_Shipment_Details": [
          "Succeeded"
        ]
      },
      "metadata": {
        "operationMetadataId": "fae1a4c5-2d99-4e3d-94ce-d8aa3c18a7bd"
      }
    },
    "Get_Shipment_Details": {
      "type": "OpenApiConnection",
      "inputs": {
        "parameters": {
          "entityName": "fgj_shipments",
          "recordId": "@first(body('Find_Shipment')?['value'])?['fgj_shipmentid']"
        },
        "host": {
          "apiId": "/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps",
          "connection": "shared_commondataserviceforapps",
          "operationId": "GetItem"
        }
      },
      "metadata": {
        "operationMetadataId": "4513eea9-b30b-43b9-b19a-0ddc9be9b4f1"
      }
    },
    "Get_Remaining_Missing_Weights": {
      "type": "OpenApiConnection",
      "inputs": {
        "parameters": {
          "entityName": "fgj_vehicles",
          "$filter": "fgj_shipmentid eq '@{outputs('Get_Shipment_Details')?['body/fgj_shipmentid']}' and fgj_weightkg eq null"
        },
        "host": {
          "apiId": "/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps",
          "connection": "shared_commondataserviceforapps",
          "operationId": "ListRecords"
        }
      },
      "runAfter": {
        "Update_Vehicle_Weights": [
          "Succeeded"
        ]
      },
      "metadata": {
        "operationMetadataId": "5a89f108-767e-4191-b306-384457748755"
      }
    },
    "Extract_VINs_Still_Missing": {
      "type": "Select",
      "inputs": {
        "from": "@outputs('Get_Remaining_Missing_Weights')?['body/value']",
        "select": {
          "vin": "@item()?['fgj_vin']"
        }
      },
      "runAfter": {
        "Get_Remaining_Missing_Weights": [
          "Succeeded"
        ]
      },
      "metadata": {
        "operationMetadataId": "b44c9857-f60b-439d-aace-f2f2de743e11"
      }
    },
    "Build_Missing_VINs_String": {
      "type": "Compose",
      "inputs": "@join(body('Extract_VINs_Still_Missing'), ', ')",
      "runAfter": {
        "Extract_VINs_Still_Missing": [
          "Succeeded"
        ]
      },
      "metadata": {
        "operationMetadataId": "f4cd0c92-23c4-4610-aed6-d4c86239cec8"
      }
    },
    "Update_Shipment_Missing_Data": {
      "type": "OpenApiConnection",
      "inputs": {
        "parameters": {
          "entityName": "fgj_shipments",
          "recordId": "@outputs('Get_Shipment_Details')?['body/fgj_shipmentid']",
          "item/fgj_hasmissingdata": "@if(equals(length(body('Get_Remaining_Missing_Weights')?['value']), 0), false, true)",
          "item/fgj_vehiclesmissingweight": "@outputs('Build_Missing_VINs_String')"
        },
        "host": {
          "apiId": "/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps",
          "connection": "shared_commondataserviceforapps",
          "operationId": "UpdateOnlyRecord"
        }
      },
      "runAfter": {
        "Build_Missing_VINs_String": [
          "Succeeded"
        ]
      },
      "metadata": {
        "operationMetadataId": "3c53620b-89f1-44ac-84c4-89257c7c8083"
      }
    },
    "Update_Shipment_Fields": {
      "type": "Foreach",
      "foreach": "@body('Parse_Extraction')?['extracted_fields']",
      "actions": {
        "Switch": {
          "type": "Switch",
          "expression": "@items('Update_Shipment_Fields')?['column']",
          "default": {
            "actions": {}
          },
          "cases": {
            "Case": {
              "actions": {
                "Set_variable": {
                  "type": "SetVariable",
                  "inputs": {
                    "name": "var_departurefrom",
                    "value": "@items('Update_Shipment_Fields')?['value']"
                  },
                  "metadata": {
                    "operationMetadataId": "2b3f493e-9764-4713-82bf-926f0b818041"
                  }
                }
              },
              "case": "fgj_departurefrom"
            },
            "Case 2": {
              "actions": {
                "Set_variable_1": {
                  "type": "SetVariable",
                  "inputs": {
                    "name": "var_portofdestination",
                    "value": "@items('Update_Shipment_Fields')?['value']"
                  },
                  "metadata": {
                    "operationMetadataId": "36fc3904-6b1a-44bb-afc6-fcd229d8aff7"
                  }
                }
              },
              "case": "fgj_portofdestination"
            },
            "Case 3": {
              "actions": {
                "Set_variable_2": {
                  "type": "SetVariable",
                  "inputs": {
                    "name": "var_vesselvoyage",
                    "value": "@items('Update_Shipment_Fields')?['value']"
                  },
                  "metadata": {
                    "operationMetadataId": "c3f28d3f-8ee4-433c-9b2d-43013b5c3bc3"
                  }
                }
              },
              "case": "fgj_vesselvoyage"
            },
            "Case 4": {
              "actions": {
                "Set_variable_3": {
                  "type": "SetVariable",
                  "inputs": {
                    "name": "var_ets",
                    "value": "@items('Update_Shipment_Fields')?['value']"
                  },
                  "metadata": {
                    "operationMetadataId": "9bfe5297-3d78-4789-b672-9359a6be3c83"
                  }
                }
              },
              "case": "fgj_ets"
            },
            "Case 5": {
              "actions": {
                "Set_variable_4": {
                  "type": "SetVariable",
                  "inputs": {
                    "name": "var_reference",
                    "value": "@items('Update_Shipment_Fields')?['value']"
                  },
                  "metadata": {
                    "operationMetadataId": "19f452aa-a960-4851-9749-553ab15561d5"
                  }
                }
              },
              "case": "fgj_reference"
            },
            "Case 6": {
              "actions": {
                "Set_variable_5": {
                  "type": "SetVariable",
                  "inputs": {
                    "name": "var_shipperinfo",
                    "value": "@items('Update_Shipment_Fields')?['value']"
                  },
                  "metadata": {
                    "operationMetadataId": "a919258e-9931-417f-974c-56645c89cf36"
                  }
                }
              },
              "case": "fgj_shipperinfo"
            },
            "Case 7": {
              "actions": {
                "Set_variable_6": {
                  "type": "SetVariable",
                  "inputs": {
                    "name": "var_consigneeinfo",
                    "value": "@items('Update_Shipment_Fields')?['value']"
                  },
                  "metadata": {
                    "operationMetadataId": "057d3ab2-7929-4859-803a-043b359f6427"
                  }
                }
              },
              "case": "fgj_consigneeinfo"
            },
            "Case 8": {
              "actions": {
                "Set_variable_7": {
                  "type": "SetVariable",
                  "inputs": {
                    "name": "var_notifyinfo",
                    "value": "@items('Update_Shipment_Fields')?['value']"
                  },
                  "metadata": {
                    "operationMetadataId": "902d2bbe-7abb-46e1-a4e1-7d9c0c20ee77"
                  }
                }
              },
              "case": "fgj_notifyinfo"
            }
          },
          "metadata": {
            "operationMetadataId": "4edc31ae-797e-41cf-a808-7d1baae91e3c"
          }
        }
      },
      "runAfter": {
        "Update_Shipment_Missing_Data": [
          "Succeeded"
        ]
      },
      "metadata": {
        "operationMetadataId": "c7ecdeb6-6469-48f8-b674-1daf3931eb96"
      }
    },
    "Update_Shipment_All_Fields": {
      "type": "OpenApiConnection",
      "inputs": {
        "parameters": {
          "entityName": "fgj_shipments",
          "recordId": "@outputs('Get_Shipment_Details')?['body/fgj_shipmentid']",
          "item/fgj_consigneeinfo": "@coalesce(variables('var_consigneeinfo'), outputs('Get_Shipment_Details')?['body/fgj_consigneeinfo'])",
          "item/fgj_departurefrom": "@coalesce(variables('var_departurefrom'), outputs('Get_Shipment_Details')?['body/fgj_departurefrom'])",
          "item/fgj_ets": "@coalesce(variables('var_ets'), outputs('Get_Shipment_Details')?['body/fgj_ets'])",
          "item/fgj_notifyinfo": "@coalesce(variables('var_notifyinfo'), outputs('Get_Shipment_Details')?['body/fgj_notifyinfo'])",
          "item/fgj_portofdestination": "@coalesce(variables('var_portofdestination'), outputs('Get_Shipment_Details')?['body/fgj_portofdestination'])",
          "item/fgj_reference": "@coalesce(variables('var_reference'), outputs('Get_Shipment_Details')?['body/fgj_reference'])",
          "item/fgj_shipperinfo": "@coalesce(variables('var_shipperinfo'), outputs('Get_Shipment_Details')?['body/fgj_shipperinfo'])",
          "item/fgj_vesselvoyage": "@coalesce(variables('var_vesselvoyage'), outputs('Get_Shipment_Details')?['body/fgj_vesselvoyage'])"
        },
        "host": {
          "apiId": "/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps",
          "connection": "shared_commondataserviceforapps",
          "operationId": "UpdateOnlyRecord"
        }
      },
      "runAfter": {
        "Update_Shipment_Fields": [
          "Succeeded"
        ]
      },
      "metadata": {
        "operationMetadataId": "916f344a-f1fe-4805-88c2-2f45b7765ff9"
      }
    }
  },
  "else": {
    "actions": {}
  },
  "runAfter": {
    "Find_Shipment": [
      "Succeeded"
    ]
  },
  "metadata": {
    "operationMetadataId": "89d9ab15-d381-473e-8ae3-a0c279a930d9"
  }
}
```

---

## Flow 2: SI Email Processor

Processes incoming shipping instruction emails with Excel attachments.

**Trigger:** New email with attachment

### Flow Definition

```json
{
  "type": "OpenApiConnectionNotification",
  "inputs": {
    "parameters": {
      "includeAttachments": true,
      "fetchOnlyWithAttachment": true,
      "folderPath": "Id::AAMkADA0OGYxOGRlLWJiM2UtNDU5NC05ZjhkLWQ5Y2IzNTA5YmJhMgAuAAAAAAARAcYyT_6sQpnHcdRl7nqQAQBzMbDQGpDZQbvj05CU3M5lAAAAAAEMAAA="
    },
    "host": {
      "apiId": "/providers/Microsoft.PowerApps/apis/shared_office365",
      "connection": "shared_office365",
      "operationId": "OnNewEmailV3"
    }
  },
  "splitOn": "@triggerOutputs()?['body/value']",
  "metadata": {
    "Id::AAMkADA0OGYxOGRlLWJiM2UtNDU5NC05ZjhkLWQ5Y2IzNTA5YmJhMgAuAAAAAAARAcYyT_6sQpnHcdRl7nqQAQBzMbDQGpDZQbvj05CU3M5lAAAAAAEMAAA=": "Innboks"
  }
}
```

### Variable Initialization

```json
{
  "type": "InitializeVariable",
  "inputs": {
    "variables": [
      {
        "name": "VehicleRows",
        "type": "string"
      }
    ]
  },
  "runAfter": {}
}
```

### Email Metadata Compose

```json
{
  "type": "Compose",
  "inputs": {
    "subject": "@triggerOutputs()?['body/subject']",
    "from": "@triggerOutputs()?['body/from']",
    "hasAttachments": "@triggerOutputs()?['body/hasAttachments']",
    "receivedDateTime": "@triggerOutputs()?['body/receivedDateTime']"
  },
  "runAfter": {
    "Init_VehicleRows": [
      "Succeeded"
    ]
  }
}
```

### Main Attachment Processing Loop

```json
{
  "type": "Foreach",
  "foreach": "@triggerOutputs()?['body/attachments']",
  "actions": {
    "Create_file": {
      "type": "OpenApiConnection",
      "inputs": {
        "parameters": {
          "folderPath": "/WalWil-Test",
          "name": "@item()?['name']",
          "body": "@base64ToBinary(items('Apply_to_each')?['contentBytes'])"
        },
        "host": {
          "apiId": "/providers/Microsoft.PowerApps/apis/shared_onedriveforbusiness",
          "connection": "shared_onedriveforbusiness",
          "operationId": "CreateFile"
        }
      },
      "runtimeConfiguration": {
        "contentTransfer": {
          "transferMode": "Chunked"
        }
      }
    },
    "Run_a_prompt": {
      "type": "OpenApiConnection",
      "inputs": {
        "parameters": {
          "recordId": "fcf9feb5-5b50-4531-89b0-bfcb9e83ec3e",
          "item/requestv2/subject": "@triggerOutputs()?['body/subject']",
          "item/requestv2/documentContent": "@outputs('Compose_1')",
          "item/requestv2/filename": "@items('Apply_to_each')?['name']"
        },
        "host": {
          "apiId": "providers/Microsoft.ProcessSimple/operationGroups/aibuilder",
          "connection": "shared_commondataserviceforapps",
          "operationId": "aibuilderpredict_customprompt"
        }
      },
      "runAfter": {
        "Create_share_link": [
          "Succeeded"
        ]
      }
    },
    "Parse_JSON": {
      "type": "ParseJson",
      "inputs": {
        "content": "@outputs('Run_a_prompt')?['body/responsev2/predictionOutput/text']",
        "schema": {
          "type": "object",
          "properties": {
            "is_shipping_instruction": { "type": "boolean" },
            "confidence": { "type": "string" },
            "manufacturer": { "type": "string" },
            "bl_number": { "type": "string" },
            "vessel": { "type": "string" },
            "voyage": { "type": "string" },
            "port_of_loading": { "type": "string" },
            "port_of_destination": { "type": "string" },
            "departure_from": { "type": "string" },
            "ets": { "type": "string" },
            "eta": { "type": "string" },
            "reference": { "type": "string" },
            "document_type": { "type": "string" },
            "shipper": {
              "type": "object",
              "properties": {
                "name": { "type": "string" },
                "address": { "type": "string" },
                "contact": { "type": "string" },
                "email": { "type": "string" },
                "phone": { "type": "string" },
                "vat": { "type": "string" }
              }
            },
            "consignee": {
              "type": "object",
              "properties": {
                "name": { "type": "string" },
                "address": { "type": "string" }
              }
            },
            "notify_party": {
              "type": "object",
              "properties": {
                "name": { "type": "string" },
                "address": { "type": "string" },
                "contact": { "type": "string" }
              }
            },
            "totals": {
              "type": "object",
              "properties": {
                "units": { "type": "integer" },
                "weight_kg": { "type": "number" },
                "cbm": { "type": "number" }
              }
            },
            "vehicles": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "vin": { "type": "string" },
                  "model": { "type": "string" },
                  "weight_kg": { "type": "number" },
                  "cbm": { "type": "number" },
                  "hs_code": { "type": "string" }
                }
              }
            },
            "missing_fields": { "type": "array", "items": { "type": "string" } },
            "vehicles_missing_weight": { "type": "array", "items": { "type": "string" } },
            "vehicles_with_issues": { "type": "array", "items": { "type": "string" } },
            "ambiguous_fields": { "type": "array", "items": { "type": "string" } }
          }
        }
      },
      "runAfter": {
        "Run_a_prompt": [
          "Succeeded"
        ]
      }
    },
    "Condition": {
      "type": "If",
      "expression": {
        "and": [
          {
            "equals": [
              "@body('Parse_JSON')?['is_shipping_instruction']",
              true
            ]
          }
        ]
      },
      "actions": {
        "Add_a_new_row": {
          "type": "OpenApiConnection",
          "inputs": {
            "parameters": {
              "entityName": "fgj_shipments",
              "item/fgj_emailsubject": "@triggerOutputs()?['body/subject']",
              "item/fgj_ambiguouscount": "@length(body('Parse_JSON')?['ambiguous_fields'])",
              "item/fgj_ambiguousfields": "@join(body('Parse_JSON')?['ambiguous_fields'], ', ')",
              "item/fgj_blnumber": "@body('Parse_JSON')?['bl_number']",
              "item/fgj_confidence": "@body('Parse_JSON')?['confidence']",
              "item/fgj_consigneeinfo": "@concat(body('Parse_JSON')?['consignee']?['name'], decodeUriComponent('%0A'), body('Parse_JSON')?['consignee']?['address'])",
              "item/fgj_conversationid": "@triggerOutputs()?['body/conversationId']",
              "item/fgj_departurefrom": "@body('Parse_JSON')?['departure_from']",
              "item/fgj_documenttype": "@body('Parse_JSON')?['document_type']",
              "item/fgj_ets": "@body('Parse_JSON')?['ets']",
              "item/fgj_hasambiguousdata": "@greater(length(body('Parse_JSON')?['ambiguous_fields']), 0)",
              "item/fgj_hasmissingdata": "@greater(length(body('Parse_JSON')?['missing_fields']), 0)",
              "item/fgj_manufacturer": "@body('Parse_JSON')?['manufacturer']",
              "item/fgj_missingdatacount": "@length(body('Parse_JSON')?['missing_fields'])",
              "item/fgj_missingfields": "@join(body('Parse_JSON')?['missing_fields'], ', ')",
              "item/fgj_notifyinfo": "@concat(body('Parse_JSON')?['notify_party']?['name'], decodeUriComponent('%0A'), body('Parse_JSON')?['notify_party']?['address'])",
              "item/fgj_portofdestination": "@body('Parse_JSON')?['port_of_destination']",
              "item/fgj_receiveddate": "@triggerOutputs()?['body/receivedDateTime']",
              "item/fgj_reference": "@body('Parse_JSON')?['reference']",
              "item/fgj_senderemail": "@triggerOutputs()?['body/from']",
              "item/fgj_shipperinfo": "@concat(body('Parse_JSON')?['shipper']?['name'], decodeUriComponent('%0A'), body('Parse_JSON')?['shipper']?['address'])",
              "item/fgj_sifileurl": "@outputs('Create_share_link')?['body/WebUrl']",
              "item/fgj_status": "New",
              "item/fgj_totalcbm": "@body('Parse_JSON')?['totals']?['cbm']",
              "item/fgj_totalunits": "@body('Parse_JSON')?['totals']?['units']",
              "item/fgj_totalweightkg": "@body('Parse_JSON')?['totals']?['weight_kg']",
              "item/fgj_vehiclesmissingweight": "@join(body('Parse_JSON')?['vehicles_missing_weight'], ', ')",
              "item/fgj_vesselvoyage": "@body('Parse_JSON')?['vessel']"
            },
            "host": {
              "apiId": "/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps",
              "connection": "shared_commondataserviceforapps",
              "operationId": "CreateRecord"
            }
          }
        },
        "Loop_Vehicles": {
          "type": "Foreach",
          "foreach": "@body('Parse_JSON')?['vehicles']",
          "actions": {
            "Add_a_new_row_1": {
              "type": "OpenApiConnection",
              "inputs": {
                "parameters": {
                  "entityName": "fgj_vehicles",
                  "item/fgj_vin": "@items('Loop_Vehicles')?['vin']",
                  "item/fgj_cbm": "@items('Loop_Vehicles')?['cbm']",
                  "item/fgj_hscode": "@items('Loop_Vehicles')?['hs_code']",
                  "item/fgj_model": "@items('Loop_Vehicles')?['model']",
                  "item/fgj_shipmentid": "@outputs('Add_a_new_row')?['body/fgj_shipmentid']",
                  "item/fgj_weightkg": "@items('Loop_Vehicles')?['weight_kg']"
                },
                "host": {
                  "apiId": "/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps",
                  "connection": "shared_commondataserviceforapps",
                  "operationId": "CreateRecord"
                }
              }
            }
          },
          "runAfter": {
            "Condition_1": [
              "Succeeded"
            ]
          }
        },
        "Check_If_Missing_Data": {
          "type": "If",
          "expression": {
            "and": [
              {
                "equals": [
                  "@outputs('Add_a_new_row')?['body/fgj_hasmissingdata']",
                  true
                ]
              }
            ]
          },
          "actions": {
            "Reply_to_email_(V3)": {
              "type": "OpenApiConnection",
              "inputs": {
                "parameters": {
                  "messageId": "@triggerOutputs()?['body/id']",
                  "replyParameters/Body": "<p class=\"editor-paragraph\">@{outputs('Build_Email_Body')}</p>"
                },
                "host": {
                  "apiId": "/providers/Microsoft.PowerApps/apis/shared_office365",
                  "connection": "shared_office365",
                  "operationId": "ReplyToV3"
                }
              },
              "runAfter": {
                "Build_Email_Body": [
                  "Succeeded"
                ]
              }
            },
            "Build_Email_Body": {
              "type": "Compose",
              "inputs": "@concat('<p>Dear Sender,</p><p>We received your Shipping Instruction (BL: <b>', body('Parse_JSON')?['bl_number'], '</b>) but some required information is missing or unclear.</p><p><b>Missing Fields:</b></p><ul><li>', join(body('Parse_JSON')?['missing_fields'], '</li><li>'), '</li></ul><p><b>Vehicles Missing Weight:</b></p><ul>', if(empty(body('Parse_JSON')?['vehicles_missing_weight']), '<li>None</li>', concat('<li>', join(body('Parse_JSON')?['vehicles_missing_weight'], '</li><li>'), '</li>')), '</ul>', if(empty(body('Parse_JSON')?['ambiguous_fields']), '', concat('<p><b>Ambiguous Data:</b></p><ul><li>', join(body('Parse_JSON')?['ambiguous_fields'], '</li><li>'), '</li></ul>')), '<p>Please reply to this email with the corrected information.</p><p>Best regards,<br>WalWil Shipping Automation</p>')"
            }
          },
          "else": {
            "actions": {}
          },
          "runAfter": {
            "Loop_Vehicles": [
              "Succeeded"
            ]
          }
        },
        "Build_Route_Code": {
          "type": "Compose",
          "inputs": "@concat(if(equals(toUpper(body('Parse_JSON')?['departure_from']), 'UK'), 'SOUTHAMPTON', if(equals(toUpper(body('Parse_JSON')?['departure_from']), 'UNITED KINGDOM'), 'SOUTHAMPTON', if(equals(toUpper(body('Parse_JSON')?['departure_from']), 'SOUTHAMPTON'), 'SOUTHAMPTON', if(equals(toUpper(body('Parse_JSON')?['departure_from']), 'GERMANY'), 'BREMERHAVEN', if(equals(toUpper(body('Parse_JSON')?['departure_from']), 'ZEEBRUGGE'), 'ZEEBRUGGE', toUpper(replace(body('Parse_JSON')?['departure_from'], ' ', ''))))))), '_', toUpper(replace(body('Parse_JSON')?['port_of_destination'], ' ', '')))",
          "runAfter": {
            "Add_a_new_row": [
              "Succeeded"
            ]
          }
        },
        "Get_Rate": {
          "type": "OpenApiConnection",
          "inputs": {
            "parameters": {
              "entityName": "fgj_rates",
              "$filter": "fgj_manufacturer eq '@{body('Parse_JSON')?['manufacturer']}' and fgj_routecode eq '@{outputs('Build_Route_Code')}'"
            },
            "host": {
              "apiId": "/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps",
              "connection": "shared_commondataserviceforapps",
              "operationId": "ListRecords"
            }
          },
          "runAfter": {
            "Build_Route_Code": [
              "Succeeded"
            ]
          }
        },
        "Condition_1": {
          "type": "If",
          "expression": {
            "and": [
              {
                "greater": [
                  "@length(outputs('Get_Rate')?['body/value'])",
                  0
                ]
              }
            ]
          },
          "actions": {
            "Get_Charges": {
              "type": "OpenApiConnection",
              "inputs": {
                "parameters": {
                  "entityName": "fgj_charges",
                  "$filter": "fgj_Rate/fgj_rateid eq '@{first(outputs('Get_Rate')?['body/value'])?['fgj_rateid']}'"
                },
                "host": {
                  "apiId": "/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps",
                  "connection": "shared_commondataserviceforapps",
                  "operationId": "ListRecords"
                }
              }
            },
            "Apply_to_each_1": {
              "type": "Foreach",
              "foreach": "@outputs('Get_Charges')?['body/value']",
              "actions": {
                "Add_a_new_row_2": {
                  "type": "OpenApiConnection",
                  "inputs": {
                    "parameters": {
                      "entityName": "fgj_shipmentcharges",
                      "item/fgj_amount": "@mul(float(items('Apply_to_each_1')?['fgj_rateamount']), float(body('Parse_JSON')?['totals']?['units']))",
                      "item/fgj_chargecode": "@items('Apply_to_each_1')?['fgj_chargecode']",
                      "item/fgj_chargename": "@concat(items('Apply_to_each')?['fgj_chargecode'], ' - ', outputs('Add_a_new_row')?['body/fgj_blnumber'])",
                      "item/fgj_currency": "@items('Apply_to_each_1')?['fgj_currency']",
                      "item/fgj_freightterms": "@items('Apply_to_each_1')?['fgj_freightterms']",
                      "item/fgj_quantity": "@int(body('Parse_JSON')?['totals']?['units'])",
                      "item/fgj_rate": "@items('Apply_to_each_1')?['fgj_rateamount']",
                      "item/fgj_Shipment@odata.bind": "@concat('/fgj_shipments(', outputs('Add_a_new_row')?['body/fgj_shipmentid'], ')')",
                      "item/fgj_description": "@items('Apply_to_each_1')?['fgj_description']"
                    },
                    "host": {
                      "apiId": "/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps",
                      "connection": "shared_commondataserviceforapps",
                      "operationId": "CreateRecord"
                    }
                  }
                }
              },
              "runAfter": {
                "Get_Charges": [
                  "Succeeded"
                ]
              }
            }
          },
          "else": {
            "actions": {}
          },
          "runAfter": {
            "Get_Rate": [
              "Succeeded"
            ]
          }
        }
      },
      "else": {
        "actions": {
          "Compose_2": {
            "type": "Compose",
            "inputs": "Not an SI - skipping"
          }
        }
      },
      "runAfter": {
        "Parse_JSON": [
          "Succeeded"
        ]
      }
    },
    "Create_share_link": {
      "type": "OpenApiConnection",
      "inputs": {
        "parameters": {
          "id": "@outputs('Create_file')?['body/Id']",
          "type": "View",
          "scope": "Organization"
        },
        "host": {
          "apiId": "/providers/Microsoft.PowerApps/apis/shared_onedriveforbusiness",
          "connection": "shared_onedriveforbusiness",
          "operationId": "CreateShareLinkV2"
        }
      },
      "runAfter": {
        "Compose_1": [
          "Succeeded"
        ]
      }
    },
    "Get_file_content": {
      "type": "OpenApiConnection",
      "inputs": {
        "parameters": {
          "id": "@outputs('Create_file')?['body/Id']",
          "inferContentType": true
        },
        "host": {
          "apiId": "/providers/Microsoft.PowerApps/apis/shared_onedriveforbusiness",
          "connection": "shared_onedriveforbusiness",
          "operationId": "GetFileContent"
        }
      },
      "runAfter": {
        "Create_file": [
          "Succeeded"
        ]
      }
    },
    "Run_script": {
      "type": "OpenApiConnection",
      "inputs": {
        "parameters": {
          "source": "me",
          "drive": "b!btDWLqa1jESWclfFIcDx6pOmoCLr4PJEt4gYviienGVHH2moSk8uQ4oH6s7J1fa9",
          "file": "@outputs('Create_file')?['body/Id']",
          "scriptId": "ms-officescript%3A%2F%2Fonedrive_business_itemlink%2F01FS2MGGG2Y6RDIUOZ4FFJIR5IMGFVOVWR"
        },
        "host": {
          "apiId": "/providers/Microsoft.PowerApps/apis/shared_excelonlinebusiness",
          "connection": "shared_excelonlinebusiness",
          "operationId": "RunScriptProd"
        }
      },
      "runAfter": {
        "Get_file_content": [
          "Succeeded"
        ]
      }
    },
    "Compose_1": {
      "type": "Compose",
      "inputs": "@outputs('Run_script')?['body/result']",
      "runAfter": {
        "Run_script": [
          "Succeeded"
        ]
      }
    }
  },
  "runAfter": {
    "Compose": [
      "Succeeded"
    ]
  }
}
```

---

## Flow 3: WWO Rate Parser

Parses WWO worksheets and imports rate/charge data to Dataverse.

**Trigger:** File updated in `/WalWil-Test/WWO-Worksheets` folder

### Trigger Definition

```json
{
  "type": "OpenApiConnection",
  "inputs": {
    "parameters": {
      "folderId": "b!btDWLqa1jESWclfFIcDx6pOmoCLr4PJEt4gYviienGVHH2moSk8uQ4oH6s7J1fa9.01FS2MGGCWUU2Q4MXJN5CJKUH2L6JUIDN3"
    },
    "host": {
      "apiId": "/providers/Microsoft.PowerApps/apis/shared_onedriveforbusiness",
      "connection": "shared_onedriveforbusiness",
      "operationId": "OnUpdatedFileV2"
    }
  },
  "recurrence": {
    "interval": 1,
    "frequency": "Minute"
  },
  "metadata": {
    "6e202211-2856-4d17-9ded-5beb8b8626b0": "/",
    "b!btDWLqa1jESWclfFIcDx6pOmoCLr4PJEt4gYviienGVHH2moSk8uQ4oH6s7J1fa9.01FS2MGGCWUU2Q4MXJN5CJKUH2L6JUIDN3": "/WalWil-Test/WWO-Worksheets"
  }
}
```

### Get File Content

```json
{
  "type": "OpenApiConnection",
  "inputs": {
    "parameters": {
      "id": "@triggerOutputs()?['headers/x-ms-file-id']",
      "inferContentType": true
    },
    "host": {
      "apiId": "/providers/Microsoft.PowerApps/apis/shared_onedriveforbusiness",
      "connection": "shared_onedriveforbusiness",
      "operationId": "GetFileContent"
    }
  },
  "runAfter": {}
}
```

### Run Office Script

```json
{
  "type": "OpenApiConnection",
  "inputs": {
    "parameters": {
      "source": "me",
      "drive": "b!btDWLqa1jESWclfFIcDx6pOmoCLr4PJEt4gYviienGVHH2moSk8uQ4oH6s7J1fa9",
      "file": "@triggerOutputs()?['headers/x-ms-file-id']",
      "scriptId": "ms-officescript%3A%2F%2Fonedrive_business_itemlink%2F01FS2MGGFDCI4QQFVCZJFK5PZGBUJJ3AFU"
    },
    "host": {
      "apiId": "/providers/Microsoft.PowerApps/apis/shared_excelonlinebusiness",
      "connection": "shared_excelonlinebusiness",
      "operationId": "RunScriptProd"
    }
  },
  "runAfter": {
    "Get_file_content": [
      "Succeeded"
    ]
  }
}
```

### AI Builder Prompt

```json
{
  "type": "OpenApiConnection",
  "inputs": {
    "parameters": {
      "recordId": "644f13ec-7fd4-473d-9405-efb5e571b0fe",
      "item/requestv2/rawData": "@outputs('Compose')"
    },
    "host": {
      "apiId": "providers/Microsoft.ProcessSimple/operationGroups/aibuilder",
      "connection": "shared_commondataserviceforapps",
      "operationId": "aibuilderpredict_customprompt"
    }
  },
  "runAfter": {
    "Compose": [
      "Succeeded"
    ]
  }
}
```

### Clean JSON Output

```json
{
  "type": "Compose",
  "inputs": "@replace(replace(outputs('AI_Output'), '```json', ''), '```', '')",
  "runAfter": {
    "AI_Output": [
      "Succeeded"
    ]
  }
}
```

### Parse Rate JSON

```json
{
  "type": "ParseJson",
  "inputs": {
    "content": "@outputs('Clean_JSON')",
    "schema": {
      "type": "object",
      "properties": {
        "rates": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "manufacturer": { "type": "string" },
              "routeCode": { "type": "string" },
              "destinationPort": { "type": "string" },
              "charges": {
                "type": "array",
                "items": {
                  "type": "object",
                  "properties": {
                    "chargeCode": { "type": "string" },
                    "description": { "type": "string" },
                    "rate": { "type": "number" },
                    "currency": { "type": "string" },
                    "freightTerms": { "type": "string" }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  "runAfter": {
    "Clean_JSON": [
      "Succeeded"
    ]
  }
}
```

### Create Rates and Charges

```json
{
  "type": "Foreach",
  "foreach": "@body('Parse_JSON')?['rates']",
  "actions": {
    "Add_new_rate": {
      "type": "OpenApiConnection",
      "inputs": {
        "parameters": {
          "entityName": "fgj_rates",
          "item/fgj_manufacturer": "@items('Apply_to_each')?['manufacturer']",
          "item/fgj_name": "@concat(items('Apply_to_each')?['manufacturer'], ' - ', items('Apply_to_each')?['routeCode'])",
          "item/fgj_routecode": "@items('Apply_to_each')?['routeCode']",
          "item/fgj_routename": "@items('Apply_to_each')?['destinationPort']"
        },
        "host": {
          "apiId": "/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps",
          "connection": "shared_commondataserviceforapps",
          "operationId": "CreateRecord"
        }
      }
    },
    "Apply_to_each_1": {
      "type": "Foreach",
      "foreach": "@items('Apply_to_each')?['charges']",
      "actions": {
        "Add_new_charge": {
          "type": "OpenApiConnection",
          "inputs": {
            "parameters": {
              "entityName": "fgj_charges",
              "item/fgj_chargecode": "@items('Apply_to_each_1')?['chargeCode']",
              "item/fgj_chargename": "@items('Apply_to_each_1')?['chargeCode']",
              "item/fgj_currency": "@items('Apply_to_each_1')?['currency']",
              "item/fgj_freightterms": "@items('Apply_to_each_1')?['freightTerms']",
              "item/fgj_Rate@odata.bind": "@concat('/fgj_rates(', outputs('Add_new_rate')?['body/fgj_rateid'], ')')",
              "item/fgj_rateamount": "@items('Apply_to_each_1')?['rate']",
              "item/fgj_description": "@items('Apply_to_each_1')?['description']"
            },
            "host": {
              "apiId": "/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps",
              "connection": "shared_commondataserviceforapps",
              "operationId": "CreateRecord"
            }
          }
        }
      },
      "runAfter": {
        "Add_new_rate": [
          "Succeeded"
        ]
      }
    }
  },
  "runAfter": {
    "Parse_JSON": [
      "Succeeded"
    ]
  }
}
```

---

## HTTP API Endpoints

All endpoints require header: `x-api-key: ww-frontoffice-2026-xK9mP2nQ`

### API 1: Get Shipments (List)

**Endpoint:** `GET /shipments`

```json
{
  "type": "Request",
  "kind": "Http",
  "inputs": {
    "triggerAuthenticationType": "All",
    "method": "GET"
  }
}
```

**Response Transform (Updated January 28, 2026):**
```json
{
  "type": "Select",
  "inputs": {
    "from": "@outputs('Get_Shipments')?['body/value']",
    "select": {
      "id": "@item()?['fgj_shipmentid']",
      "blNumber": "@item()?['fgj_blnumber']",
      "manufacturer": "@item()?['fgj_manufacturer']",
      "status": "@item()?['fgj_status']",
      "hasMissingData": "@item()?['fgj_hasmissingdata']",
      "totalUnits": "@item()?['fgj_totalunits']",
      "departureFrom": "@item()?['fgj_departurefrom']",
      "portOfDestination": "@item()?['fgj_portofdestination']",
      "receivedDate": "@item()?['fgj_receiveddate']",
      "vesselVoyage": "@item()?['fgj_vesselvoyage']",
      "senderEmail": "@item()?['fgj_senderemail']",
      "missingFields": "@item()?['fgj_missingfields']",
      "vehiclesMissingWeight": "@item()?['fgj_vehiclesmissingweight']",
      "replyReceived": "@item()?['fgj_replyreceived']"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "count": 5
}
```

---

### API 2: Get Shipment Detail

**Endpoint:** `GET /shipments/{id}`

```json
{
  "type": "Request",
  "kind": "Http",
  "inputs": {
    "triggerAuthenticationType": "All",
    "method": "GET",
    "relativePath": "/shipments/{id}"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "guid",
    "blNumber": "WLWHAEF513U9",
    "vesselVoyage": "ANIARA",
    "manufacturer": "BMW",
    "status": "New",
    "departureFrom": "UK",
    "portOfDestination": "AUCKLAND",
    "totalUnits": 14,
    "totalWeightKg": 29400,
    "totalCbm": 212.8,
    "hasMissingData": true,
    "missingFields": "vehicle_weight:WBA123...",
    "shipperInfo": "BMW AG\nMunich, Germany",
    "consigneeInfo": "BMW NZ Ltd\nAuckland",
    "notifyInfo": "...",
    "siFileUrl": "https://sharepoint.com/...",
    "receivedDate": "2026-01-22T17:45:51Z",
    "vehicles": [
      {
        "id": "guid",
        "vin": "WBA123...",
        "model": "X5",
        "weightKg": 2100,
        "cbm": 15.2
      }
    ],
    "charges": [
      {
        "id": "guid",
        "chargeCode": "OCEAN",
        "description": "Ocean Freight",
        "quantity": 14,
        "rate": 280,
        "currency": "USD",
        "amount": 3920,
        "freightTerms": "PREPAID"
      }
    ]
  }
}
```

---

### API 3: Generate CSV

**Endpoint:** `POST /shipments/{id}/generate_csv`

```json
{
  "type": "Request",
  "kind": "Http",
  "inputs": {
    "triggerAuthenticationType": "All",
    "method": "POST",
    "relativePath": "/shipments/{id}/generate_csv"
  }
}
```

**CSV Format:**
```
B/L Number,WLWHAEF513U9
Vessel/Voyage,ANIARA
Manufacturer,BMW
POL,UK
POD,AUCKLAND
Total Units,14

VEHICLES
VIN,Model,Weight (KG),CBM
WBA123...,X5,2100,15.2
...
```

**Response:**
```json
{
  "success": true,
  "data": {
    "fileName": "WW_WLWHAEF513U9_20260126_134406.csv",
    "fileUrl": "https://sharepoint.com/..."
  }
}
```

---

## API 4: Send Email

Sends a missing weight notification email to the shipper and creates an outbound email record for tracking.

**Endpoint:** `POST /shipments/{id}/send_email`

### Flow Design

```
┌─────────────────────────────────────────────────────────────────┐
│  HTTP Trigger (POST /shipments/{id}/send_email)                 │
│  Accept: { to, subject, body }                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Validate API Key (Condition)                                   │
│  x-api-key header = Environment Variable                        │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
         [Valid]                         [Invalid]
              │                               │
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│  Get Shipment           │     │  Response 401           │
│  Filter: shipmentid     │     │  Unauthorized           │
└─────────────────────────┘     └─────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Send Email (Office 365 Outlook)                                │
│  To: triggerBody()?['to']                                       │
│  Subject: triggerBody()?['subject']                             │
│  Body: triggerBody()?['body']                                   │
└─────────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Create Email Record (Dataverse)                                │
│  Table: fgj_shipmentemails                                      │
│  - Direction: Outbound                                          │
│  - From: User email                                             │
│  - To, Subject, Body from trigger                               │
│  - Shipment: Lookup to current shipment                         │
└─────────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Update Shipment                                                │
│  - emailSent: Yes                                               │
└─────────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Response 200                                                   │
│  { success: true, data: { shipmentId, sentAt } }                │
└─────────────────────────────────────────────────────────────────┘
```

### HTTP Trigger Configuration

```json
{
  "type": "Request",
  "kind": "Http",
  "inputs": {
    "triggerAuthenticationType": "All",
    "method": "POST",
    "relativePath": "/shipments/{id}/send_email",
    "schema": {
      "type": "object",
      "properties": {
        "to": { "type": "string" },
        "subject": { "type": "string" },
        "body": { "type": "string" }
      },
      "required": ["to", "subject", "body"]
    }
  }
}
```

### Send Email Action

```json
{
  "type": "ApiConnection",
  "inputs": {
    "host": {
      "connectionName": "shared_office365",
      "operationId": "SendEmailV2"
    },
    "parameters": {
      "emailMessage/To": "@triggerBody()?['to']",
      "emailMessage/Subject": "@triggerBody()?['subject']",
      "emailMessage/Body": "@triggerBody()?['body']",
      "emailMessage/Importance": "Normal"
    }
  }
}
```

### Create Email Record (Dataverse)

```json
{
  "type": "OpenApiConnection",
  "inputs": {
    "host": {
      "connectionName": "shared_commondataserviceforapps",
      "operationId": "CreateRecord"
    },
    "parameters": {
      "entityName": "fgj_shipmentemails",
      "item": {
        "fgj_direction": 453170001,
        "fgj_from": "@outputs('Get_Current_User')?['body/mail']",
        "fgj_to": "@triggerBody()?['to']",
        "fgj_subject": "@triggerBody()?['subject']",
        "fgj_body": "@triggerBody()?['body']",
        "fgj_sentat": "@utcNow()",
        "fgj_Shipment@odata.bind": "fgj_shipments(@{triggerOutputs()['relativePathParameters']['id']})"
      }
    }
  }
}
```

### Update Shipment Record

```json
{
  "type": "OpenApiConnection",
  "inputs": {
    "host": {
      "connectionName": "shared_commondataserviceforapps",
      "operationId": "UpdateRecord"
    },
    "parameters": {
      "entityName": "fgj_shipments",
      "recordId": "@triggerOutputs()['relativePathParameters']['id']",
      "item": {
        "fgj_emailsent": true
      }
    }
  }
}
```

### Response

**Success (200):**
```json
{
  "success": true,
  "data": {
    "shipmentId": "abc123-...",
    "sentAt": "2026-01-28T10:30:00Z"
  }
}
```

**Unauthorized (401):**
```json
{
  "success": false,
  "error": "Unauthorized"
}
```

---

## API 5: Get Email Thread

Retrieves all email messages (sent and received) for a shipment, ordered chronologically.

**Endpoint:** `GET /shipments/{id}/emails`

### Flow Design

```
┌─────────────────────────────────────────────────────────────────┐
│  HTTP Trigger (GET /shipments/{id}/emails)                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Validate API Key (Condition)                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
         [Valid]                         [Invalid]
              │                               │
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│  List Email Records     │     │  Response 401           │
│  Filter by shipmentId   │     │  Unauthorized           │
│  Order by sentAt asc    │     └─────────────────────────┘
└─────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Select - Transform to API Response                             │
│  Map Dataverse fields to camelCase                              │
└─────────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Response 200                                                   │
│  { success: true, data: { shipmentId, emails: [...] } }         │
└─────────────────────────────────────────────────────────────────┘
```

### HTTP Trigger Configuration

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

### List Email Records (Dataverse)

```json
{
  "type": "OpenApiConnection",
  "inputs": {
    "host": {
      "connectionName": "shared_commondataserviceforapps",
      "operationId": "ListRecords"
    },
    "parameters": {
      "entityName": "fgj_shipmentemails",
      "$filter": "_fgj_shipment_value eq '@{triggerOutputs()['relativePathParameters']['id']}'",
      "$orderby": "fgj_sentat asc"
    }
  }
}
```

### Select - Transform Response

```json
{
  "type": "Select",
  "inputs": {
    "from": "@outputs('List_Emails')?['body/value']",
    "select": {
      "id": "@item()?['fgj_shipmentemailid']",
      "direction": "@if(equals(item()?['fgj_direction'], 453170001), 'outbound', 'inbound')",
      "from": "@item()?['fgj_from']",
      "to": "@item()?['fgj_to']",
      "subject": "@item()?['fgj_subject']",
      "body": "@item()?['fgj_body']",
      "sentAt": "@item()?['fgj_sentat']",
      "receivedAt": "@item()?['fgj_receivedat']",
      "hasAttachment": "@coalesce(item()?['fgj_hasattachment'], false)"
    }
  }
}
```

### Response

**Success (200):**
```json
{
  "success": true,
  "data": {
    "shipmentId": "abc123-...",
    "emails": [
      {
        "id": "email-001",
        "direction": "outbound",
        "from": "shipping@walwil.com",
        "to": "customer@shipper.com",
        "subject": "Missing Weight Information - BL WLWHAEF513U9",
        "body": "Dear Customer, we are missing weight...",
        "sentAt": "2026-01-28T10:30:00Z",
        "receivedAt": null,
        "hasAttachment": false
      },
      {
        "id": "email-002",
        "direction": "inbound",
        "from": "customer@shipper.com",
        "to": "shipping@walwil.com",
        "subject": "RE: Missing Weight Information - BL WLWHAEF513U9",
        "body": "Hi, the weight for VIN WBA123... is 2150 kg.",
        "sentAt": null,
        "receivedAt": "2026-01-28T14:45:00Z",
        "hasAttachment": false
      }
    ]
  }
}
```

---

## Dataverse Tables

### fgj_shipmentemails (Shipment Emails)

Stores all email communication related to shipments for thread tracking.

| Column Name | Display Name | Type | Description |
|-------------|--------------|------|-------------|
| fgj_shipmentemailid | Email ID | Unique Identifier | Primary key (auto-generated) |
| fgj_direction | Direction | Choice | Outbound (453170001) or Inbound (453170000) |
| fgj_from | From | Single Line Text | Sender email address |
| fgj_to | To | Single Line Text | Recipient email address |
| fgj_subject | Subject | Single Line Text | Email subject line |
| fgj_body | Body | Multiple Lines Text | Email body content |
| fgj_sentat | Sent At | Date and Time | When outbound email was sent |
| fgj_receivedat | Received At | Date and Time | When inbound email was received |
| fgj_hasattachment | Has Attachment | Yes/No | Whether email has attachments |
| fgj_Shipment | Shipment | Lookup | Reference to fgj_shipments table |

**Choice Values for fgj_direction:**
- 453170000 = Inbound (received from customer)
- 453170001 = Outbound (sent to customer)

### Relationship

```
fgj_shipments (1) ────────< (N) fgj_shipmentemails
     │                              │
     └── fgj_shipmentid             └── fgj_Shipment (Lookup)
```

---

## Flow Updates

### SI Monitor Replies - Create Inbound Email Record

When a customer reply is detected, in addition to updating the shipment and vehicle data, the flow now creates an inbound email record.

**Add after AI Builder processing:**

```json
{
  "type": "OpenApiConnection",
  "inputs": {
    "host": {
      "connectionName": "shared_commondataserviceforapps",
      "operationId": "CreateRecord"
    },
    "parameters": {
      "entityName": "fgj_shipmentemails",
      "item": {
        "fgj_direction": 453170000,
        "fgj_from": "@triggerOutputs()?['body/from']",
        "fgj_to": "@triggerOutputs()?['body/toRecipients']",
        "fgj_subject": "@triggerOutputs()?['body/subject']",
        "fgj_body": "@triggerOutputs()?['body/body']",
        "fgj_receivedat": "@triggerOutputs()?['body/receivedDateTime']",
        "fgj_hasattachment": "@triggerOutputs()?['body/hasAttachments']",
        "fgj_Shipment@odata.bind": "fgj_shipments(@{outputs('Get_Shipments')?['body/value'][0]?['fgj_shipmentid']})"
      }
    }
  }
}
```

**Update Shipment - Set Reply Received:**

```json
{
  "type": "OpenApiConnection",
  "inputs": {
    "host": {
      "connectionName": "shared_commondataserviceforapps",
      "operationId": "UpdateRecord"
    },
    "parameters": {
      "entityName": "fgj_shipments",
      "recordId": "@outputs('Get_Shipments')?['body/value'][0]?['fgj_shipmentid']",
      "item": {
        "fgj_replyreceived": true
      }
    }
  }
}
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `fgj_FrontOfficeApiKey` | API key for authenticating frontend requests |

All flows validate requests using:
```
@equals(triggerOutputs()['headers']?['x-api-key'], parameters('fgj_FrontOfficeApiKey (fgj_frontofficeapikey)'))
```
