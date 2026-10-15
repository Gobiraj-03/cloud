# Compliance Report Generation & Formula-Safe CSV Export

## Overview

AssetFlow generates 7 structured compliance reports from active database records. In addition to in-browser JSON preview drawers, administrators can download formatted CSV spreadsheets. To prevent spreadsheet formula injection attacks (CSV Injection / CWE-1236), AssetFlow processes every exported value through an automated security sanitizer.

## Mermaid Pipeline Architecture

```mermaid
flowchart LR
    subgraph Client ["Client Browser"]
        UserClick["User selects report type\n(e.g., 'asset_inventory')"]
        Choice{"Action?"}
        PreviewAction["Click 'Preview'\nGET /api/reports/:type"]
        DownloadAction["Click 'Download CSV'\nGET /api/reports/:type/csv"]
    end

    subgraph BackendEngine ["Express Backend & Report Service"]
        QueryDB["Execute Parameterized SQL Query\n(JOINs across domain tables)"]
        RawRows["Raw Database Rows"]
        Formatter["Format Column Headers & Timestamps"]
        
        subgraph SecurityFilter ["Formula Injection Defense (CWE-1236)"]
            CheckFormula{"Cell starts with\n=, +, -, @, \\t, \\r?"}
            Sanitize["Prefix with single quote (')\nEscape double quotes (\")"]
            SafePass["Pass-through sanitized string"]
        end
    end

    subgraph OutputDelivery ["Delivery & Presentation"]
        JSONResp["JSON Response with record_count\nRendered in Browser Drawer Table"]
        CSVBlob["Safe CSV Stream\nContent-Type: text/csv\nContent-Disposition: attachment"]
        ExcelApp["Microsoft Excel / Google Sheets\n(Formula execution safely neutralized)"]
    end

    UserClick --> Choice
    Choice -->|Preview| PreviewAction
    Choice -->|Download| DownloadAction

    PreviewAction --> QueryDB
    DownloadAction --> QueryDB
    QueryDB --> RawRows
    RawRows --> Formatter

    Formatter -->|If Preview| JSONResp
    Formatter -->|If CSV Export| CheckFormula
    CheckFormula -->|Dangerous Leading Char| Sanitize
    CheckFormula -->|Safe Character| SafePass
    Sanitize --> CSVBlob
    SafePass --> CSVBlob
    CSVBlob --> ExcelApp
```

## Security Mechanism: Neutralizing CSV Injection

Spreadsheet applications (Excel, LibreOffice, Google Sheets) automatically execute cells beginning with `=`, `+`, `-`, or `@` as dynamic macros or external data import formulas:
```
Dangerous Input:  =cmd|' /C calc'!A0
Dangerous Input:  @SUM(1+1)*cmd|' /C calc'!A0
Dangerous Input:  -2+3+cmd|' /C calc'!A0
```

### AssetFlow's Defense:
The `sanitizeCsvCell(val)` utility checks each cell before CSV serialization:
```javascript
function sanitizeCsvCell(val) {
  if (val === null || val === undefined) return '""';
  let str = String(val);
  const DANGEROUS_PREFIXES = ['=', '+', '-', '@', '\t', '\r'];
  if (DANGEROUS_PREFIXES.some(prefix => str.startsWith(prefix))) {
    str = "'" + str; // Neutralize formula execution in Excel
  }
  return `"${str.replace(/"/g, '""')}"`;
}
```
Result in exported CSV: `"'=cmd|' /C calc'!A0"`, which spreadsheets render safely as plain text without executing code.
