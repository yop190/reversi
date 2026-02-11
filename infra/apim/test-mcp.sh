#!/bin/bash
# Test MCP endpoint with initialize request
MCP_URL="https://apim-reversi-prod.azure-api.net/reversi-game-api-mcp/mcp"

echo "=== Testing MCP Streamable HTTP endpoint ==="
echo "URL: ${MCP_URL}"
echo ""

echo "--- Test 1: MCP initialize ---"
RESPONSE=$(curl -s -w "\n%{http_code}" \
  "${MCP_URL}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","method":"initialize","id":1,"params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test-client","version":"1.0.0"}}}')

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')
echo "HTTP Status: ${HTTP_CODE}"
echo "Response: ${BODY}" | head -c 1000
echo ""
echo ""

echo "--- Test 2: MCP tools/list ---"
# Need to initialize first, get session id
SESSION_RESPONSE=$(curl -si \
  "${MCP_URL}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","method":"initialize","id":1,"params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test-client","version":"1.0.0"}}}' 2>/dev/null)

SESSION_ID=$(echo "$SESSION_RESPONSE" | grep -i "mcp-session-id" | head -1 | tr -d '\r' | awk '{print $2}')
echo "Session ID: ${SESSION_ID}"

if [ -n "$SESSION_ID" ]; then 
  echo "Listing tools with session..."
  curl -s "${MCP_URL}" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json, text/event-stream" \
    -H "Mcp-Session-Id: ${SESSION_ID}" \
    -d '{"jsonrpc":"2.0","method":"tools/list","id":2}' | head -c 2000
  echo ""
fi

echo ""
echo "--- Test 3: SSE endpoint ---"
SSE_URL="https://apim-reversi-prod.azure-api.net/reversi-game-api-mcp/sse"
SSE_CODE=$(curl -s -o /dev/null -w "%{http_code}" -m 5 \
  "${SSE_URL}" \
  -H "Accept: text/event-stream" 2>/dev/null || true)
echo "SSE endpoint HTTP Status: ${SSE_CODE}"

echo ""
echo "=== Done ==="
