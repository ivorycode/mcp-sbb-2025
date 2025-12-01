import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {readFileSync} from 'fs';
import {join} from 'path';

export function registerCredentialsTool(server: McpServer) {
  server.registerTool(
    "read_transgourmet_credentials",
    {
      description: "Read the credentials to access the Transgourmet Webshop from a local JSON file. The Transgourmet User Name is stored in the credentials.",
},
  async () => {
    const credentialsPath = '/Users/jbandi/Dev/CourseRepos/mcp-sbb-2025/10-local/credentials.json';
    try {
      console.error(`\n\n-- MCP Server: READING CREDENTIALS from ${credentialsPath} --\n\n`);

      const fileContent = readFileSync(credentialsPath, 'utf-8');
      const credentials = JSON.parse(fileContent);

      let result: any;
      result = credentials;

      return {
        structuredContent: result,
        content: [{
          type: "text" as const,
          text: `Credentials: ${JSON.stringify(credentials, null, 2)}`,
        }]
      };
    } catch (error: any) {
      const errorMessage = error.code === 'ENOENT'
        ? `Credentials file not found at ${credentialsPath}`
        : `Error reading credentials: ${error.message}`;

      console.error(`\n\n-- MCP Server: ERROR ${errorMessage} --\n\n`);

      return {
        content: [{
          type: "text" as const,
          text: errorMessage,
        }],
        isError: true,
      };
    }
  },
)
  ;
}

