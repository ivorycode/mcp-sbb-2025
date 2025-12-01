import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerTimeTool(server: McpServer){
  server.registerTool(
    "get_time",
    {
      description: "Get the current time",
    },
    async () => {
      let date = new Date().toISOString();
      console.error(`\n\n-- MCP Server: GET TIME ${date} --\n\n`)
      return {
        content: [{
          type: "text" as const,
          text: `Current Date: ${date}`
        }],
        structuredContent: {
          date
        }
      };
    }
  )
}