#!/usr/bin/env bash
# Start the csms-ai test engine on :8003 (kills a previous one on that port).
#   normal : bash cypress/scripts/start-engine.sh
#   outage : bash cypress/scripts/start-engine.sh outage   (vLLM + OpenAI deliberately unreachable)
set -euo pipefail
cd "$(dirname "$0")/../../../../backend/phe-view-hse/backend/csms-ai"
PORT=8003
PID=$(netstat -ano 2>/dev/null | grep ":$PORT .*LISTENING" | awk '{print $5}' | head -1 || true)
[ -n "${PID:-}" ] && taskkill //PID "$PID" //F >/dev/null 2>&1 || true
PY=./.venv/Scripts/python.exe; [ -x "$PY" ] || PY=./.venv/bin/python
if [ "${1:-}" = "outage" ]; then
  export LLM_REASONING_ENDPOINT=http://127.0.0.1:9/v1 LLM_CONSENSUS_ENDPOINT=http://127.0.0.1:9/v1 OPENAI_API_KEY=
fi
ENV_FILE=.env.test PYTHONUNBUFFERED=1 nohup "$PY" -m server.main > "${TMPDIR:-/tmp}/engine_test_${1:-normal}.log" 2>&1 &
for i in $(seq 1 30); do sleep 1; curl -s -m 2 http://127.0.0.1:$PORT/health >/dev/null && { echo "engine up (${1:-normal})"; exit 0; }; done
echo "engine did not start"; exit 1
