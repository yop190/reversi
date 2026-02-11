#!/usr/bin/env node
/**
 * Standalone MCP stdio transport runner.
 *
 * Claude Desktop launches this process and communicates via
 * stdin/stdout using JSON-RPC 2.0 (one JSON object per line).
 *
 * It forwards every `tools/call` to the running NestJS backend
 * over HTTP, so you must have the backend running first.
 *
 * Usage:
 *   node backend/dist/backend/src/mcp/mcp-stdio.js
 *   # or via ts-node during dev:
 *   npx ts-node backend/src/mcp/mcp-stdio.ts
 *
 * Environment:
 *   REVERSI_API  – backend base URL  (default http://localhost:3001)
 */

import * as http from 'http';
import * as readline from 'readline';

const API_BASE = process.env.REVERSI_API || 'http://localhost:3001';

// ─── helpers ────────────────────────────────────────────────────────────────

function httpPost(path: string, body: unknown): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const url = new URL(path, API_BASE);
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      res => {
        let chunks = '';
        res.on('data', d => (chunks += d));
        res.on('end', () => {
          try {
            resolve(JSON.parse(chunks));
          } catch {
            resolve({ raw: chunks });
          }
        });
      },
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function httpGet(path: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    http.get(url, res => {
      let chunks = '';
      res.on('data', d => (chunks += d));
      res.on('end', () => {
        try {
          resolve(JSON.parse(chunks));
        } catch {
          resolve({ raw: chunks });
        }
      });
    }).on('error', reject);
  });
}

function send(obj: unknown) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

// ─── JSON-RPC handler ───────────────────────────────────────────────────────

async function handleRequest(req: {
  jsonrpc: string;
  id?: string | number;
  method: string;
  params?: Record<string, unknown>;
}) {
  const id = req.id;

  try {
    switch (req.method) {
      case 'initialize':
        send({
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            serverInfo: { name: 'reversi-mcp', version: '1.0.0' },
            capabilities: { tools: {} },
          },
        });
        break;

      case 'initialized':
        // Notification – no response needed
        break;

      case 'tools/list': {
        const data = await httpGet('/mcp/tools');
        send({ jsonrpc: '2.0', id, result: data });
        break;
      }

      case 'tools/call': {
        const toolName = req.params?.name as string;
        const toolArgs = (req.params?.arguments ?? {}) as Record<string, unknown>;
        const result = await httpPost('/mcp/tools/call', {
          name: toolName,
          arguments: toolArgs,
        });
        send({ jsonrpc: '2.0', id, result });
        break;
      }

      default:
        send({
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Method not found: ${req.method}` },
        });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    send({ jsonrpc: '2.0', id, error: { code: -32603, message: msg } });
  }
}

// ─── main loop ──────────────────────────────────────────────────────────────

const rl = readline.createInterface({ input: process.stdin });

rl.on('line', line => {
  if (!line.trim()) return;
  try {
    const req = JSON.parse(line);
    handleRequest(req);
  } catch {
    send({
      jsonrpc: '2.0',
      error: { code: -32700, message: 'Parse error' },
    });
  }
});

process.stderr.write(`🎮 Reversi MCP stdio bridge ready (backend: ${API_BASE})\n`);
