"""
HTML Viewer Generator for CSMS AI Scoring Results

Generates standalone HTML files for viewing single category and batch evaluation results.
"""
import os
import json
from typing import Dict, Any, List
from datetime import datetime


class HTMLGenerator:
    """Generates standalone HTML viewers for CSMS evaluation results."""
    
    @staticmethod
    def generate_single_category_html(result: Dict[str, Any], output_path: str = None) -> str:
        """
        Generate HTML viewer for single category evaluation.
        
        Args:
            result: Evaluation result dict from score_category()
            output_path: Optional path to save HTML file
            
        Returns:
            HTML content as string
        """
        category_id = result.get("category_id", "Unknown")
        folder_name = result.get("folder_name", "Unknown")
        
        # Extract key metrics
        expected_score = result.get("expected_score", 0)
        compliance_score = result.get("compliance_score", 0)
        evidence_score = result.get("evidence_score", 0)
        hse_score = result.get("hse_score", 0)
        consensus_score = result.get("consensus_score", 0)
        final_score = result.get("final_score", consensus_score)
        
        confidence = result.get("confidence", 0)
        status = result.get("status", "unknown")
        processing_time = result.get("processing_time_sec", 0)
        
        # Evidence tracking
        evidence_count = result.get("evidence_count", 0)
        evidence_found = result.get("evidence_found", [])
        missing_evidence = result.get("missing_evidence", [])
        
        # Reasoning
        final_reasoning = result.get("final_reasoning", "")
        reasoning_records = result.get("reasoning_records", [])
        
        # AI Recommendations
        ai_rec = result.get("ai_recommendation_for_excellent_score", {})
        recommendations = ai_rec.get("recommendations", [])
        required_docs = ai_rec.get("required_documents", [])
        improvement_areas = ai_rec.get("improvement_areas", [])
        
        # Metadata
        start_date = result.get("start_date", "N/A")
        end_date = result.get("end_date", "N/A")
        company = result.get("company", "agnostic")
        chunking_mode = result.get("chunking_mode", "memory_only")
        
        # Generate juror reasoning HTML
        juror_html = ""
        for record in reasoning_records:
            juror_name = record.get("juror", "Unknown")
            score = record.get("recommended_score", 0)
            conf = record.get("confidence", 0)
            reasoning = record.get("reasoning", [])
            
            if isinstance(reasoning, list):
                reasoning_text = "<br>".join(reasoning)
            else:
                reasoning_text = str(reasoning)
            
            juror_html += f"""
            <div class="juror-card">
                <h4>{juror_name}</h4>
                <div class="score-badge score-{score}">{score}/10</div>
                <div class="confidence">Confidence: {conf:.2f}</div>
                <div class="reasoning">{reasoning_text}</div>
            </div>
            """
        
        # Generate recommendations HTML
        rec_html = ""
        if recommendations:
            rec_items = "".join([f"<li>{rec}</li>" for rec in recommendations[:10]])
            rec_html = f"""
            <div class="recommendations">
                <h3>🎯 Recommendations for Score 10</h3>
                <ul>{rec_items}</ul>
            </div>
            """
        
        if required_docs:
            doc_items = "".join([f"<li>{doc}</li>" for doc in required_docs[:10]])
            rec_html += f"""
            <div class="required-docs">
                <h4>📋 Required Documents</h4>
                <ul>{doc_items}</ul>
            </div>
            """
        
        if improvement_areas:
            imp_items = "".join([f"<li>{imp}</li>" for imp in improvement_areas[:5]])
            rec_html += f"""
            <div class="improvements">
                <h4>🔧 Improvement Areas</h4>
                <ul>{imp_items}</ul>
            </div>
            """
        
        # Generate evidence found HTML
        evidence_found_html = ""
        if evidence_found:
            ev_items = "".join([f"<li>{ev[:150]}...</li>" for ev in evidence_found[:10]])
            evidence_found_html = f"""
            <div class="evidence-found">
                <h4>Evidence Found ({len(evidence_found)} items)</h4>
                <ul>{ev_items}</ul>
            </div>
            """
        
        # Generate missing evidence HTML
        missing_html = ""
        if missing_evidence:
            miss_items = "".join([f"<li>{miss}</li>" for miss in missing_evidence[:10]])
            missing_html = f"""
            <div class="missing-evidence">
                <h4>Missing Evidence ({len(missing_evidence)} items)</h4>
                <ul>{miss_items}</ul>
            </div>
            """
        
        html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CSMS AI Scoring - Category {category_id}</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            color: #333;
        }}
        .container {{
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            overflow: hidden;
        }}
        .header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }}
        .header h1 {{
            font-size: 2em;
            margin-bottom: 10px;
        }}
        .header p {{
            opacity: 0.9;
            font-size: 1.1em;
        }}
        .metadata {{
            background: #f8f9fa;
            padding: 20px;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            border-bottom: 2px solid #e9ecef;
        }}
        .metadata-item {{
            display: flex;
            flex-direction: column;
        }}
        .metadata-label {{
            font-size: 0.85em;
            color: #6c757d;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}
        .metadata-value {{
            font-size: 1.1em;
            font-weight: 600;
            color: #495057;
        }}
        .content {{
            padding: 30px;
        }}
        .section {{
            margin-bottom: 30px;
        }}
        .section h2 {{
            color: #495057;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #dee2e6;
        }}
        .scores-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }}
        .score-card {{
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            border: 2px solid #dee2e6;
        }}
        .score-card.final {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
        }}
        .score-label {{
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 10px;
        }}
        .score-value {{
            font-size: 2.5em;
            font-weight: bold;
        }}
        .score-badge {{
            display: inline-block;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 1.2em;
        }}
        .score-0 {{ background: #dc3545; color: white; }}
        .score-3 {{ background: #ffc107; color: #212529; }}
        .score-6 {{ background: #28a745; color: white; }}
        .score-10 {{ background: #007bff; color: white; }}
        .juror-card {{
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 15px;
            border-left: 4px solid #667eea;
        }}
        .juror-card h4 {{
            color: #495057;
            margin-bottom: 10px;
        }}
        .confidence {{
            color: #6c757d;
            font-size: 0.9em;
            margin-bottom: 10px;
        }}
        .reasoning {{
            background: white;
            padding: 15px;
            border-radius: 4px;
            margin-top: 10px;
            font-size: 0.95em;
            line-height: 1.6;
        }}
        .recommendations {{
            background: #e7f3ff;
            padding: 25px;
            border-radius: 8px;
            margin-top: 20px;
            border-left: 4px solid #007bff;
        }}
        .recommendations h3 {{
            color: #0056b3;
            margin-bottom: 15px;
        }}
        .recommendations ul {{
            margin-left: 20px;
        }}
        .recommendations li {{
            margin-bottom: 10px;
            line-height: 1.6;
        }}
        .required-docs, .improvements {{
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-top: 15px;
        }}
        .evidence-found, .missing-evidence {{
            background: #fff3cd;
            padding: 20px;
            border-radius: 8px;
            margin-top: 15px;
        }}
        .missing-evidence {{
            background: #f8d7da;
            border-left: 4px solid #dc3545;
        }}
        .evidence-found {{
            background: #d4edda;
            border-left: 4px solid #28a745;
        }}
        ul {{
            margin-left: 20px;
        }}
        li {{
            margin-bottom: 8px;
            line-height: 1.5;
        }}
        .footer {{
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            color: #6c757d;
            font-size: 0.9em;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>CSMS AI Scoring Report</h1>
            <p>Category {category_id}: {folder_name}</p>
        </div>
        
        <div class="metadata">
            <div class="metadata-item">
                <span class="metadata-label">Status</span>
                <span class="metadata-value">{status.upper()}</span>
            </div>
            <div class="metadata-item">
                <span class="metadata-label">Confidence</span>
                <span class="metadata-value">{confidence:.2f}</span>
            </div>
            <div class="metadata-item">
                <span class="metadata-label">Processing Time</span>
                <span class="metadata-value">{processing_time:.1f}s</span>
            </div>
            <div class="metadata-item">
                <span class="metadata-label">Evidence Count</span>
                <span class="metadata-value">{evidence_count} files</span>
            </div>
            <div class="metadata-item">
                <span class="metadata-label">Company</span>
                <span class="metadata-value">{company}</span>
            </div>
            <div class="metadata-item">
                <span class="metadata-label">Period</span>
                <span class="metadata-value">{start_date} to {end_date}</span>
            </div>
            <div class="metadata-item">
                <span class="metadata-label">Chunking Mode</span>
                <span class="metadata-value">{chunking_mode}</span>
            </div>
            <div class="metadata-item">
                <span class="metadata-label">Generated</span>
                <span class="metadata-value">{datetime.now().strftime("%Y-%m-%d %H:%M")}</span>
            </div>
        </div>
        
        <div class="content">
            <div class="section">
                <h2>📊 Scoring Summary</h2>
                <div class="scores-grid">
                    <div class="score-card">
                        <div class="score-label">Expected</div>
                        <div class="score-value">{expected_score}/10</div>
                    </div>
                    <div class="score-card">
                        <div class="score-label">Compliance</div>
                        <div class="score-value">{compliance_score}/10</div>
                    </div>
                    <div class="score-card">
                        <div class="score-label">Evidence</div>
                        <div class="score-value">{evidence_score}/10</div>
                    </div>
                    <div class="score-card">
                        <div class="score-label">HSE</div>
                        <div class="score-value">{hse_score}/10</div>
                    </div>
                    <div class="score-card final">
                        <div class="score-label">Final Score</div>
                        <div class="score-value">{final_score}/10</div>
                    </div>
                </div>
            </div>
            
            <div class="section">
                <h2>🔍 AI Juror Reasoning</h2>
                {juror_html}
            </div>
            
            <div class="section">
                <h2>📝 Final Reasoning</h2>
                <div class="reasoning">{final_reasoning}</div>
            </div>
            
            <div class="section">
                <h2>📄 Evidence Analysis</h2>
                {evidence_found_html}
                {missing_html}
            </div>
            
            <div class="section">
                <h2>💡 AI Recommendations</h2>
                {rec_html}
            </div>
        </div>
        
        <div class="footer">
            <p>CSMS AI Scoring Engine | Generated on {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}</p>
        </div>
    </div>
</body>
</html>
"""
        
        if output_path:
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(html_content)
        
        return html_content
    
    @staticmethod
    def generate_batch_html(results: List[Dict[str, Any]], output_path: str = None, company_info: Dict[str, Any] = None, config: Any = None) -> str:
        """
        Generate rich HTML viewer for batch evaluation results.
        
        Args:
            results: List of evaluation result dicts
            output_path: Optional path to save HTML file
            company_info: Optional dictionary containing metadata (title, dates, company, etc.)
            config: Optional EvaluationConfig instance
            
        Returns:
            HTML content as string
        """
        first_result = results[0] if results else {}
        
        # Resolve company_info
        if not company_info:
            company_info = first_result.get("company_info") or {}
            
        project_title = company_info.get("title") or "CSMS Assessment"
        company_name = company_info.get("company") or first_result.get("company") or "PT Newport Marine Services"
        eval_date = company_info.get("evaluation_date") or "N/A"
        date_start = company_info.get("date_start") or first_result.get("start_date") or "N/A"
        date_end = company_info.get("date_end") or first_result.get("end_date") or "N/A"
        category_scope = company_info.get("category") or "marine"
        chunking_mode = first_result.get("chunking_mode") or "memory_only"
        
        juror_model = first_result.get("model") or "Qwen2.5-7B-Instruct"
        consensus_model = first_result.get("consensus_record", {}).get("model") or "Qwen2.5-7B-Instruct"
        
        # Calculate summary statistics
        total = len(results)
        exact_matches = sum(1 for r in results if r.get("final_score") == r.get("expected_score"))
        discrepancies = total - exact_matches
        passed_count = sum(1 for r in results if r.get("status") == "passed")
        avg_score = sum(r.get("final_score", 0) for r in results) / total if total > 0 else 0
        avg_expected = sum(r.get("expected_score", 0) for r in results) / total if total > 0 else 0
        avg_confidence = sum(r.get("confidence", 0) for r in results) / total if total > 0 else 0
        total_time_sec = sum(r.get("processing_time_sec", 0) for r in results)
        
        # Group by parent category
        grouped = {}
        for r in results:
            cat_id = str(r.get("category_id", "?"))
            parts = cat_id.split('.')
            parent_id = parts[0]
            if parent_id not in grouped:
                grouped[parent_id] = {"children": [], "is_standalone": True, "parent_result": None}
                
            if len(parts) > 1:
                grouped[parent_id]["children"].append(r)
                grouped[parent_id]["is_standalone"] = False
            else:
                grouped[parent_id]["parent_result"] = r
                
        parent_keys = sorted(grouped.keys(), key=lambda x: int(x) if x.isdigit() else 999)
        
        # Helper to generate badge
        def make_score_badge(score_val):
            try:
                num = float(score_val)
                score_int = int(round(num))
                # Map to closest discrete color class
                if score_int >= 10:
                    cls = "score-10"
                elif score_int >= 6:
                    cls = "score-6"
                elif score_int >= 3:
                    cls = "score-3"
                else:
                    cls = "score-0"
                display_str = f"{num:.1f}/10" if num % 1 != 0 else f"{score_int}/10"
                return f'<span class="score-badge {cls}">{display_str}</span>'
            except Exception:
                return f'<span class="score-badge score-0">{score_val}</span>'

        table_rows = ""
        for p_id in parent_keys:
            group = grouped[p_id]
            is_standalone = group["is_standalone"]
            
            if is_standalone and group["parent_result"]:
                r = group["parent_result"]
                cat_id = r.get("category_id", "?")
                folder = r.get("folder_name", f"Category {cat_id}")
                expected = r.get("expected_score", 0)
                final = r.get("final_score", 0)
                comp = r.get("compliance_score", 0)
                ev = r.get("evidence_score", 0)
                hse = r.get("hse_score", 0)
                conf = r.get("confidence", 0)
                status = r.get("status", "completed")
                time_sec = r.get("processing_time_sec", 0)
                is_match = (expected == final)
                match_class = "match-yes" if is_match else "match-no"
                match_icon = '<span class="match-badge match-yes">✅ Match</span>' if is_match else '<span class="match-badge match-no">❌ Discrepancy</span>'
                
                comp_reasons = r.get("consensus_record", {}).get("reasoning") or r.get("reasoning") or ""
                reasons_records = r.get("reasoning_records", [])
                comp_juror_r = next((x.get("reasoning", "") for x in reasons_records if "Compliance" in x.get("juror", "")), "")
                ev_juror_r = next((x.get("reasoning", "") for x in reasons_records if "Evidence" in x.get("juror", "")), "")
                hse_juror_r = next((x.get("reasoning", "") for x in reasons_records if "HSE" in x.get("juror", "")), "")
                recommendations = r.get("ai_recommendation_for_excellent_score", {}).get("recommendations", [])
                missing_ev = r.get("missing_evidence", [])
                single_html = f"category_{cat_id}.html"

                row_id = f"row_{cat_id.replace('.', '_')}"
                
                table_rows += f"""
                <tr class="category-row {match_class} parent-row" data-cat="{cat_id}" data-name="{folder}">
                    <td><strong>{cat_id}</strong></td>
                    <td>
                        <div class="folder-title"><strong>{folder}</strong></div>
                        <a href="{single_html}" class="single-link" target="_blank">View Detailed Log ↗</a>
                    </td>
                    <td>{make_score_badge(expected)}</td>
                    <td>{make_score_badge(comp)}</td>
                    <td>{make_score_badge(ev)}</td>
                    <td>{make_score_badge(hse)}</td>
                    <td><strong>{make_score_badge(final)}</strong></td>
                    <td><span class="conf-pill">{conf:.2f}</span></td>
                    <td>{match_icon}</td>
                    <td><span class="status-badge status-{status}">{status.upper()}</span></td>
                    <td>{time_sec:.1f}s</td>
                    <td>
                        <button class="toggle-btn" onclick="toggleDetails('{row_id}')">Details ▾</button>
                    </td>
                </tr>
                <tr id="{row_id}" class="details-row" style="display: none;">
                    <td colspan="12">
                        <div class="details-card">
                            <div class="details-grid">
                                <div class="detail-box">
                                    <h4>⚖️ Compliance Juror</h4>
                                    <p>{comp_juror_r or 'Evaluated based on formal criteria.'}</p>
                                </div>
                                <div class="detail-box">
                                    <h4>📑 Evidence Juror</h4>
                                    <p>{ev_juror_r or 'Evaluated based on document completeness.'}</p>
                                </div>
                                <div class="detail-box">
                                    <h4>🛡️ HSE Juror</h4>
                                    <p>{hse_juror_r or 'Evaluated based on practical safety implementation.'}</p>
                                </div>
                            </div>
                            <div class="consensus-box">
                                <h4>🤝 Consensus & Recommendations for Score 10</h4>
                                <p><strong>Consensus Reasoning:</strong> {r.get('final_reasoning') or r.get('reasoning') or 'Standard consensus resolution.'}</p>
                                {('<div class="rec-list"><strong>Key Improvements Needed:</strong><ul>' + ''.join(f'<li>{rec}</li>' for rec in recommendations[:3]) + '</ul></div>') if recommendations else ''}
                            </div>
                        </div>
                    </td>
                </tr>
                """
            else:
                children = group["children"]
                children.sort(key=lambda x: [int(p) if p.isdigit() else 0 for p in str(x.get("category_id", "0")).split('.')])
                c_count = len(children)
                
                avg_expected_p = round(sum(c.get("expected_score", 0) for c in children) / c_count, 1) if c_count else 0
                avg_final_p = round(sum(c.get("final_score", 0) for c in children) / c_count, 1) if c_count else 0
                avg_comp_p = round(sum(c.get("compliance_score", 0) for c in children) / c_count, 1) if c_count else 0
                avg_ev_p = round(sum(c.get("evidence_score", 0) for c in children) / c_count, 1) if c_count else 0
                avg_hse_p = round(sum(c.get("hse_score", 0) for c in children) / c_count, 1) if c_count else 0
                avg_conf_p = sum(c.get("confidence", 0) for c in children) / c_count if c_count else 0
                total_time_p = sum(c.get("processing_time_sec", 0) for c in children)
                
                parent_match = (avg_expected_p == avg_final_p)
                parent_match_class = "match-yes" if parent_match else "match-no"
                parent_match_icon = '<span class="match-badge match-yes">✅ Match</span>' if parent_match else '<span class="match-badge match-partial">⚠️ Variance</span>'

                # Render Parent Group Header Row
                parent_title = children[0].get("folder_name", f"Category {p_id}").split(' - ')[0] if ' - ' in children[0].get("folder_name", "") else f"Category {p_id} Group"
                
                table_rows += f"""
                <tr class="category-row parent-group-header {parent_match_class}" data-cat="{p_id}" data-name="{parent_title}">
                    <td><strong>{p_id} ▾</strong></td>
                    <td>
                        <strong>{parent_title} (Aggregate of {c_count} Subcategories)</strong>
                    </td>
                    <td>{make_score_badge(avg_expected_p)}</td>
                    <td>{make_score_badge(avg_comp_p)}</td>
                    <td>{make_score_badge(avg_ev_p)}</td>
                    <td>{make_score_badge(avg_hse_p)}</td>
                    <td><strong>{make_score_badge(avg_final_p)}</strong></td>
                    <td><span class="conf-pill">{avg_conf_p:.2f}</span></td>
                    <td>{parent_match_icon}</td>
                    <td><span class="status-badge status-completed">COMPLETED</span></td>
                    <td>{total_time_p:.1f}s</td>
                    <td>
                        <button class="toggle-btn" onclick="toggleParentGroup('{p_id}')">Subcategories ▾</button>
                    </td>
                </tr>
                """
                
                # Render Child Rows
                for r in children:
                    cat_id = r.get("category_id", "?")
                    folder = r.get("folder_name", "Unknown")
                    expected = r.get("expected_score", 0)
                    final = r.get("final_score", 0)
                    comp = r.get("compliance_score", 0)
                    ev = r.get("evidence_score", 0)
                    hse = r.get("hse_score", 0)
                    conf = r.get("confidence", 0)
                    status = r.get("status", "completed")
                    time_sec = r.get("processing_time_sec", 0)
                    is_match = (expected == final)
                    match_class = "match-yes" if is_match else "match-no"
                    match_icon = '<span class="match-badge match-yes">✅ Match</span>' if is_match else '<span class="match-badge match-no">❌ Discrepancy</span>'
                    
                    reasons_records = r.get("reasoning_records", [])
                    comp_juror_r = next((x.get("reasoning", "") for x in reasons_records if "Compliance" in x.get("juror", "")), "")
                    ev_juror_r = next((x.get("reasoning", "") for x in reasons_records if "Evidence" in x.get("juror", "")), "")
                    hse_juror_r = next((x.get("reasoning", "") for x in reasons_records if "HSE" in x.get("juror", "")), "")
                    recommendations = r.get("ai_recommendation_for_excellent_score", {}).get("recommendations", [])
                    single_html = f"category_{cat_id}.html"
                    
                    row_id = f"row_{cat_id.replace('.', '_')}"
                    
                    table_rows += f"""
                    <tr class="category-row child-row child-of-{p_id} {match_class}" data-cat="{cat_id}" data-name="{folder}">
                        <td style="padding-left: 28px;"><span class="sub-arrow">↳</span> <strong>{cat_id}</strong></td>
                        <td>
                            <div class="folder-title">{folder}</div>
                            <a href="{single_html}" class="single-link" target="_blank">View Detailed Log ↗</a>
                        </td>
                        <td>{make_score_badge(expected)}</td>
                        <td>{make_score_badge(comp)}</td>
                        <td>{make_score_badge(ev)}</td>
                        <td>{make_score_badge(hse)}</td>
                        <td><strong>{make_score_badge(final)}</strong></td>
                        <td><span class="conf-pill">{conf:.2f}</span></td>
                        <td>{match_icon}</td>
                        <td><span class="status-badge status-{status}">{status.upper()}</span></td>
                        <td>{time_sec:.1f}s</td>
                        <td>
                            <button class="toggle-btn" onclick="toggleDetails('{row_id}')">Details ▾</button>
                        </td>
                    </tr>
                    <tr id="{row_id}" class="details-row child-of-{p_id}" style="display: none;">
                        <td colspan="12">
                            <div class="details-card">
                                <div class="details-grid">
                                    <div class="detail-box">
                                        <h4>⚖️ Compliance Juror (Score: {comp}/10)</h4>
                                        <p>{comp_juror_r or 'Evaluated based on formal criteria.'}</p>
                                    </div>
                                    <div class="detail-box">
                                        <h4>📑 Evidence Juror (Score: {ev}/10)</h4>
                                        <p>{ev_juror_r or 'Evaluated based on document completeness.'}</p>
                                    </div>
                                    <div class="detail-box">
                                        <h4>🛡️ HSE Juror (Score: {hse}/10)</h4>
                                        <p>{hse_juror_r or 'Evaluated based on practical safety implementation.'}</p>
                                    </div>
                                </div>
                                <div class="consensus-box">
                                    <h4>🤝 Consensus Synthesis & Recommendations for Score 10</h4>
                                    <p><strong>Consensus Reasoning:</strong> {r.get('final_reasoning') or r.get('reasoning') or 'Standard consensus resolution.'}</p>
                                    {('<div class="rec-list"><strong>Key Improvements Needed:</strong><ul>' + ''.join(f'<li>{rec}</li>' for rec in recommendations[:3]) + '</ul></div>') if recommendations else ''}
                                </div>
                            </div>
                        </td>
                    </tr>
                    """

        # Format Total Time
        m, s = divmod(int(total_time_sec), 60)
        time_formatted = f"{m}m {s}s" if m > 0 else f"{total_time_sec:.1f}s"

        html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CSMS AI Scoring - {company_name}</title>
    <style>
        :root {{
            --primary: #2563eb;
            --primary-dark: #1d4ed8;
            --bg-dark: #0f172a;
            --surface: #ffffff;
            --surface-subtle: #f8fafc;
            --border: #e2e8f0;
            --text-main: #1e293b;
            --text-muted: #64748b;
            --success: #16a34a;
            --warning: #d97706;
            --danger: #dc2626;
            --info: #0284c7;
        }}
        * {{ margin: 0; padding: 0; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }}
        body {{
            background: #f1f5f9;
            color: var(--text-main);
            padding: 24px;
            line-height: 1.5;
        }}
        .container {{
            max-width: 1560px;
            margin: 0 auto;
            background: var(--surface);
            border-radius: 16px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
            border: 1px solid var(--border);
        }}
        .hero-banner {{
            background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
            color: white;
            padding: 32px 40px;
            border-bottom: 3px solid var(--primary);
            position: relative;
        }}
        .hero-top {{
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 16px;
            flex-wrap: wrap;
            gap: 16px;
        }}
        .hero-title h1 {{
            font-size: 26px;
            font-weight: 700;
            letter-spacing: -0.5px;
            margin-bottom: 6px;
            color: #f8fafc;
        }}
        .hero-title p {{
            font-size: 15px;
            color: #94a3b8;
        }}
        .badge-domain {{
            background: rgba(37, 99, 235, 0.25);
            color: #93c5fd;
            border: 1px solid rgba(147, 197, 253, 0.4);
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}
        .meta-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
            gap: 16px;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid rgba(255, 255, 255, 0.12);
        }}
        .meta-card {{
            background: rgba(255, 255, 255, 0.05);
            padding: 12px 16px;
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.08);
        }}
        .meta-label {{
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.6px;
            color: #94a3b8;
            margin-bottom: 4px;
        }}
        .meta-value {{
            font-size: 14px;
            font-weight: 600;
            color: #f1f5f9;
            word-break: break-word;
        }}
        .kpi-row {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 16px;
            padding: 24px 40px;
            background: var(--surface-subtle);
            border-bottom: 1px solid var(--border);
        }}
        .kpi-card {{
            background: white;
            padding: 18px 20px;
            border-radius: 12px;
            border: 1px solid var(--border);
            text-align: center;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }}
        .kpi-title {{
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--text-muted);
            margin-bottom: 6px;
        }}
        .kpi-num {{
            font-size: 28px;
            font-weight: 800;
            color: var(--text-main);
        }}
        .kpi-num.success {{ color: var(--success); }}
        .kpi-num.danger {{ color: var(--danger); }}
        .kpi-num.primary {{ color: var(--primary); }}
        .controls-bar {{
            padding: 20px 40px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 16px;
            background: white;
            border-bottom: 1px solid var(--border);
        }}
        .search-box {{
            flex: 1;
            max-width: 380px;
            position: relative;
        }}
        .search-box input {{
            width: 100%;
            padding: 10px 16px 10px 38px;
            border-radius: 8px;
            border: 1px solid var(--border);
            font-size: 14px;
            outline: none;
            transition: all 0.2s;
        }}
        .search-box input:focus {{
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
        }}
        .search-box::before {{
            content: "🔍";
            position: absolute;
            left: 12px;
            top: 10px;
            font-size: 14px;
            opacity: 0.5;
        }}
        .filter-group {{
            display: flex;
            gap: 8px;
            align-items: center;
        }}
        .filter-btn {{
            padding: 8px 14px;
            border-radius: 8px;
            border: 1px solid var(--border);
            background: white;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }}
        .filter-btn:hover {{
            background: var(--surface-subtle);
        }}
        .filter-btn.active {{
            background: var(--primary);
            color: white;
            border-color: var(--primary);
        }}
        .action-btn {{
            padding: 8px 16px;
            border-radius: 8px;
            background: #f1f5f9;
            border: 1px solid var(--border);
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
        }}
        .action-btn:hover {{
            background: #e2e8f0;
        }}
        .table-wrap {{
            overflow-x: auto;
            padding: 0 40px 40px 40px;
            background: white;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin-top: 16px;
            font-size: 13.5px;
        }}
        th {{
            background: #f8fafc;
            color: var(--text-muted);
            padding: 14px 12px;
            text-align: left;
            font-weight: 600;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 2px solid var(--border);
            position: sticky;
            top: 0;
            z-index: 10;
        }}
        td {{
            padding: 14px 12px;
            border-bottom: 1px solid var(--border);
            vertical-align: middle;
        }}
        tr.parent-group-header {{
            background: #f1f5f9 !important;
            border-top: 2px solid #cbd5e1;
            font-weight: 600;
        }}
        tr.parent-row {{
            background: #ffffff;
        }}
        tr.child-row {{
            background: #fafafa;
        }}
        tr.category-row:hover {{
            background: #eff6ff !important;
        }}
        .folder-title {{
            font-weight: 600;
            color: #1e293b;
            max-width: 320px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }}
        .single-link {{
            font-size: 11px;
            color: var(--primary);
            text-decoration: none;
            font-weight: 500;
            display: inline-block;
            margin-top: 3px;
        }}
        .single-link:hover {{
            text-decoration: underline;
        }}
        .sub-arrow {{
            color: #94a3b8;
            font-size: 14px;
            margin-right: 4px;
        }}
        .score-badge {{
            display: inline-block;
            padding: 4px 10px;
            border-radius: 6px;
            font-weight: 700;
            font-size: 12.5px;
            text-align: center;
            min-width: 54px;
        }}
        .score-10 {{ background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; }}
        .score-6  {{ background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }}
        .score-3  {{ background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }}
        .score-0  {{ background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; }}
        .match-badge {{
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
        }}
        .match-badge.match-yes {{ background: #dcfce7; color: #166534; }}
        .match-badge.match-no  {{ background: #fee2e2; color: #991b1b; }}
        .match-badge.match-partial {{ background: #fef9c3; color: #854d0e; }}
        .conf-pill {{
            font-weight: 600;
            color: #475569;
            font-size: 12.5px;
        }}
        .status-badge {{
            display: inline-block;
            padding: 3px 8px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
        }}
        .status-passed {{ background: #dcfce7; color: #166534; }}
        .status-completed {{ background: #e0f2fe; color: #0369a1; }}
        .status-failed {{ background: #fee2e2; color: #991b1b; }}
        .toggle-btn {{
            background: #f8fafc;
            border: 1px solid var(--border);
            padding: 5px 10px;
            border-radius: 6px;
            font-size: 12px;
            cursor: pointer;
            font-weight: 600;
            color: #475569;
            transition: all 0.2s;
        }}
        .toggle-btn:hover {{
            background: #e2e8f0;
            color: #1e293b;
        }}
        .details-row td {{
            background: #f8fafc;
            padding: 16px 24px;
            border-bottom: 2px solid #cbd5e1;
        }}
        .details-card {{
            background: white;
            border: 1px solid var(--border);
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.03);
        }}
        .details-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 16px;
            margin-bottom: 16px;
        }}
        .detail-box {{
            background: #f8fafc;
            padding: 14px;
            border-radius: 8px;
            border: 1px solid var(--border);
        }}
        .detail-box h4 {{
            font-size: 13px;
            margin-bottom: 8px;
            color: #334155;
        }}
        .detail-box p {{
            font-size: 12.5px;
            color: #475569;
            line-height: 1.45;
        }}
        .consensus-box {{
            background: #eff6ff;
            border: 1px solid #bfdbfe;
            padding: 14px 18px;
            border-radius: 8px;
        }}
        .consensus-box h4 {{
            font-size: 13px;
            color: #1e40af;
            margin-bottom: 6px;
        }}
        .consensus-box p {{
            font-size: 13px;
            color: #1e3a8a;
        }}
        .rec-list {{
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px dashed #bfdbfe;
        }}
        .rec-list ul {{
            margin-left: 20px;
            margin-top: 4px;
            font-size: 12.5px;
            color: #1e3a8a;
        }}
        .footer {{
            padding: 24px 40px;
            background: var(--surface-subtle);
            border-top: 1px solid var(--border);
            text-align: center;
            color: var(--text-muted);
            font-size: 13px;
        }}
    </style>
</head>
<body>
    <div class="container">
        <!-- 1. HERO & METADATA BANNER -->
        <div class="hero-banner">
            <div class="hero-top">
                <div class="hero-title">
                    <h1>CSMS AI Assessment Dashboard</h1>
                    <p>{project_title}</p>
                </div>
                <div class="badge-domain">Scope: {category_scope.upper()}</div>
            </div>
            <div class="meta-grid">
                <div class="meta-card">
                    <div class="meta-label">Contractor Company</div>
                    <div class="meta-value">{company_name}</div>
                </div>
                <div class="meta-card">
                    <div class="meta-label">Evaluation Date</div>
                    <div class="meta-value">{eval_date}</div>
                </div>
                <div class="meta-card">
                    <div class="meta-label">Contract Period</div>
                    <div class="meta-value">{date_start} to {date_end}</div>
                </div>
                <div class="meta-card">
                    <div class="meta-label">AI Engine Models</div>
                    <div class="meta-value">Juror: {juror_model} | {chunking_mode}</div>
                </div>
            </div>
        </div>

        <!-- 2. EXECUTIVE KPI CARDS -->
        <div class="kpi-row">
            <div class="kpi-card">
                <div class="kpi-title">Total Categories</div>
                <div class="kpi-num primary">{total}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-title">Exact Matches</div>
                <div class="kpi-num success">{exact_matches}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-title">Discrepancies</div>
                <div class="kpi-num danger">{discrepancies}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-title">Overall AI Avg Score</div>
                <div class="kpi-num">{avg_score:.1f} <span style="font-size: 14px; font-weight: 500; color: #64748b;">/ 10</span></div>
            </div>
            <div class="kpi-card">
                <div class="kpi-title">Expected Avg Score</div>
                <div class="kpi-num">{avg_expected:.1f} <span style="font-size: 14px; font-weight: 500; color: #64748b;">/ 10</span></div>
            </div>
            <div class="kpi-card">
                <div class="kpi-title">Avg Confidence</div>
                <div class="kpi-num">{avg_confidence:.2f}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-title">Total Duration</div>
                <div class="kpi-num" style="font-size: 22px;">{time_formatted}</div>
            </div>
        </div>

        <!-- 3. CONTROLS & FILTER BAR -->
        <div class="controls-bar">
            <div class="search-box">
                <input type="text" id="searchInput" placeholder="Search category ID or name..." onkeyup="filterTable()">
            </div>
            <div class="filter-group">
                <button class="filter-btn active" onclick="setFilter('all', this)">All ({total})</button>
                <button class="filter-btn" onclick="setFilter('match', this)">Matches ({exact_matches})</button>
                <button class="filter-btn" onclick="setFilter('discrepancy', this)">Discrepancies ({discrepancies})</button>
                <button class="action-btn" onclick="toggleAllDetails()">Expand/Collapse All</button>
            </div>
        </div>

        <!-- 4. DETAILED HIERARCHICAL RESULTS TABLE -->
        <div class="table-wrap">
            <table id="resultsTable">
                <thead>
                    <tr>
                        <th style="width: 70px;">Cat</th>
                        <th>Category Name & Log</th>
                        <th style="width: 80px;">Expected</th>
                        <th style="width: 80px;">Compliance</th>
                        <th style="width: 80px;">Evidence</th>
                        <th style="width: 80px;">HSE</th>
                        <th style="width: 80px;">Final AI</th>
                        <th style="width: 70px;">Conf</th>
                        <th style="width: 120px;">Match</th>
                        <th style="width: 90px;">Status</th>
                        <th style="width: 75px;">Time</th>
                        <th style="width: 90px;">Action</th>
                    </tr>
                </thead>
                <tbody>
                    {table_rows}
                </tbody>
            </table>
        </div>

        <!-- 5. FOOTER -->
        <div class="footer">
            <p>PHE CSMS AI Scoring System | Generated on {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}</p>
        </div>
    </div>

    <!-- INTERACTIVE JAVASCRIPT -->
    <script>
        let currentFilter = 'all';
        let allExpanded = false;

        function toggleDetails(rowId) {{
            const row = document.getElementById(rowId);
            if (row) {{
                row.style.display = (row.style.display === 'none' || row.style.display === '') ? 'table-row' : 'none';
            }}
        }}

        function toggleParentGroup(parentId) {{
            const children = document.querySelectorAll('.child-of-' + parentId);
            children.forEach(el => {{
                if (el.classList.contains('details-row')) {{
                    el.style.display = 'none';
                }} else {{
                    el.style.display = (el.style.display === 'none') ? 'table-row' : 'none';
                }}
            }});
        }}

        function toggleAllDetails() {{
            allExpanded = !allExpanded;
            const detailsRows = document.querySelectorAll('.details-row');
            detailsRows.forEach(row => {{
                row.style.display = allExpanded ? 'table-row' : 'none';
            }});
        }}

        function setFilter(filterType, btn) {{
            currentFilter = filterType;
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filterTable();
        }}

        function filterTable() {{
            const input = document.getElementById('searchInput').value.toLowerCase();
            const rows = document.querySelectorAll('.category-row');
            
            rows.forEach(row => {{
                const cat = (row.getAttribute('data-cat') || '').toLowerCase();
                const name = (row.getAttribute('data-name') || '').toLowerCase();
                const matchesSearch = cat.includes(input) || name.includes(input);
                
                let matchesFilter = true;
                if (currentFilter === 'match') {{
                    matchesFilter = row.classList.contains('match-yes');
                }} else if (currentFilter === 'discrepancy') {{
                    matchesFilter = row.classList.contains('match-no');
                }}
                
                if (matchesSearch && matchesFilter) {{
                    row.style.display = 'table-row';
                }} else {{
                    row.style.display = 'none';
                    // also hide attached details row if open
                    const catId = row.getAttribute('data-cat');
                    if (catId) {{
                        const detailsRow = document.getElementById('row_' + catId.replace('.', '_'));
                        if (detailsRow) detailsRow.style.display = 'none';
                    }}
                }}
            }});
        }}
    </script>
</body>
</html>
"""
        if output_path:
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(html_content)
        
        return html_content

