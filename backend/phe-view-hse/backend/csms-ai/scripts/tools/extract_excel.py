import pandas as pd
import json
import sys

excel_file = "MARINE-kriteria_penilaian_CSMS_for_AI_rules_v3.xlsx"
output_file = "excel_analysis.json"

try:
    xl = pd.ExcelFile(excel_file)
    data = {}
    for sheet in xl.sheet_names:
        df = xl.parse(sheet)
        
        # Convert df to a list of dicts, keeping NA as None
        records = df.where(pd.notnull(df), None).to_dict(orient='records')
        
        data[sheet] = {
            "columns": list(df.columns),
            "rows": records
        }

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"Successfully extracted {len(xl.sheet_names)} sheets to {output_file}")
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
