import json

with open('excel_analysis.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

with open('excel_summary.md', 'w', encoding='utf-8') as f:
    f.write("# Excel Summary\n\n")
    for sheet, content in data.items():
        f.write(f"## Sheet: {sheet}\n")
        f.write(f"**Columns:**\n")
        for col in content['columns']:
            f.write(f"- {col}\n")
        f.write(f"\n**Row Count:** {len(content['rows'])}\n")
        f.write("\n**Sample Row:**\n```json\n")
        if content['rows']:
            f.write(json.dumps(content['rows'][0], indent=2, ensure_ascii=False))
        f.write("\n```\n\n")

print("Created excel_summary.md")
