import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {registerTimeTool} from './tools/timeTool.js';
import {registerCredentialsTool} from './tools/credentialsTool.js';

const server = new McpServer({
  name: "local-mcp-server",
  version: "1.0.0"
});

registerTimeTool(server);
registerCredentialsTool(server);
 
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("\n\n-- MCP Server: Workshop Server running on stdio\n\n");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});