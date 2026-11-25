import os
import json
from typing import Dict, Any

VIEWER_HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CSMS AI Scoring Engine — Evaluation Report Viewer</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-primary: #0a0e17;
            --bg-secondary: #121826;
            --bg-card: rgba(22, 30, 46, 0.7);
            --border-color: rgba(255, 255, 255, 0.08);
            --text-primary: #f0f4f8;
            --text-secondary: #94a3b8;
            --text-muted: #64748b;
            --accent-primary: #3b82f6;
            --accent-glow: rgba(59, 130, 246, 0.3);
            
            --color-passed: #10b981;
            --bg-passed: rgba(16, 185, 129, 0.15);
            --border-passed: rgba(16, 185, 129, 0.3);
            
            --color-review: #f59e0b;
            --bg-review: rgba(245, 158, 11, 0.15);
            --border-review: rgba(245, 158, 11, 0.3);
            
            --color-failed: #ef4444;
            --bg-failed: rgba(239, 68, 68, 0.15);
            --border-failed: rgba(239, 68, 68, 0.3);
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: 'Outfit', sans-serif;
        }

        body {
            background-color: var(--bg-primary);
            color: var(--text-primary);
            min-height: 100vh;
            padding: 2rem;
            background-image: 
                radial-gradient(circle at 15% 15%, rgba(59, 130, 246, 0.08) 0%, transparent 40%),
                radial-gradient(circle at 85% 85%, rgba(16, 185, 129, 0.05) 0%, transparent 40%);
            background-attachment: fixed;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
        }

        header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2.5rem;
            padding-bottom: 1.5rem;
            border-bottom: 1px solid var(--border-color);
        }

        .title-area h1 {
            font-size: 2.2rem;
            font-weight: 700;
            background: linear-gradient(135deg, #fff 0%, #94a3b8 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 0.3rem;
        }

        .title-area p {
            color: var(--text-secondary);
            font-size: 0.95rem;
        }

        .meta-tag {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid var(--border-color);
            padding: 0.5rem 1rem;
            border-radius: 99px;
            font-size: 0.85rem;
            color: var(--text-secondary);
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        /* KPI Cards */
        .kpi-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2.5rem;
        }

        .kpi-card {
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: 16px;
            padding: 1.5rem;
            backdrop-filter: blur(12px);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .kpi-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
        }

        .kpi-title {
            color: var(--text-secondary);
            font-size: 0.9rem;
            font-weight: 500;
            margin-bottom: 0.5rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .kpi-value {
            font-size: 2.5rem;
            font-weight: 700;
            line-height: 1.1;
        }

        .kpi-card.passed .kpi-value { color: var(--color-passed); }
        .kpi-card.review .kpi-value { color: var(--color-review); }
        .kpi-card.failed .kpi-value { color: var(--color-failed); }
        .kpi-card.total .kpi-value { color: #fff; }

        /* Controls */
        .controls {
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: 16px;
            padding: 1.25rem;
            margin-bottom: 2rem;
            backdrop-filter: blur(12px);
            display: flex;
            flex-wrap: wrap;
            gap: 1.25rem;
            justify-content: space-between;
            align-items: center;
        }

        .search-box {
            flex: 1;
            min-width: 260px;
            position: relative;
        }

        .search-box input {
            width: 100%;
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 10px;
            padding: 0.75rem 1rem 0.75rem 2.5rem;
            color: var(--text-primary);
            font-size: 0.95rem;
            outline: none;
            transition: border-color 0.2s;
        }

        .search-box input:focus {
            border-color: var(--accent-primary);
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
        }

        .search-box::before {
            content: '🔍';
            position: absolute;
            left: 0.85rem;
            top: 50%;
            transform: translateY(-50%);
            font-size: 0.9rem;
            opacity: 0.6;
        }

        .filters {
            display: flex;
            gap: 0.5rem;
            flex-wrap: wrap;
        }

        .btn-filter {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            color: var(--text-secondary);
            padding: 0.6rem 1.25rem;
            border-radius: 8px;
            cursor: pointer;
            font-size: 0.9rem;
            font-weight: 500;
            transition: all 0.2s;
        }

        .btn-filter:hover {
            color: #fff;
            border-color: rgba(255, 255, 255, 0.2);
        }

        .btn-filter.active {
            background: var(--accent-primary);
            color: #fff;
            border-color: var(--accent-primary);
            box-shadow: 0 0 15px var(--accent-glow);
        }

        .sort-box {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .sort-box label {
            color: var(--text-secondary);
            font-size: 0.9rem;
        }

        .sort-box select {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            color: var(--text-primary);
            padding: 0.6rem 2rem 0.6rem 1rem;
            border-radius: 8px;
            outline: none;
            cursor: pointer;
            font-size: 0.9rem;
        }

        /* Results Grid */
        .results-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 1rem;
        }

        .cat-card {
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: 14px;
            overflow: hidden;
            backdrop-filter: blur(12px);
            transition: all 0.2s ease;
        }

        .cat-card:hover {
            border-color: rgba(255, 255, 255, 0.18);
        }

        .cat-header {
            padding: 1.25rem 1.5rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
            user-select: none;
        }

        .cat-title-group {
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        .cat-badge {
            font-family: 'JetBrains Mono', monospace;
            font-size: 1rem;
            font-weight: 600;
            padding: 0.4rem 0.8rem;
            border-radius: 8px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid var(--border-color);
        }

        .cat-name {
            font-size: 1.15rem;
            font-weight: 600;
            color: #fff;
        }

        .cat-metrics {
            display: flex;
            align-items: center;
            gap: 1.5rem;
        }

        .metric-pill {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
        }

        .metric-label {
            font-size: 0.75rem;
            color: var(--text-muted);
            text-transform: uppercase;
        }

        .metric-val {
            font-size: 1.05rem;
            font-weight: 600;
            font-family: 'JetBrains Mono', monospace;
        }

        .status-tag {
            padding: 0.4rem 1rem;
            border-radius: 99px;
            font-size: 0.85rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            display: flex;
            align-items: center;
            gap: 0.4rem;
        }

        .status-tag.passed { background: var(--bg-passed); color: var(--color-passed); border: 1px solid var(--border-passed); }
        .status-tag.needs_review { background: var(--bg-review); color: var(--color-review); border: 1px solid var(--border-review); }
        .status-tag.failed { background: var(--bg-failed); color: var(--color-failed); border: 1px solid var(--border-failed); }

        .chevron {
            transition: transform 0.3s ease;
            color: var(--text-secondary);
            font-size: 1.2rem;
        }

        .cat-card.expanded .chevron {
            transform: rotate(180deg);
        }

        .cat-body {
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.35s cubic-bezier(0, 1, 0, 1);
            background: rgba(10, 14, 23, 0.4);
            border-top: 1px solid transparent;
        }

        .cat-card.expanded .cat-body {
            max-height: 2000px;
            border-top-color: var(--border-color);
            transition: max-height 0.5s ease-in-out;
        }

        .body-content {
            padding: 1.5rem;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1.5rem;
        }

        @media (max-width: 900px) {
            .body-content { grid-template-columns: 1fr; }
            .cat-header { flex-direction: column; align-items: flex-start; gap: 1rem; }
            .cat-metrics { width: 100%; justify-content: space-between; }
        }

        .section-box {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 10px;
            padding: 1.25rem;
        }

        .section-title {
            font-size: 0.9rem;
            font-weight: 600;
            color: var(--accent-primary);
            margin-bottom: 0.8rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .item-list {
            list-style: none;
            display: flex;
            flex-direction: column;
            gap: 0.6rem;
        }

        .item-list li {
            font-size: 0.9rem;
            color: var(--text-secondary);
            line-height: 1.4;
            padding-left: 1.2rem;
            position: relative;
        }

        .item-list li::before {
            content: '▸';
            position: absolute;
            left: 0;
            color: var(--text-muted);
        }

        .empty-state {
            text-align: center;
            padding: 4rem;
            color: var(--text-secondary);
            font-size: 1.1rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <div class="title-area">
                <h1>AI Scoring Platform — Evaluation Viewer</h1>
                <p>Marine Contractor Safety Management System (CSMS) Automated Audit Results</p>
            </div>
            <div class="meta-tag" id="meta-info">
                <span>⏱️ Loaded Report</span>
            </div>
        </header>

        <section class="kpi-grid">
            <div class="kpi-card total">
                <div class="kpi-title">Total Categories</div>
                <div class="kpi-value" id="kpi-total">0</div>
            </div>
            <div class="kpi-card passed">
                <div class="kpi-title">Passed (Correct)</div>
                <div class="kpi-value" id="kpi-passed">0</div>
            </div>
            <div class="kpi-card review">
                <div class="kpi-title">Needs Review</div>
                <div class="kpi-value" id="kpi-review">0</div>
            </div>
            <div class="kpi-card failed">
                <div class="kpi-title">Failed / Mismatch</div>
                <div class="kpi-value" id="kpi-failed">0</div>
            </div>
        </section>

        <section class="controls">
            <div class="search-box">
                <input type="text" id="search-input" placeholder="Search by category ID, folder name, or reasoning...">
            </div>
            <div class="filters">
                <button class="btn-filter active" data-filter="all">All Results</button>
                <button class="btn-filter" data-filter="passed">Passed</button>
                <button class="btn-filter" data-filter="needs_review">Needs Review</button>
                <button class="btn-filter" data-filter="failed">Failed</button>
            </div>
            <div class="sort-box">
                <label for="sort-select">Sort by:</label>
                <select id="sort-select">
                    <option value="id">Category ID</option>
                    <option value="score">Predicted Score</option>
                    <option value="confidence">Confidence</option>
                    <option value="time">Processing Time</option>
                </select>
            </div>
        </section>

        <section class="results-grid" id="results-container">
            <div class="empty-state">Loading evaluation data...</div>
        </section>
    </div>

    <!-- Fallback embedded data script -->
    <script src="report_data.js"></script>
    <script>
        let rawData = null;
        let activeFilter = 'all';
        let activeSort = 'id';
        let searchQuery = '';

        async function init() {
            if (window.EVALUATION_REPORT_DATA) {
                rawData = window.EVALUATION_REPORT_DATA;
                renderApp();
            } else {
                try {
                    const response = await fetch('evaluation_report.json');
                    rawData = await response.json();
                    renderApp();
                } catch (e) {
                    document.getElementById('results-container').innerHTML = 
                        `<div class="empty-state">⚠️ Could not load report data. Please ensure report_data.js or evaluation_report.json is present.</div>`;
                }
            }
        }

        function renderApp() {
            if (!rawData) return;
            
            // Update KPIs
            document.getElementById('kpi-total').textContent = rawData.total_categories || 0;
            document.getElementById('kpi-passed').textContent = rawData.passed || 0;
            document.getElementById('kpi-review').textContent = rawData.needs_review || 0;
            document.getElementById('kpi-failed').textContent = rawData.failed || 0;
            document.getElementById('meta-info').innerHTML = `<span>📅 ${rawData.timestamp || 'Latest'} | 🎯 Accuracy: <b>${rawData.accuracy || 0}%</b></span>`;

            filterAndSort();
        }

        function filterAndSort() {
            if (!rawData || !rawData.results) return;

            let filtered = rawData.results.filter(item => {
                const matchesFilter = activeFilter === 'all' || item.status === activeFilter;
                const query = searchQuery.toLowerCase();
                const matchesSearch = !query || 
                    (item.category_id && item.category_id.toLowerCase().includes(query)) ||
                    (item.folder_name && item.folder_name.toLowerCase().includes(query)) ||
                    (item.reasoning && item.reasoning.some(r => r.toLowerCase().includes(query)));
                return matchesFilter && matchesSearch;
            });

            // Sort
            filtered.sort((a, b) => {
                if (activeSort === 'id') {
                    const partsA = (a.category_id || '0').split('.').map(Number);
                    const partsB = (b.category_id || '0').split('.').map(Number);
                    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
                        const valA = partsA[i] || 0;
                        const valB = partsB[i] || 0;
                        if (valA !== valB) return valA - valB;
                    }
                    return 0;
                } else if (activeSort === 'score') {
                    return (b.predicted_score || 0) - (a.predicted_score || 0);
                } else if (activeSort === 'confidence') {
                    return (b.confidence || 0) - (a.confidence || 0);
                } else if (activeSort === 'time') {
                    return (b.processing_time_sec || 0) - (a.processing_time_sec || 0);
                }
                return 0;
            });

            renderGrid(filtered);
        }

        function renderGrid(items) {
            const container = document.getElementById('results-container');
            if (items.length === 0) {
                container.innerHTML = `<div class="empty-state">No matching category evaluations found.</div>`;
                return;
            }

            container.innerHTML = items.map((item, index) => {
                const statusClass = item.status || 'failed';
                const statusLabel = statusClass === 'passed' ? '✅ Passed' : (statusClass === 'needs_review' ? '⚠️ Review' : '❌ Failed');
                
                const reasoningHTML = (item.reasoning && item.reasoning.length) ? 
                    item.reasoning.map(r => `<li>${r}</li>`).join('') : '<li>No reasoning details provided.</li>';
                    
                const evidenceHTML = (item.evidence_found && item.evidence_found.length) ? 
                    item.evidence_found.map(e => `<li>${e}</li>`).join('') : '<li>No explicit evidence markers logged.</li>';
                    
                const missingHTML = (item.missing_evidence && item.missing_evidence.length) ? 
                    item.missing_evidence.map(m => `<li>${m}</li>`).join('') : '<li>No missing evidence flagged.</li>';

                const errorsHTML = (item.errors && item.errors.length) ? 
                    `<div class="section-box" style="border-color: var(--border-failed); grid-column: 1 / -1;">
                        <div class="section-title" style="color: var(--color-failed);">⚠️ Errors & Warnings</div>
                        <ul class="item-list">${item.errors.map(err => `<li>${err}</li>`).join('')}</ul>
                    </div>` : '';

                return `
                <div class="cat-card" id="card-${index}">
                    <div class="cat-header" onclick="toggleCard(${index})">
                        <div class="cat-title-group">
                            <span class="cat-badge">${item.category_id || 'N/A'}</span>
                            <span class="cat-name">${item.folder_name || 'Unnamed Category'}</span>
                        </div>
                        <div class="cat-metrics">
                            <div class="metric-pill">
                                <span class="metric-label">Score</span>
                                <span class="metric-val">${item.predicted_score} / ${item.expected_score}</span>
                            </div>
                            <div class="metric-pill">
                                <span class="metric-label">Confidence</span>
                                <span class="metric-val">${((item.confidence || 0) * 100).toFixed(0)}%</span>
                            </div>
                            <div class="metric-pill">
                                <span class="metric-label">Evidence</span>
                                <span class="metric-val">${item.evidence_count || 0} docs</span>
                            </div>
                            <div class="metric-pill">
                                <span class="metric-label">Time</span>
                                <span class="metric-val">${item.processing_time_sec || 0}s</span>
                            </div>
                            <span class="status-tag ${statusClass}">${statusLabel}</span>
                            <span class="chevron">▼</span>
                        </div>
                    </div>
                    <div class="cat-body">
                        <div class="body-content">
                            <div class="section-box">
                                <div class="section-title">🧠 AI Reasoning</div>
                                <ul class="item-list">${reasoningHTML}</ul>
                            </div>
                            <div class="section-box">
                                <div class="section-title">📄 Verified Evidence</div>
                                <ul class="item-list">${evidenceHTML}</ul>
                            </div>
                            <div class="section-box" style="grid-column: 1 / -1;">
                                <div class="section-title" style="color: var(--color-review);">❓ Missing Evidence / Gaps</div>
                                <ul class="item-list">${missingHTML}</ul>
                            </div>
                            ${errorsHTML}
                        </div>
                    </div>
                </div>`;
            }).join('');
        }

        function toggleCard(index) {
            const card = document.getElementById(`card-${index}`);
            card.classList.toggle('expanded');
        }

        // Event Listeners
        document.getElementById('search-input').addEventListener('input', (e) => {
            searchQuery = e.target.value;
            filterAndSort();
        });

        document.querySelectorAll('.btn-filter').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                activeFilter = btn.dataset.filter;
                filterAndSort();
            });
        });

        document.getElementById('sort-select').addEventListener('change', (e) => {
            activeSort = e.target.value;
            filterAndSort();
        });

        init();
    </script>
</body>
</html>
"""

def generate_html_viewer(report_data: Dict[str, Any], viewer_dir: str = None):
    if not viewer_dir:
        viewer_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "viewer"))
    os.makedirs(viewer_dir, exist_ok=True)
    
    html_path = os.path.join(viewer_dir, "index.html")
    js_path = os.path.join(viewer_dir, "report_data.js")
    
    # Write HTML template
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(VIEWER_HTML_TEMPLATE)
        
    # Write embedded data JS
    js_content = f"window.EVALUATION_REPORT_DATA = {json.dumps(report_data, indent=4)};\n"
    with open(js_path, "w", encoding="utf-8") as f:
        f.write(js_content)
        
    print(f"🌟 HTML Viewer generated at: {html_path}")

if __name__ == "__main__":
    sample_data = {
        "timestamp": "2026-07-04 16:30:00",
        "total_categories": 2,
        "passed": 1,
        "needs_review": 1,
        "failed": 0,
        "accuracy": 100.0,
        "results": [
            {
                "category_id": "3.5",
                "folder_name": "3.5 Pengelolaan K3LL Kontraktor",
                "expected_score": 10,
                "predicted_score": 10,
                "confidence": 0.95,
                "status": "passed",
                "evidence_count": 4,
                "evidence_found": ["Valid HSE plan document found.", "Emergency response procedure verified."],
                "missing_evidence": [],
                "reasoning": ["All criteria satisfied mathematically."],
                "processing_time_sec": 2.45,
                "errors": [],
                "warnings": []
            },
            {
                "category_id": "8.2",
                "folder_name": "8.2 Evaluasi Hasil Audit",
                "expected_score": 10,
                "predicted_score": 10,
                "confidence": 0.65,
                "status": "needs_review",
                "evidence_count": 1,
                "evidence_found": ["Audit schedule found."],
                "missing_evidence": ["Missing management sign-off on audit findings."],
                "reasoning": ["Audit schedule present but sign-off unclear."],
                "processing_time_sec": 1.80,
                "errors": [],
                "warnings": ["Unsupported extension: .xyz"]
            }
        ]
    }
    generate_html_viewer(sample_data)
