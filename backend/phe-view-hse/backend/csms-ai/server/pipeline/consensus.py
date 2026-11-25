import json
import os
import sys
from datetime import datetime, timezone
from typing import Dict, Any, List

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from server.db import get_pool
from engine.consensus.consensus_agent import ConsensusAgent
from engine.utils.scoring import snap_to_csms_scale as _snap, determine_ai_status


async def resolve_and_save(
    job_id: str,
    contract_folder_id: str,
    juror_results: Dict[str, Any],
    knowledge: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Run consensus, save results to csms_contract_folder and csms_ai_evaluation_job,
    send NOTIFY.
    """
    pool = await get_pool()

    comp_res = juror_results["compliance"]
    ev_res = juror_results["evidence"]
    hse_res = juror_results["hse"]

    # Run consensus
    consensus_agent = ConsensusAgent(role="consensus_model")
    kb = knowledge.get("knowledge_base", [])
    kb_dict = kb[0] if kb else knowledge
    final_result = consensus_agent.resolve(comp_res, ev_res, hse_res, kb_dict)

    final_score = _snap(final_result.get("recommended_score", 6))
    confidence = final_result.get("confidence", 0.90)
    reasoning = final_result.get("reasoning", "")
    if isinstance(reasoning, list):
        reasoning = "; ".join(reasoning)

    now = datetime.now(timezone.utc)

    ai_status = determine_ai_status(final_score)

    # Build reasoning text
    reasoning_text = (
        f"[Compliance] Score: {comp_res['score']}/10 (Conf: {comp_res['confidence']:.2f}) | "
        f"{comp_res.get('reasoning', [])}\n"
        f"[Evidence] Score: {ev_res['score']}/10 (Conf: {ev_res['confidence']:.2f}) | "
        f"{ev_res.get('reasoning', [])}\n"
        f"[HSE] Score: {hse_res['score']}/10 (Conf: {hse_res['confidence']:.2f}) | "
        f"{hse_res.get('reasoning', [])}\n"
        f"[Consensus] Score: {final_score}/10 (Conf: {confidence:.2f}) | {reasoning}"
    )

    async with pool.acquire() as conn:
        # 1. Update contractFolder
        await conn.execute(
            """UPDATE csms_contract_folder
               SET ai_score = $1,
                   ai_status = $2,
                   ai_reasoning = $3,
                   ai_processed_at = $4
               WHERE id = $5""",
            str(final_score),
            ai_status,
            reasoning_text,
            now,
            contract_folder_id,
        )

        # 2. Update job
        await conn.execute(
            """UPDATE csms_ai_evaluation_job
               SET status = 'completed',
                   progress_message = 'Evaluation complete',
                   juror_scores = $1::jsonb,
                   completed_at = $2
               WHERE id = $3""",
            json.dumps(juror_results["juror_scores"]),
            now,
            job_id,
        )

        # 3. NOTIFY
        notification = json.dumps({
            "folderId": contract_folder_id,
            "jobId": job_id,
            "status": "completed",
            "aiScore": final_score,
            "aiStatus": ai_status,
        })
        await conn.execute(
            "SELECT pg_notify('csms_ai_evaluation_channel', $1)",
            notification,
        )

    return {
        "final_score": final_score,
        "confidence": confidence,
        "reasoning": reasoning_text,
        "juror_scores": juror_results["juror_scores"],
    }
