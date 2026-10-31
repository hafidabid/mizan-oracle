#!/usr/bin/env bash
# Owns a fresh LOCAL chain, sends test transactions, and shuts down only its own process.
set -euo pipefail
cd "$(dirname "$0")/.."
for binary in anvil forge cast python3; do
  command -v "$binary" >/dev/null || { echo "Missing tool: $binary" >&2; exit 1; }
done
port="${ANVIL_PORT:-18545}"
rpc="http://127.0.0.1:$port"
if cast chain-id --rpc-url "$rpc" >/dev/null 2>&1; then
  echo "Port $port already has an RPC. Use another ANVIL_PORT; this script needs a fresh chain." >&2
  exit 1
fi
mkdir -p deployments
anvil_log="$(mktemp deployments/anvil-log.XXXXXX)"
anvil --host 127.0.0.1 --port "$port" --chain-id 31337 >"$anvil_log" 2>&1 &
anvil_pid=$!
cleanup() { kill "$anvil_pid" 2>/dev/null || true; rm -f "$anvil_log"; }
trap cleanup EXIT
ready=false
for attempt in $(seq 1 50); do
  if cast chain-id --rpc-url "$rpc" >/dev/null 2>&1; then ready=true; break; fi
  sleep 0.2
done
if [ "$ready" != true ]; then cat "$anvil_log"; exit 1; fi
forge script script/DeployLocal.s.sol:DeployLocal --rpc-url "$rpc" --broadcast --non-interactive
forge script script/LocalDemo.s.sol:LocalDemo --rpc-url "$rpc" --broadcast --non-interactive
consumer="$(python3 -c 'import json; print(json.load(open("deployments/local.json"))["consumer"])')"
asset="$(python3 -c 'import json; print(json.load(open("deployments/local.json"))["asset"])')"
registry="$(python3 -c 'import json; print(json.load(open("deployments/local.json"))["registry"])')"
check() {
  result="$(cast call "$consumer" 'isAllowed(address,uint8)(bool)' "$asset" "$1" --rpc-url "$rpc")"
  [ "$result" = "$2" ] || { echo "Mode $1: expected $2, got $result" >&2; exit 1; }
}
check 0 true
check 1 true
check 2 true
echo "PASS: active approval is accepted."
opinions="$(cast call "$registry" 'getOpinions(uint256)((address,uint8)[])' 1 --rpc-url "$rpc")"
[ "$(grep -o ', 1)' <<<"$opinions" | wc -l | tr -d ' ')" = 2 ] || { echo "Expected 2 approvals: $opinions" >&2; exit 1; }
[ "$(grep -o ', 3)' <<<"$opinions" | wc -l | tr -d ' ')" = 1 ] || { echo "Expected 1 needs-review: $opinions" >&2; exit 1; }
echo "PASS: three named Sharia board members recorded (2 Approved, 1 NeedsReview): $opinions"
cast rpc --rpc-url "$rpc" evm_increaseTime 86401 >/dev/null
cast rpc --rpc-url "$rpc" evm_mine >/dev/null
check 0 true
check 1 true
check 2 false
echo "PASS: expired approval preserves prior approval, blocks current approval."
forge script script/LocalDemo.s.sol:LocalDemo --sig 'revoke()' --rpc-url "$rpc" --broadcast --non-interactive
check 0 true
check 1 false
check 2 false
[ "$(cast call "$registry" 'latestId(address)(uint256)' "$asset" --rpc-url "$rpc")" = 1 ]
[ "$(cast call "$registry" 'getRevokers(uint256)(address[])' 1 --rpc-url "$rpc" | tr ',' '\n' | wc -l | tr -d ' ')" = 2 ]
echo "PASS: revocation blocks both approval modes, preserves latest record ID, and records 2 revoking Sharia board members."
echo "ANVIL SMOKE PASSED. Local mock transport only, not a CRE workflow."
