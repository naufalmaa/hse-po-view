#!/usr/bin/env python3
"""
CSMS AI Batch Evaluation Dashboard Generator

Generates an interactive HTML dashboard from batch evaluation results.
Run this script after executing the batch evaluation notebook.

Usage:
    python generate_dashboard.py [input_json] [output_html]

Default:
    input:  notebook_v2/outputs/reports/batch_evaluation_results.json
    output: notebook_v2/outputs/reports/batch_evaluation_dashboard.html
"""

import os
import sys
import json
import argparse
from typing import Dict, Any, List

def generate_dashboard_html(report_data: Dict[str, Any]) -> str:
    """Generate complete HTML dashboard from report data."""
    
    json_str = json.dumps(report_data, ensure_ascii=False, indent=None)
    total = report_data.get('total_categories', 0)
    summary = report_data.get('summary', {})
    
    html = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CSMS AI Batch Evaluation Dashboard</title>
    <style>
        * {{ 
            box-sizing: border-box; 
            margin: 0; 
            padding: 0; 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
        }}
        
        body {{ 
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: #e2e8f0; 
            padding: 2rem; 
            min-height: 100vh;
        }}
        
        .container {{ 
            max-width: 1800px; 
            margin: 0 auto; 
        }}
        
        header {{
            margin-bottom: 2rem;
            padding-bottom: 1.5rem;
            border-bottom: 2px solid #334155;
        }}
        
        h1 {{ 
            font-size: 2.5rem; 
            margin-bottom: 0.5rem; 
            background: linear-gradient(135deg, #3b82f6, #10b981); 
            -webkit-background-clip: text; 
            -webkit-text-fill-color: transparent;
            font-weight: 700;
        }}
        
        .subtitle {{ 
            color: #94a3b8; 
            font-size: 1.1rem;
        }}
        
        .summary-grid {{ 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
            gap: 1.5rem; 
            margin-bottom: 3rem; 
        }}
        
        .summary-card {{ 
            background: #1e293b; 
            padding: 2rem; 
            border-radius: 16px; 
            border: 2px solid #334155;
            transition: transform 0.2s, box-shadow 0.2s;
        }}
        
        .summary-card:hover {{
            transform: translateY(-4px);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }}
        
        .summary-card h3 {{ 
            font-size: 0.9rem; 
            color: #94a3b8; 
            text-transform: uppercase; 
            letter-spacing: 0.05em;
            margin-bottom: 1rem; 
            font-weight: 600;
        }}
        
        .summary-card .value {{ 
            font-size: 3rem; 
            font-weight: 700; 
            line-height: 1;
        }}
        
        .summary-card .detail {{
            color: #64748b; 
            font-size: 1rem; 
            margin-top: 0.75rem;
        }}
        
        .value.correct {{ color: #10b981; }}
        .value.partial {{ color: #f59e0b; }}
        .value.incorrect {{ color: #ef4444; }}
        .value.neutral {{ color: #3b82f6; }}
        
        h2 {{
            font-size: 1.5rem;
            margin: 2rem 0 1rem 0;
            color: #f1f5f9;
        }}
        
        table {{ 
            width: 100%; 
            border-collapse: separate;
            border-spacing: 0;
            background: #1e293b; 
            border-radius: 16px; 
            overflow: hidden; 
            margin-bottom: 2rem;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        }}
        
        th, td {{ 
            padding: 1.2rem 1rem; 
            text-align: left; 
            border-bottom: 1px solid #334155; 
        }}
        
        th {{ 
            background: #0f172a; 
            font-weight: 700; 
            color: #94a3b8; 
            font-size: 0.85rem; 
            text-transform: uppercase;
            letter-spacing: 0.05em;
            position: sticky;
            top: 0;
        }}
        
        tr:last-child td {{ 
            border-bottom: none; 
        }}
        
        tr:hover td {{ 
            background: rgba(59, 130, 246, 0.08); 
        }}
        
        .badge {{ 
            padding: 0.4rem 0.9rem; 
            border-radius: 99px; 
            font-size: 0.75rem; 
            font-weight: 700; 
            display: inline-block;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }}
        
        .badge.correct {{ 
            background: rgba(16, 185, 129, 0.2); 
            color: #10b981;
            border: 1px solid rgba(16, 185, 129, 0.3);
        }}
        
        .badge.incorrect {{ 
            background: rgba(239, 68, 68, 0.2); 
            color: #ef4444;
            border: 1px solid rgba(239, 68, 68, 0.3);
        }}
        
        .badge.partial {{ 
            background: rgba(245, 158, 11, 0.2); 
            color: #f59e0b;
            border: 1px solid rgba(245, 158, 11, 0.3);
        }}
        
        .progress-container {{
            margin: 0.5rem 0;
        }}
        
        .progress-label {{
            display: flex;
            justify-content: space-between;
            margin-bottom: 0.3rem;
            font-size: 0.8rem;
            color: #94a3b8;
        }}
        
        .progress-bar {{ 
            background: #0f172a; 
            border-radius: 8px; 
            height: 24px; 
            overflow: hidden; 
            position: relative;
            box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
        }}
        
        .progress-fill {{ 
            height: 100%; 
            transition: width 0.5s ease; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            font-size: 0.8rem; 
            font-weight: 700; 
            color: white;
            position: relative;
        }}
        
        .progress-fill.correct {{ 
            background: linear-gradient(90deg, #10b981, #059669);
        }}
        
        .progress-fill.partial {{ 
            background: linear-gradient(90deg, #f59e0b, #d97706);
        }}
        
        .progress-fill.incorrect {{ 
            background: linear-gradient(90deg, #ef4444, #dc2626);
        }}
        
        .score-display {{
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 0.5rem;
        }}
        
        .score-value {{
            font-size: 1.5rem;
            font-weight: 700;
        }}
        
        .score-expected {{
            color: #64748b;
            font-size: 0.9rem;
        }}
        
        .pipeline-cell {{
            min-width: 180px;
        }}
        
        .comparison-grid {{
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 0.75rem;
            margin-top: 1rem;
            padding: 1rem;
            background: #0f172a;
            border-radius: 8px;
        }}
        
        .comparison-item {{
            text-align: center;
        }}
        
        .comparison-item .label {{
            color: #64748b;
            font-size: 0.75rem;
            margin-bottom: 0.3rem;
            text-transform: uppercase;
        }}
        
        .comparison-item .score {{
            font-size: 1.3rem;
            font-weight: 700;
        }}
        
        .stats-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 0.5rem;
            margin-top: 0.5rem;
            font-size: 0.85rem;
        }}
        
        .stat-item {{
            background: #0f172a;
            padding: 0.5rem;
            border-radius: 6px;
        }}
        
        .stat-label {{
            color: #64748b;
            font-size: 0.7rem;
        }}
        
        .stat-value {{
            font-weight: 600;
            color: #e2e8f0;
        }}
        
        .footer {{
            margin-top: 3rem;
            padding-top: 1.5rem;
            border-top: 1px solid #334155;
            text-align: center;
            color: #64748b;
            font-size: 0.9rem;
        }}
    </style>
</head>
<body>
<div class="container">
    <header>
        <h1>CSMS AI Batch Evaluation Dashboard</h1>
        <p class="subtitle">Marine Category Scoring — {total} Categories Evaluated | {report_data.get('timestamp', 'N/A')}</p>
    </header>
    
    <div class="summary-grid" id="summary-grid"></div>
    
    <h2>Category Results Comparison</h2>
    <table id="results-table">
        <thead>
            <tr>
                <th style="width: 40px;">#</th>
                <th style="width: 80px;">ID</th>
                <th style="min-width: 200px;">Category Name</th>
                <th style="width: 100px;">Expected</th>
                <th class="pipeline-cell">Original Pipeline</th>
                <th class="pipeline-cell">Enhanced (Small)</th>
                <th class="pipeline-cell">Enhanced (Large)</th>
                <th style="width: 150px;">Best Match</th>
            </tr>
        </thead>
        <tbody id="results-tbody"></tbody>
    </table>
    
    <div class="footer">
        <p>Generated by CSMS AI Scoring Engine | Embedding Models: text-embedding-3-small (1536-dim) & text-embedding-3-large (3072-dim)</p>
    </div>
</div>

<script>
const DATA = {json_str};

function renderSummary() {{
    const summary = DATA.summary;
    const total = DATA.total_categories;
    let html = '';
    
    html += `<div class="summary-card">
        <h3>Total Categories</h3>
        <div class="value neutral">${{total}}</div>
        <div class="detail">Marine categories evaluated</div>
    </div>`;
    
    if (summary.original) {{
        const acc = summary.original.accuracy;
        const colorClass = acc >= 80 ? 'correct' : (acc >= 60 ? 'partial' : 'incorrect');
        html += `<div class="summary-card">
            <h3>Original Pipeline</h3>
            <div class="value ${{colorClass}}">${{summary.original.correct}}/${{total}}</div>
            <div class="detail">${{summary.original.accuracy.toFixed(1)}}% accuracy | ${{summary.original.total_time.toFixed(1)}}s total</div>
        </div>`;
    }}
    
    if (summary.enhanced_small) {{
        const acc = summary.enhanced_small.accuracy;
        const colorClass = acc >= 80 ? 'correct' : (acc >= 60 ? 'partial' : 'incorrect');
        html += `<div class="summary-card">
            <h3>Enhanced (Small Embedding)</h3>
            <div class="value ${{colorClass}}">${{summary.enhanced_small.correct}}/${{total}}</div>
            <div class="detail">${{summary.enhanced_small.accuracy.toFixed(1)}}% accuracy | ${{summary.enhanced_small.total_time.toFixed(1)}}s total</div>
        </div>`;
    }}
    
    if (summary.enhanced_large) {{
        const acc = summary.enhanced_large.accuracy;
        const colorClass = acc >= 80 ? 'correct' : (acc >= 60 ? 'partial' : 'incorrect');
        html += `<div class="summary-card">
            <h3>Enhanced (Large Embedding)</h3>
            <div class="value ${{colorClass}}">${{summary.enhanced_large.correct}}/${{total}}</div>
            <div class="detail">${{summary.enhanced_large.accuracy.toFixed(1)}}% accuracy | ${{summary.enhanced_large.total_time.toFixed(1)}}s total</div>
        </div>`;
    }}
    
    document.getElementById('summary-grid').innerHTML = html;
}}

function renderPipelineCell(pipelineData, isCorrect, expected) {{
    if (!pipelineData) {{
        return '<div style="color: #64748b;">N/A</div>';
    }}
    
    const score = pipelineData.predicted;
    const confidence = (pipelineData.confidence || 0) * 100;
    const time = pipelineData.time || 0;
    const badge = isCorrect ? '<span class="badge correct">Correct</span>' : '<span class="badge incorrect">Wrong</span>';
    
    const diff = Math.abs(score - expected);
    const progressPct = Math.max(0, Math.min(100, (score / 10) * 100));
    const progressClass = isCorrect ? 'correct' : (diff <= 3 ? 'partial' : 'incorrect');
    
    return `
        <div class="score-display">
            <span class="score-value">${{score}}</span>
            <span class="score-expected">/ 10</span>
        </div>
        ${{badge}}
        <div class="progress-container">
            <div class="progress-label">
                <span>Score</span>
                <span>${{score}}/10</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill ${{progressClass}}" style="width: ${{progressPct}}%">
                    ${{progressPct > 15 ? score + '/10' : ''}}
                </div>
            </div>
        </div>
        <div class="stats-grid">
            <div class="stat-item">
                <div class="stat-label">Confidence</div>
                <div class="stat-value">${{confidence.toFixed(1)}}%</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Time</div>
                <div class="stat-value">${{time.toFixed(1)}}s</div>
            </div>
        </div>
    `;
}}

function renderResults() {{
    const results = DATA.results;
    let html = '';
    
    results.forEach((r, idx) => {{
        const expected = r.expected;
        
        const origCell = renderPipelineCell(r.original, r.original_correct, expected);
        const smallCell = renderPipelineCell(r.enhanced_small, r.enhanced_small_correct, expected);
        const largeCell = renderPipelineCell(r.enhanced_large, r.enhanced_large_correct, expected);
        
        let bestMatch = '<span class="badge incorrect">None</span>';
        if (r.original_correct || r.enhanced_small_correct || r.enhanced_large_correct) {{
            const matches = [];
            if (r.original_correct) matches.push('Original');
            if (r.enhanced_small_correct) matches.push('Small');
            if (r.enhanced_large_correct) matches.push('Large');
            bestMatch = `<span class="badge correct">${{matches.join(', ')}}</span>`;
        }}
        
        html += `<tr>
            <td><strong>${{idx + 1}}</strong></td>
            <td><strong style="color: #3b82f6;">${{r.category_id}}</strong></td>
            <td>
                <div style="font-weight: 600; margin-bottom: 0.3rem;">${{r.category_name.substring(0, 60)}}${{r.category_name.length > 60 ? '...' : ''}}</div>
            </td>
            <td>
                <div style="font-size: 1.8rem; font-weight: 700; color: #f59e0b;">${{expected}}</div>
            </td>
            <td class="pipeline-cell">${{origCell}}</td>
            <td class="pipeline-cell">${{smallCell}}</td>
            <td class="pipeline-cell">${{largeCell}}</td>
            <td>${{bestMatch}}</td>
        </tr>`;
    }});
    
    document.getElementById('results-tbody').innerHTML = html;
}}

renderSummary();
renderResults();
</script>
</body>
</html>''';
    
    return html


def main():
    parser = argparse.ArgumentParser(description='Generate CSMS AI Batch Evaluation Dashboard')
    
    default_input = os.path.join(os.path.dirname(__file__), 'outputs', 'reports', 'batch_evaluation_results.json')
    default_output = os.path.join(os.path.dirname(__file__), 'outputs', 'reports', 'batch_evaluation_dashboard.html')
    
    parser.add_argument('input', nargs='?', default=default_input,
                       help='Input JSON file path (default: outputs/reports/batch_evaluation_results.json)')
    parser.add_argument('output', nargs='?', default=default_output,
                       help='Output HTML file path (default: outputs/reports/batch_evaluation_dashboard.html)')
    
    args = parser.parse_args()
    
    if not os.path.exists(args.input):
        print(f'Error: Input file not found: {args.input}')
        print('Run the batch evaluation notebook first to generate results.')
        sys.exit(1)
    
    print(f'Loading results from: {args.input}')
    with open(args.input, 'r', encoding='utf-8') as f:
        report_data = json.load(f)
    
    print(f'Generating HTML dashboard...')
    html_content = generate_dashboard_html(report_data)
    
    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    with open(args.output, 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    file_size = os.path.getsize(args.output) / 1024
    print(f'Dashboard generated: {args.output}')
    print(f'File size: {file_size:.1f} KB')
    print(f'\nOpen this file in a web browser to view the interactive dashboard.')


if __name__ == '__main__':
    main()
