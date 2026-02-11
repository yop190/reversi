import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  Logger,
} from '@nestjs/common';
import { McpService, MCP_TOOLS } from './mcp.service';

// ─── JSON-RPC types ─────────────────────────────────────────────────────────

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id?: string | number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

// ─── Controller ─────────────────────────────────────────────────────────────

/**
 * Exposes the MCP protocol over HTTP for Claude Desktop (HTTP transport) and
 * for direct curl / API-Management calls.
 *
 * Endpoints:
 *   GET  /mcp/tools           → list available tools (convenience)
 *   POST /mcp/jsonrpc         → full JSON-RPC 2.0 endpoint
 *   POST /mcp/tools/call      → simplified tool-call endpoint
 */
@Controller('mcp')
export class McpController {
  private readonly logger = new Logger(McpController.name);

  constructor(private readonly mcpService: McpService) {
    this.logger.log('MCP controller initialised – tools available:');
    MCP_TOOLS.forEach(t => this.logger.log(`  • ${t.name}`));
  }

  // ── tool listing ────────────────────────────────────────────────────────

  /**
   * GET /mcp/tools
   * Returns the list of tool definitions (JSON Schema).
   */
  @Get('tools')
  listTools() {
    return {
      tools: MCP_TOOLS.map(t => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      })),
    };
  }

  // ── JSON-RPC 2.0 endpoint ───────────────────────────────────────────────

  /**
   * POST /mcp/jsonrpc
   * Standard JSON-RPC 2.0 – supports `tools/list` and `tools/call`.
   */
  @Post('jsonrpc')
  @HttpCode(200)
  handleJsonRpc(@Body() body: JsonRpcRequest): JsonRpcResponse {
    const id = body.id;

    try {
      switch (body.method) {
        // ── list tools ──
        case 'tools/list':
          return {
            jsonrpc: '2.0',
            id,
            result: {
              tools: MCP_TOOLS.map(t => ({
                name: t.name,
                description: t.description,
                inputSchema: t.inputSchema,
              })),
            },
          };

        // ── call a tool ──
        case 'tools/call': {
          const params = body.params ?? {};
          const toolName = params.name as string;
          const toolArgs = (params.arguments ?? {}) as Record<string, unknown>;

          if (!toolName) {
            return this.rpcError(id, -32602, 'Missing params.name');
          }

          const result = this.mcpService.callTool(toolName, toolArgs);
          return { jsonrpc: '2.0', id, result };
        }

        // ── initialize (handshake) ──
        case 'initialize':
          return {
            jsonrpc: '2.0',
            id,
            result: {
              protocolVersion: '2024-11-05',
              serverInfo: { name: 'reversi-mcp', version: '1.0.0' },
              capabilities: { tools: {} },
            },
          };

        default:
          return this.rpcError(id, -32601, `Method not found: ${body.method}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`JSON-RPC error: ${msg}`);
      return this.rpcError(id, -32603, msg);
    }
  }

  // ── simplified REST endpoint ────────────────────────────────────────────

  /**
   * POST /mcp/tools/call
   * Simplified REST endpoint — body: { name: string, arguments: {} }
   */
  @Post('tools/call')
  @HttpCode(200)
  callTool(@Body() body: { name: string; arguments?: Record<string, unknown> }) {
    const toolName = body.name;
    const toolArgs = body.arguments ?? {};

    if (!toolName) {
      return { error: 'Missing tool name in body.name' };
    }

    this.logger.log(`Tool call: ${toolName} ${JSON.stringify(toolArgs)}`);
    return this.mcpService.callTool(toolName, toolArgs);
  }

  // ── helpers ─────────────────────────────────────────────────────────────

  private rpcError(
    id: string | number | undefined,
    code: number,
    message: string,
  ): JsonRpcResponse {
    return { jsonrpc: '2.0', id, error: { code, message } };
  }
}
