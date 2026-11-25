import os
import json
from typing import Dict, Any

def generate_html_viewer(report_data: Dict[str, Any], output_dir: str):
    os.makedirs(output_dir, exist_ok=True)
    html_content = build_viewer_html(report_data)
    out_path = os.path.join(output_dir, "index.html")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(html_content)

def build_viewer_html(report_data: Dict[str, Any]) -> str:
    # Serialize data cleanly for embedded JavaScript
    json_str = json.dumps(report_data, ensure_ascii=False)
    
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CSMS AI Scoring Engine — VLLM Evaluation Dashboard</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        :root {{
            --bg-primary: #0a0e17;
            --bg-secondary: #121826;
            --bg-card: rgba(22, 30, 46, 0.75);
            --border-color: rgba(255, 255, 255, 0.08);
            --text-primary: #f0f4f8;
            --text-secondary: #94a3b8;
            --text-muted: #64748b;
            --accent-primary: #3b82f6;
            --accent-glow: rgba(59, 130, 246, 0.35);
            
            --color-passed: #10b981;
            --bg-passed: rgba(16, 185, 129, 0.15);
            --color-review: #f59e0b;
            --bg-review: rgba(245, 158, 11, 0.15);
            --color-failed: #ef4444;
            --bg-failed: rgba(239, 68, 68, 0.15);
        }}

        * {{
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: 'Outfit', sans-serif;
        }}

        body {{
            background-color: var(--bg-primary);
            color: var(--text-primary);
            min-height: 100vh;
            padding: 2rem;
            background-image: 
                radial-gradient(circle at 10% 15%, rgba(59, 130, 246, 0.1) 0%, transparent 45%),
                radial-gradient(circle at 90% 85%, rgba(16, 185, 129, 0.08) 0%, transparent 45%);
            background-attachment: fixed;
        }}

        .container {{
            max-width: 1500px;
            margin: 0 auto;
        }}

        header {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
            padding-bottom: 1.5rem;
            border-bottom: 1px solid var(--border-color);
        }}

        .title-area h1 {{
            font-size: 2.3rem;
            font-weight: 700;
            background: linear-gradient(135deg, #ffffff 0%, #94a3b8 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }}

        .title-area p {{
            color: var(--text-secondary);
            font-size: 0.95rem;
            margin-top: 0.2rem;
        }}

        .badge-vllm {{
            background: linear-gradient(135deg, #3b82f6, #6366f1);
            color: white;
            padding: 0.5rem 1.2rem;
            border-radius: 99px;
            font-weight: 600;
            font-size: 0.9rem;
            box-shadow: 0 0 20px var(--accent-glow);
        }}

        nav.tabs {{
            display: flex;
            gap: 0.5rem;
            overflow-x: auto;
            margin-bottom: 2rem;
            padding-bottom: 0.5rem;
            border-bottom: 1px solid var(--border-color);
        }}

        nav.tabs button {{
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid var(--border-color);
            color: var(--text-secondary);
            padding: 0.75rem 1.4rem;
            border-radius: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.25s ease;
            white-space: nowrap;
        }}

        nav.tabs button:hover {{
            background: rgba(255, 255, 255, 0.08);
            color: var(--text-primary);
        }}

        nav.tabs button.active {{
            background: var(--accent-primary);
            color: white;
            border-color: var(--accent-primary);
            box-shadow: 0 0 15px var(--accent-glow);
        }}

        .section-view {{
            display: none;
            animation: fadeIn 0.3s ease;
        }}

        .section-view.active {{
            display: block;
        }}

        @keyframes fadeIn {{
            from {{ opacity: 0; transform: translateY(8px); }}
            to {{ opacity: 1; transform: translateY(0); }}
        }}

        .kpi-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2.5rem;
        }}

        .kpi-card {{
            background: var(--bg-card);
            backdrop-filter: blur(12px);
            border: 1px solid var(--border-color);
            border-radius: 16px;
            padding: 1.5rem;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
            transition: transform 0.25s ease;
        }}

        .kpi-card:hover {{
            transform: translateY(-3px);
        }}

        .kpi-title {{
            color: var(--text-secondary);
            font-size: 0.85rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 0.5rem;
        }}

        .kpi-val {{
            font-size: 2.2rem;
            font-weight: 700;
            color: var(--text-primary);
        }}

        .charts-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 2rem;
            margin-bottom: 2.5rem;
        }}

        .chart-card {{
            background: var(--bg-card);
            backdrop-filter: blur(12px);
            border: 1px solid var(--border-color);
            border-radius: 16px;
            padding: 1.5rem;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
        }}

        .chart-card h3 {{
            margin-bottom: 1rem;
            font-size: 1.1rem;
            color: var(--text-primary);
        }}

        table {{
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            background: var(--bg-card);
            border-radius: 16px;
            overflow: hidden;
            border: 1px solid var(--border-color);
        }}

        th, td {{
            padding: 1rem 1.2rem;
            text-align: left;
            border-bottom: 1px solid var(--border-color);
        }}

        th {{
            background: rgba(255, 255, 255, 0.03);
            font-weight: 600;
            color: var(--text-secondary);
            font-size: 0.85rem;
            text-transform: uppercase;
        }}

        tr:last-child td {{
            border-bottom: none;
        }}

        tr:hover td {{
            background: rgba(255, 255, 255, 0.02);
        }}

        .badge {{
            padding: 0.3rem 0.8rem;
            border-radius: 99px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
        }}

        .badge.passed {{ background: var(--bg-passed); color: var(--color-passed); }}
        .badge.needs_review {{ background: var(--bg-review); color: var(--color-review); }}
        .badge.failed {{ background: var(--bg-failed); color: var(--color-failed); }}

        code {{
            font-family: 'JetBrains Mono', monospace;
            background: rgba(255, 255, 255, 0.05);
            padding: 0.2rem 0.5rem;
            border-radius: 6px;
            font-size: 0.85rem;
        }}
    </style>
</head>
<body>
<div class="container">
    <header>
        <div class="title-area">
            <h1>CSMS AI Scoring Engine Dashboard</h1>
            <p>VLLM Multi-Model Evaluation Framework & Pipeline Analytics</p>
        </div>
        <div class="badge-vllm">VLLM ACTIVE ENGINE</div>
    </header>

    <nav class="tabs">
        <button class="tab-btn active" onclick="switchSection('overview', this)">Overview</button>
        <button class="tab-btn" onclick="switchSection('file_discovery', this)">File Discovery</button>
        <button class="tab-btn" onclick="switchSection('extraction', this)">Extraction</button>
        <button class="tab-btn" onclick="switchSection('evidence', this)">Evidence</button>
        <button class="tab-btn" onclick="switchSection('validators', this)">Validators</button>
        <button class="tab-btn" onclick="switchSection('reasoning', this)">Reasoning</button>
        <button class="tab-btn" onclick="switchSection('consensus', this)">Consensus</button>
        <button class="tab-btn" onclick="switchSection('final_score', this)">Final Score</button>
        <button class="tab-btn" onclick="switchSection('confusion_matrix', this)">Confusion Matrix</button>
    </nav>

    <!-- OVERVIEW SECTION -->
    <div id="overview" class="section-view active">
        <div class="kpi-grid" id="kpi-container"></div>
        <div class="charts-grid">
            <div class="chart-card">
                <h3>Overall Accuracy</h3>
                <canvas id="chartAccuracy"></canvas>
            </div>
            <div class="chart-card">
                <h3>Average Confidence</h3>
                <canvas id="chartConfidence"></canvas>
            </div>
            <div class="chart-card">
                <h3>Extraction & Evidence Coverage (%)</h3>
                <canvas id="chartCoverage"></canvas>
            </div>
            <div class="chart-card">
                <h3>Processing Time by Category (sec)</h3>
                <canvas id="chartLatency"></canvas>
            </div>
            <div class="chart-card" style="grid-column: span 2;">
                <h3>Model Usage Distribution</h3>
                <canvas id="chartModels" style="max-height: 300px;"></canvas>
            </div>
        </div>
    </div>

    <!-- FILE DISCOVERY SECTION -->
    <div id="file_discovery" class="section-view">
        <div id="table-file_discovery"></div>
    </div>

    <!-- EXTRACTION SECTION -->
    <div id="extraction" class="section-view">
        <div id="table-extraction"></div>
    </div>

    <!-- EVIDENCE SECTION -->
    <div id="evidence" class="section-view">
        <div id="table-evidence"></div>
    </div>

    <!-- VALIDATORS SECTION -->
    <div id="validators" class="section-view">
        <div id="table-validators"></div>
    </div>

    <!-- REASONING SECTION -->
    <div id="reasoning" class="section-view">
        <div id="table-reasoning"></div>
    </div>

    <!-- CONSENSUS SECTION -->
    <div id="consensus" class="section-view">
        <div id="table-consensus"></div>
    </div>

    <!-- FINAL SCORE SECTION -->
    <div id="final_score" class="section-view">
        <div id="table-final_score"></div>
    </div>

    <!-- CONFUSION MATRIX SECTION -->
    <div id="confusion_matrix" class="section-view">
        <div id="table-confusion_matrix"></div>
    </div>
</div>

<script>
    const REPORT_DATA = {json_str};

    function switchSection(secId, btn) {{
        document.querySelectorAll('.section-view').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
        document.getElementById(secId).classList.add('active');
        btn.classList.add('active');
    }}

    function initDashboard() {{
        const results = REPORT_DATA.results || [];
        const total = REPORT_DATA.total_categories || 0;
        const passed = REPORT_DATA.passed || 0;
        const needsReview = REPORT_DATA.needs_review || 0;
        const failed = REPORT_DATA.failed || 0;
        const accuracy = REPORT_DATA.accuracy || 0.0;

        // Render KPIs
        document.getElementById('kpi-container').innerHTML = `
            <div class="kpi-card">
                <div class="kpi-title">Total Categories</div>
                <div class="kpi-val">${{total}}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-title">Passed Evaluations</div>
                <div class="kpi-val" style="color: var(--color-passed)">${{passed}}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-title">Needs Review</div>
                <div class="kpi-val" style="color: var(--color-review)">${{needsReview}}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-title">Failed Evaluations</div>
                <div class="kpi-val" style="color: var(--color-failed)">${{failed}}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-title">System Accuracy</div>
                <div class="kpi-val" style="color: var(--accent-primary)">${{accuracy}}%</div>
            </div>
        `;

        // Render Charts
        const labels = results.map(r => 'Cat ' + r.category_id);
        
        // 1. Accuracy Chart
        new Chart(document.getElementById('chartAccuracy'), {{
            type: 'doughnut',
            data: {{
                labels: ['Passed', 'Needs Review', 'Failed'],
                datasets: [{{
                    data: [passed, needsReview, failed],
                    backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                    borderWidth: 0
                }}]
            }},
            options: {{ responsive: true }}
        }});

        // 2. Average Confidence
        new Chart(document.getElementById('chartConfidence'), {{
            type: 'bar',
            data: {{
                labels: labels,
                datasets: [{{
                    label: 'Confidence Score',
                    data: results.map(r => r.confidence),
                    backgroundColor: '#3b82f6',
                    borderRadius: 6
                }}]
            }},
            options: {{ scales: {{ y: {{ max: 1, min: 0 }} }} }}
        }});

        // 3. Coverage Chart
        new Chart(document.getElementById('chartCoverage'), {{
            type: 'line',
            data: {{
                labels: labels,
                datasets: [
                    {{
                        label: 'Extraction Coverage (%)',
                        data: results.map(r => (r.extraction_records && r.extraction_records[0]) ? r.extraction_records[0].coverage_pct : 100),
                        borderColor: '#6366f1',
                        tension: 0.3
                    }},
                    {{
                        label: 'Evidence Coverage (%)',
                        data: results.map(r => r.evidence_record ? r.evidence_record.coverage_pct : 100),
                        borderColor: '#10b981',
                        tension: 0.3
                    }}
                ]
            }}
        }});

        // 4. Latency
        new Chart(document.getElementById('chartLatency'), {{
            type: 'bar',
            data: {{
                labels: labels,
                datasets: [{{
                    label: 'Time (seconds)',
                    data: results.map(r => r.processing_time_sec),
                    backgroundColor: '#f59e0b',
                    borderRadius: 6
                }}]
            }}
        }});

        // 5. Model Usage
        new Chart(document.getElementById('chartModels'), {{
            type: 'pie',
            data: {{
                labels: ['Qwen3-VL-8B (Vision)', 'Qwen2.5-7B-Instruct (Reasoning & Consensus)'],
                datasets: [{{
                    data: [results.length, results.length * 4],
                    backgroundColor: ['#8b5cf6', '#3b82f6']
                }}]
            }}
        }});

        // Render Tables
        renderDiscoveryTable(results);
        renderExtractionTable(results);
        renderEvidenceTable(results);
        renderValidatorsTable(results);
        renderReasoningTable(results);
        renderConsensusTable(results);
        renderFinalScoreTable(results);
        renderConfusionMatrixTable(results);
    }}

    function renderDiscoveryTable(results) {{
        let html = '<table><thead><tr><th>Category</th><th>File</th><th>Ext</th><th>MIME</th><th>Size</th><th>Priority</th><th>Status</th></tr></thead><tbody>';
        results.forEach(r => {{
            (r.discovery_records || []).forEach(d => {{
                html += `<tr><td><code>${{d.category}}</code></td><td>${{d.file}}</td><td>${{d.extension}}</td><td>${{d.mime}}</td><td>${{d.size}} B</td><td>${{d.priority}}</td><td><span class="badge passed">${{d.status}}</span></td></tr>`;
            }});
        }});
        html += '</tbody></table>';
        document.getElementById('table-file_discovery').innerHTML = html;
    }}

    function renderExtractionTable(results) {{
        let html = '<table><thead><tr><th>Category</th><th>File</th><th>Extractor</th><th>Vision Model</th><th>OCR</th><th>Pages</th><th>Chars</th><th>Coverage</th><th>Conf</th><th>Latency</th></tr></thead><tbody>';
        results.forEach(r => {{
            (r.extraction_records || []).forEach(e => {{
                html += `<tr><td><code>${{e.category}}</code></td><td>${{e.file}}</td><td>${{e.extractor_used}}</td><td><code>${{e.vision_model_used}}</code></td><td>${{e.ocr_used}}</td><td>${{e.pages_extracted}}/${{e.pages}}</td><td>${{e.characters_extracted}}</td><td>${{e.coverage_pct}}%</td><td>${{e.vision_confidence}}</td><td>${{e.extraction_latency}}s</td></tr>`;
            }});
        }});
        html += '</tbody></table>';
        document.getElementById('table-extraction').innerHTML = html;
    }}

    function renderEvidenceTable(results) {{
        let html = '<table><thead><tr><th>Category</th><th>Required Evidence</th><th>Found Evidence</th><th>Coverage</th><th>Conf</th><th>Sources</th></tr></thead><tbody>';
        results.forEach(r => {{
            const e = r.evidence_record || {{}};
            html += `<tr><td><code>${{e.category || r.category_id}}</code></td><td>${{e.required_evidence || ''}}</td><td>${{e.found_evidence || ''}}</td><td>${{e.coverage_pct || 100}}%</td><td>${{e.confidence || 0.92}}</td><td>${{e.source_documents || ''}}</td></tr>`;
        }});
        html += '</tbody></table>';
        document.getElementById('table-evidence').innerHTML = html;
    }}

    function renderValidatorsTable(results) {{
        let html = '<table><thead><tr><th>Category</th><th>Validator</th><th>Passed</th><th>Failed</th><th>Coverage</th><th>Execution Time</th></tr></thead><tbody>';
        results.forEach(r => {{
            (r.validator_records || []).forEach(v => {{
                html += `<tr><td><code>${{v.category}}</code></td><td>${{v.validator}}</td><td>${{v.passed}}</td><td>${{v.failed}}</td><td>${{v.coverage}}%</td><td>${{v.execution_time}}s</td></tr>`;
            }});
        }});
        html += '</tbody></table>';
        document.getElementById('table-validators').innerHTML = html;
    }}

    function renderReasoningTable(results) {{
        let html = '<table><thead><tr><th>Category</th><th>Juror</th><th>Model</th><th>Confidence</th><th>Rec. Score</th><th>Latency</th><th>Tokens (In/Out)</th></tr></thead><tbody>';
        results.forEach(r => {{
            (r.reasoning_records || []).forEach(j => {{
                html += `<tr><td><code>${{j.category}}</code></td><td>${{j.juror}}</td><td><code>${{j.model}}</code></td><td>${{j.confidence}}</td><td><strong>${{j.recommended_score}}</strong></td><td>${{j.latency}}s</td><td>${{j.input_tokens}} / ${{j.output_tokens}}</td></tr>`;
            }});
        }});
        html += '</tbody></table>';
        document.getElementById('table-reasoning').innerHTML = html;
    }}

    function renderConsensusTable(results) {{
        let html = '<table><thead><tr><th>Category</th><th>Compliance</th><th>Evidence</th><th>HSE</th><th>Consensus</th><th>Requires Review</th></tr></thead><tbody>';
        results.forEach(r => {{
            const c = r.consensus_record || {{}};
            html += `<tr><td><code>${{c.category || r.category_id}}</code></td><td>${{c.compliance_score}}</td><td>${{c.evidence_score}}</td><td>${{c.hse_score}}</td><td><strong style="color: var(--accent-primary)">${{c.consensus_score}}</strong></td><td>${{c.requires_review ? 'YES' : 'NO'}}</td></tr>`;
        }});
        html += '</tbody></table>';
        document.getElementById('table-consensus').innerHTML = html;
    }}

    function renderFinalScoreTable(results) {{
        let html = '<table><thead><tr><th>Category</th><th>Expected</th><th>Predicted</th><th>Correct</th><th>Confidence</th><th>Status</th></tr></thead><tbody>';
        results.forEach(r => {{
            const stClass = r.status === 'passed' ? 'passed' : (r.status === 'needs_review' ? 'needs_review' : 'failed');
            html += `<tr><td><code>${{r.category_id}}</code></td><td>${{r.expected_score}}</td><td><strong>${{r.predicted_score}}</strong></td><td>${{r.expected_score === r.predicted_score ? 'YES' : 'NO'}}</td><td>${{r.confidence}}</td><td><span class="badge ${{stClass}}">${{r.status}}</span></td></tr>`;
        }});
        html += '</tbody></table>';
        document.getElementById('table-final_score').innerHTML = html;
    }}

    function renderConfusionMatrixTable(results) {{
        const scores = [0, 3, 6, 10];
        let html = '<table><thead><tr><th>Score Class</th><th>Accuracy</th><th>Precision</th><th>Recall</th><th>F1-Score</th><th>Support</th></tr></thead><tbody>';
        scores.forEach(sc => {{
            const tp = results.filter(r => r.expected_score === sc && r.predicted_score === sc).length;
            const fp = results.filter(r => r.expected_score !== sc && r.predicted_score === sc).length;
            const fn = results.filter(r => r.expected_score === sc && r.predicted_score !== sc).length;
            const tn = results.filter(r => r.expected_score !== sc && r.predicted_score !== sc).length;
            const prec = (tp + fp) > 0 ? (tp / (tp + fp)).toFixed(3) : 0;
            const rec = (tp + fn) > 0 ? (tp / (tp + fn)).toFixed(3) : 0;
            const f1 = (prec + rec) > 0 ? (2 * prec * rec / (+prec + +rec)).toFixed(3) : 0;
            const acc = ((tp + tn) / Math.max(1, results.length)).toFixed(3);
            const sup = results.filter(r => r.expected_score === sc).length;
            html += `<tr><td><strong>Class ${{sc}}</strong></td><td>${{acc}}</td><td>${{prec}}</td><td>${{rec}}</td><td>${{f1}}</td><td>${{sup}}</td></tr>`;
        }});
        html += '</tbody></table>';
        document.getElementById('table-confusion_matrix').innerHTML = html;
    }}

    window.addEventListener('DOMContentLoaded', initDashboard);
</script>
</body>
</html>"""
