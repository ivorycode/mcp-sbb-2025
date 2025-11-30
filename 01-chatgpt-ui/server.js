import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { searchTransgourmetCatalog } from "./transgourmet-api.ts";
import { addToCart, addMultipleToCart, getCart, submitCart } from "./transgourmet-cart-api.ts";

const productsHtml = readFileSync("public/transgourmet-products.html", "utf8");
const cartHtml = readFileSync("public/transgourmet-cart.html", "utf8");

const searchTransgourmetInputSchema = {
  searchTerm: z.string().min(1),
};

const addArticleToCartInputSchema = {
  articleNumber: z.string().min(1),
  username: z.string().min(1),
  quantity: z.number().int().positive().optional().default(1),
};

const addMultipleArticlesToCartInputSchema = {
  username: z.string().min(1),
  positions: z.array(
    z.object({
      articleNumber: z.string().min(1),
      quantity: z.number().int().positive().default(1),
    })
  ).min(1),
};

const getCartInputSchema = {
  username: z.string().min(1),
};

const submitCartInputSchema = {
  username: z.string().min(1),
};

let todos = [];
let nextId = 1;

const replyWithTodos = (message) => ({
  content: message ? [{ type: "text", text: message }] : [],
  structuredContent: { tasks: todos },
});

const replyWithProducts = (message, products = [], searchTerm = "") => ({
  content: message ? [{ type: "text", text: message }] : [],
  structuredContent: { products, searchTerm },
});

const replyWithCart = (message, cart = { positions: [] }, username = "") => ({
  content: message ? [{ type: "text", text: message }] : [],
  structuredContent: { cart: { ...cart, username } },
});

function createTodoServer() {
  const server = new McpServer({ name: "todo-app", version: "0.1.0" });

  server.registerResource(
    "transgourmet-products-widget",
    "ui://widget/transgourmet-products.html",
    {},
    async () => ({
      contents: [
        {
          uri: "ui://widget/transgourmet-products.html",
          mimeType: "text/html+skybridge",
          text: productsHtml,
          _meta: { "openai/widgetPrefersBorder": true },
        },
      ],
    })
  );

  server.registerResource(
    "transgourmet-cart-widget",
    "ui://widget/transgourmet-cart.html",
    {},
    async () => ({
      contents: [
        {
          uri: "ui://widget/transgourmet-cart.html",
          mimeType: "text/html+skybridge",
          text: cartHtml,
          _meta: { "openai/widgetPrefersBorder": true },
        },
      ],
    })
  );

  server.registerTool(
    "search_transgourmet",
    {
      title: "Search Transgourmet Catalog",
      description: "Searches the Transgourmet catalog for products by search term and returns matching products with article numbers, descriptions, and prices. You can only search for one product at a time!",
      inputSchema: searchTransgourmetInputSchema,
      _meta: {
        "openai/outputTemplate": "ui://widget/transgourmet-products.html",
        "openai/toolInvocation/invoking": "Searching Transgourmet catalog",
        "openai/toolInvocation/invoked": "Found products",
      },
    },
    async (args) => {
      const searchTerm = args?.searchTerm?.trim?.() ?? "";
      if (!searchTerm) {
        return replyWithProducts("Missing search term.", [], "");
      }

      try {
        const products = await searchTransgourmetCatalog(searchTerm);
        const message =
          products.length > 0
            ? `Found ${products.length} product(s) for "${searchTerm}".`
            : `No products found for "${searchTerm}".`;
        return replyWithProducts(message, products, searchTerm);
      } catch (error) {
        console.error("Error searching Transgourmet catalog:", error);
        return replyWithProducts(
          `Error searching catalog: ${error.message || "Unknown error"}`,
          [],
          searchTerm
        );
      }
    }
  );

  server.registerTool(
    "add_article_to_transgourmet_cart",
    {
      title: "Add Article to Transgourmet Cart",
      description: "Adds an article to the Transgourmet shopping cart for a specific user. The quantity parameter is optional and defaults to 1.",
      inputSchema: addArticleToCartInputSchema,
    },
    async (args) => {
      const articleNumber = args?.articleNumber?.trim?.() ?? "";
      const username = args?.username?.trim?.() ?? "";
      const quantity = args?.quantity ?? 1;

      if (!articleNumber) {
        return {
          content: [{ type: "text", text: "Missing article number." }],
        };
      }

      if (!username) {
        return {
          content: [{ type: "text", text: "Missing username." }],
        };
      }

      try {
        const cart = addToCart(username, articleNumber, quantity);
        const position = cart.positions.find(
          (pos) => pos.articleNumber === articleNumber
        );
        const message = position
          ? `Added ${quantity} of article ${articleNumber} to cart for user "${username}". Current quantity: ${position.quantity}.`
          : `Added ${quantity} of article ${articleNumber} to cart for user "${username}".`;
        return {
          content: [{ type: "text", text: message }],
        };
      } catch (error) {
        console.error("Error adding article to cart:", error);
        return {
          content: [
            {
              type: "text",
              text: `Error adding article to cart: ${error.message || "Unknown error"}`,
            },
          ],
        };
      }
    }
  );

  server.registerTool(
    "add_multiple_articles_to_transgourmet_cart",
    {
      title: "Add Multiple Articles to Transgourmet Cart",
      description: "Adds multiple articles to the Transgourmet shopping cart for a specific user. Each position should have an articleNumber and an optional quantity (defaults to 1).",
      inputSchema: addMultipleArticlesToCartInputSchema,
    },
    async (args) => {
      const username = args?.username?.trim?.() ?? "";
      const positions = args?.positions ?? [];

      if (!username) {
        return {
          content: [{ type: "text", text: "Missing username." }],
        };
      }

      if (!positions || positions.length === 0) {
        return {
          content: [{ type: "text", text: "Missing or empty positions array." }],
        };
      }

      // Validate and normalize positions
      const normalizedPositions = positions.map((pos) => ({
        articleNumber: (pos?.articleNumber?.trim?.() ?? ""),
        quantity: pos?.quantity ?? 1,
      })).filter((pos) => pos.articleNumber.length > 0);

      if (normalizedPositions.length === 0) {
        return {
          content: [{ type: "text", text: "No valid positions provided. Each position must have an articleNumber." }],
        };
      }

      try {
        const cart = addMultipleToCart(username, normalizedPositions);
        const addedItems = normalizedPositions.map(
          (pos) => `${pos.quantity}x ${pos.articleNumber}`
        ).join(", ");
        const message = `Added ${normalizedPositions.length} position(s) to cart for user "${username}": ${addedItems}. Cart now contains ${cart.positions.length} position(s).`;
        return {
          content: [{ type: "text", text: message }],
        };
      } catch (error) {
        console.error("Error adding multiple articles to cart:", error);
        return {
          content: [
            {
              type: "text",
              text: `Error adding articles to cart: ${error.message || "Unknown error"}`,
            },
          ],
        };
      }
    }
  );

  server.registerTool(
    "get_transgourmet_cart",
    {
      title: "Get Transgourmet Cart",
      description: "Retrieves the current shopping cart for a specific user, including all positions with article numbers and quantities.",
      inputSchema: getCartInputSchema,
      _meta: {
        "openai/outputTemplate": "ui://widget/transgourmet-cart.html",
        "openai/toolInvocation/invoking": "Fetching cart",
        "openai/toolInvocation/invoked": "Cart retrieved",
      },
    },
    async (args) => {
      const username = args?.username?.trim?.() ?? "";

      if (!username) {
        return replyWithCart("Missing username.", { positions: [] }, "");
      }

      try {
        const cart = await getCart(username);
        const totalItems = cart.positions.reduce(
          (sum, pos) => sum + (pos.quantity || 0),
          0
        );
        const message =
          cart.positions.length === 0
            ? `Cart for user "${username}" is empty.`
            : `Cart for user "${username}" contains ${cart.positions.length} position(s) with ${totalItems} total item(s).`;
        return replyWithCart(message, cart, username);
      } catch (error) {
        console.error("Error fetching cart:", error);
        return replyWithCart(
          `Error fetching cart: ${error.message || "Unknown error"}`,
          { positions: [] },
          username
        );
      }
    }
  );

  server.registerTool(
    "submit_transgourmet_cart",
    {
      title: "Submit Transgourmet Cart",
      description: "Submits the shopping cart for a specific user and returns an order ID. The cart will be cleared after submission.",
      inputSchema: submitCartInputSchema,
    },
    async (args) => {
      const username = args?.username?.trim?.() ?? "";

      if (!username) {
        return {
          content: [{ type: "text", text: "Missing username." }],
        };
      }

      try {
        const orderId = submitCart(username);
        const message = `Cart submitted successfully for user "${username}". Order ID: ${orderId}.`;
        return {
          content: [{ type: "text", text: message }],
        };
      } catch (error) {
        console.error("Error submitting cart:", error);
        return {
          content: [
            {
              type: "text",
              text: `Error submitting cart: ${error.message || "Unknown error"}`,
            },
          ],
        };
      }
    }
  );

  return server;
}

const port = Number(process.env.PORT ?? 8787);
const MCP_PATH = "/mcp";

const httpServer = createServer(async (req, res) => {
  if (!req.url) {
    res.writeHead(400).end("Missing URL");
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

  if (req.method === "OPTIONS" && url.pathname === MCP_PATH) {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "content-type, mcp-session-id",
      "Access-Control-Expose-Headers": "Mcp-Session-Id",
    });
    res.end();
    return;
  }

  if (req.method === "GET" && url.pathname === "/") {
    res.writeHead(200, { "content-type": "text/plain" }).end("Todo MCP server");
    return;
  }

  const MCP_METHODS = new Set(["POST", "GET", "DELETE"]);
  if (url.pathname === MCP_PATH && req.method && MCP_METHODS.has(req.method)) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");

    const server = createTodoServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless mode
      enableJsonResponse: true,
    });

    res.on("close", () => {
      transport.close();
      server.close();
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res);
    } catch (error) {
      console.error("Error handling MCP request:", error);
      if (!res.headersSent) {
        res.writeHead(500).end("Internal server error");
      }
    }
    return;
  }

  res.writeHead(404).end("Not Found");
});

httpServer.listen(port, () => {
  console.log(
    `Todo MCP server listening on http://localhost:${port}${MCP_PATH}`
  );
});