import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {searchTransgourmetCatalog} from './transgourmet-api';
import { CartApi, Cart, CartDisplay } from './transgourmet-cart-api';
import {createUIResource} from '@mcp-ui/server';
import {generateProductsHTML} from './generate-products-html';

// Mocked cart storage: Map with username as key and Cart object as value
const cartStorage: Map<string, Cart> = new Map();
const cartApi = new CartApi(cartStorage);


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


const replyWithProducts = (message: string, products = [] as {}[], searchTerm = "") => ({
  content: { type: "text" as const, text: message },
  structuredContent: { products, searchTerm },
});


// Define our MCP agent with tools
export class MyMCP extends McpAgent {
	server = new McpServer({
		name: "Transgourmet Webshop",
		version: "1.0.0",
	});


  
  
	async init() {
    // this.cartStorage.set("jonas.bandi", { positions: [{ articleNumber: "095210", quantity: 1 }, { articleNumber: "022600", quantity: 2 }] });
    
    this.server.registerTool(
      "search_transgourmet",
      {
        title: "Search Transgourmet Catalog",
        description: "Searches the Transgourmet catalog for products by search term and returns matching products with article numbers, descriptions, and prices. You can only search for one product at a time!",
        inputSchema: searchTransgourmetInputSchema,
      },
      async (args) => {
        const searchTerm = args?.searchTerm?.trim?.() ?? "";
        
        const products = await searchTransgourmetCatalog(searchTerm);

        const htmlContent = generateProductsHTML(products, searchTerm);

        const uiResource = createUIResource({
          uri: `ui://transgourmet-search/${searchTerm}`,
          content: {
            type: "rawHtml",
            htmlString: htmlContent,
          },
          encoding: "text",
          uiMetadata: {
            "preferred-frame-size": ["850px", "900px"],
          },
        });
        
        return {
          content: [
            uiResource, 
            {type: "text" as const, text: 'Transgourmet Search Results'}],
        };
      }
    );

    this.server.registerTool(
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
          const cart = cartApi.addToCart(username, articleNumber, quantity);
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
                text: `Error adding article to cart: ${(error as any).message || "Unknown error"}`,
              },
            ],
          };
        }
      }
    );

    this.server.registerTool(
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
          const cart = cartApi.addMultipleToCart(username, normalizedPositions);
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
                text: `Error adding articles to cart: ${(error as any).message || "Unknown error"}`,
              },
            ],
          };
        }
      }
    );

    this.server.registerTool(
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
          return {
            content: [{type: "text", text: "No username provided."}],
          }
        }

        const cart = await cartApi.getCart(username);
        const totalItems = cart.positions.reduce(
          (sum, pos) => sum + (pos.quantity || 0),
          0
        );
        const message =
          cart.positions.length === 0
            ? `Cart for user "${username}" is empty.`
            : `Cart for user "${username}" contains ${cart.positions.length} position(s) with ${totalItems} total item(s): ${JSON.stringify(cart)}`;
        return {
          content: message ? [{ type: "text", text: message }] : [],
          structuredContent: { cart: { ...cart, username } },
        }
      }
    );

    this.server.registerTool(
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
          const orderId = cartApi.submitCart(username);
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
                text: `Error submitting cart: ${(error as any).message || "Unknown error"}`,
              },
            ],
          };
        }
      }
    );
    
    
    
		// Simple addition tool
		this.server.tool("add", { a: z.number(), b: z.number() }, async ({ a, b }) => ({
			content: [{ type: "text", text: String(a + b) }],
		}));

		// Calculator tool with multiple operations
		this.server.tool(
			"calculate",
			{
				operation: z.enum(["add", "subtract", "multiply", "divide"]),
				a: z.number(),
				b: z.number(),
			},
			async ({ operation, a, b }) => {
				let result: number;
				switch (operation) {
					case "add":
						result = a + b;
						break;
					case "subtract":
						result = a - b;
						break;
					case "multiply":
						result = a * b;
						break;
					case "divide":
						if (b === 0)
							return {
								content: [
									{
										type: "text",
										text: "Error: Cannot divide by zero",
									},
								],
							};
						result = a / b;
						break;
				}
				return { content: [{ type: "text", text: String(result) }] };
			},
		);
	}
}

export default {
	fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);

		if (url.pathname === "/sse" || url.pathname === "/sse/message") {
			return MyMCP.serveSSE("/sse").fetch(request, env, ctx);
		}

		if (url.pathname === "/mcp") {
			return MyMCP.serve("/mcp").fetch(request, env, ctx);
		}

		return new Response("Not found", { status: 404 });
	},
};
