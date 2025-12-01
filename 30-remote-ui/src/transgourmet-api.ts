/**
 * Makes an API call with a search term and returns the response
 * @param searchTerm - The search term to query the API with
 * @param page - Page number (default: 0)
 * @param pageSize - Number of results per page (default: 3)
 * @param searchInSalesOrderSet - Whether to search in sales order set (default: false)
 * @returns Array of objects containing articleNumber, description, and normalPrice
 */
export async function searchTransgourmetCatalog(
	searchTerm: string,
): Promise<Array<{ articleNumber: string; description: string; normalPrice: number }>> {
	try {
		const apiUrl = "https://webshop.transgourmet.ch/api/webshop/hub/search-articles/search";

		const response = await fetch(apiUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				searchTerm,
				page: 0,
				pageSize: 3,
			}),
		});

		if (!response.ok) {
			throw new Error(`API request failed: ${response.status} ${response.statusText}`);
		}

		const data = await response.json() as { articles?: Array<any> };
		
		// Extract only articleNumber, description, and normalPrice from each article
		const articles = data?.articles || [];
		const extractedItems = articles
			.filter((article: any) => article && Object.keys(article).length > 0) // Filter out empty objects
			.map((article: any) => ({
				articleNumber: article.articleNumber,
				description: article.description,
				normalPrice: article.normalPrice,
				articleImageUrl: `https://webshop.transgourmet.ch/images/articles/120px/${article.articleNumber}.jpg`
			}));

		return extractedItems;
	} catch (error) {
		console.error("Error calling search API:", error);
		throw error;
	}
}

/**
 * Fetches article details by article number
 * @param articleNumber - The article number to fetch etails for
 * @returns Object containing articleText, articleNumber, weight, and herkunftsland
 */
export async function fetchTransgourmetArticleDetails(
	articleNumber: string,
): Promise<{
  description: string;
  articleNumber: string;
  normalPrice: number;
}> {
	try {
		const apiUrl = `https://webshop.transgourmet.ch/api/webshop/hub/bgh/articledetails/${articleNumber}`;
		console.log("Fetching article details for:", apiUrl);

		const response = await fetch(apiUrl, {
			method: "GET",
			headers: {
        "Accept": "application/json, text/plain, */*",
			},
		});

		if (!response.ok) {
			throw new Error(`API request failed: ${apiUrl} - ${response.status} ${response.statusText}`);
		}

		const data = await response.json() as {
				description: string;
				articleNumber: string;
				normalPrice: number;
			};

		// Use first entry in article.zzArticles if present, otherwise use article directly
		const articleData = data;

		if (!articleData) {
			throw new Error("Article data not found in response");
		}


		return {
			articleNumber: data.articleNumber,
			description: data.description,
      normalPrice: data.normalPrice
		};
	} catch (error) {
		console.error("Error calling article details API:", error);
		throw error;
	}
}

