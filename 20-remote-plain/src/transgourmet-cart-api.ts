/**
 * Shopping Cart API for Transgourmet
 * Mocked cart storage using a Map with username as key
 */

import { fetchTransgourmetArticleDetails } from "./transgourmet-api.ts";
import { randomUUID } from "node:crypto";

// Type definitions
export interface CartPosition {
	articleNumber: string;
	quantity: number;
}

export interface Cart {
	positions: CartPosition[];
}

export interface CartPositionDisplay {
	articleNumber: string;
	quantity: number;
	description: string;
	price: number;
	imageUrl: string;
}

export interface CartDisplay {
	positions: CartPositionDisplay[];
	totalPositions: number;
}


export class CartApi {

  private cartStorage: Map<string, Cart> = new Map();
  
  constructor(cartStorage: Map<string, Cart>) {
    this.cartStorage = cartStorage;
  }
  
  
/**
 * Internal helper to get raw cart data (synchronous)
 * @param username - The username to get the cart for
 * @returns Cart object with positions array
 */
getCartInternal(username: string): Cart {
	return this.cartStorage.get(username) || { positions: [] };
}

/**
 * Get cart for a specific user with full product details
 * @param username - The username to get the cart for
 * @returns CartDisplay object with positions array and totalPositions
 */
async getCart(username: string): Promise<CartDisplay> {
	console.log("Getting cart for username:", username); 
	const cart = this.getCartInternal(username);
	
	// Fetch product details for each position via the API
	const positions: CartPositionDisplay[] = [];
	for (const pos of cart.positions) {
		try {
			// Fetch article details by article number
			const articleDetails = await fetchTransgourmetArticleDetails(pos.articleNumber);
			
			positions.push({
				articleNumber: pos.articleNumber,
				quantity: pos.quantity,
				description: articleDetails.description || "",
				price: articleDetails.normalPrice,
				imageUrl: `https://webshop.transgourmet.ch/images/articles/120px/${pos.articleNumber}.jpg`,
			});
		} catch (error) {
			console.error(`Error fetching product details for ${pos.articleNumber}:`, error);
			// Return with defaults if API call fails
			positions.push({
				articleNumber: pos.articleNumber,
				quantity: pos.quantity,
				description: "",
				price: 0,
				imageUrl: `https://webshop.transgourmet.ch/images/articles/120px/${pos.articleNumber}.jpg`,
			});
		}
	}
	
	const totalPositions = positions.reduce((total, pos) => total + pos.quantity, 0);
	return {
		positions,
		totalPositions,
	};
}

/**
 * Add or update a position in the cart
 * @param username - The username to add the position for
 * @param articleNumber - The article number to add
 * @param quantity - The quantity to add (will update if article already exists)
 * @returns Updated cart
 */
addToCart(
	username: string,
	articleNumber: string,
	quantity: number,
): Cart {
	const cart = this.getCartInternal(username);
	const existingPositionIndex = cart.positions.findIndex(
		(pos) => pos.articleNumber === articleNumber,
	);

	if (existingPositionIndex >= 0) {
		// Update existing position
		cart.positions[existingPositionIndex].quantity += quantity;
	} else {
		// Add new position
		cart.positions.push({ articleNumber, quantity });
	}

	this.cartStorage.set(username, cart);
	return cart;
}

/**
 * Add or update multiple positions in the cart at once
 * @param username - The username to add the positions for
 * @param positions - Array of cart positions to add (will update if articles already exist)
 * @returns Updated cart
 */
addMultipleToCart(
	username: string,
	positions: CartPosition[],
): Cart {
	const cart = this.getCartInternal(username);

	for (const position of positions) {
		const existingPositionIndex = cart.positions.findIndex(
			(pos) => pos.articleNumber === position.articleNumber,
		);

		if (existingPositionIndex >= 0) {
			// Update existing position
			cart.positions[existingPositionIndex].quantity += position.quantity;
		} else {
			// Add new position
			cart.positions.push({
				articleNumber: position.articleNumber,
				quantity: position.quantity,
			});
		}
	}

	this.cartStorage.set(username, cart);
	return cart;
}

/**
 * Remove a position from the cart
 * @param username - The username to remove the position for
 * @param articleNumber - The article number to remove
 * @returns Updated cart
 */
removeFromCart(username: string, articleNumber: string): Cart {
	const cart = this.getCartInternal(username);
	cart.positions = cart.positions.filter(
		(pos) => pos.articleNumber !== articleNumber,
	);
	this.cartStorage.set(username, cart);
	return cart;
}

/**
 * Update the quantity of a position in the cart
 * @param username - The username to update the position for
 * @param articleNumber - The article number to update
 * @param quantity - The new quantity (must be > 0)
 * @returns Updated cart
 */
updateCartPosition(
	username: string,
	articleNumber: string,
	quantity: number,
): Cart {

	const cart = this.getCartInternal(username);
	const existingPositionIndex = cart.positions.findIndex(
		(pos) => pos.articleNumber === articleNumber,
	);

	if (existingPositionIndex >= 0) {
		cart.positions[existingPositionIndex].quantity = quantity;
	} else {
		cart.positions.push({ articleNumber, quantity });
	}

	this.cartStorage.set(username, cart);
	return cart;
}

/**
 * Clear the entire cart for a user
 * @param username - The username to clear the cart for
 */
clearCart(username: string): void {
	this.cartStorage.set(username, { positions: [] });
}

/**
 * Get the total number of items in the cart
 * @param username - The username to get the cart item count for
 * @returns Total number of items (sum of all quantities)
 */
getCartItemCount(username: string): number {
	const cart = this.getCartInternal(username);
	return cart.positions.reduce((total, pos) => total + pos.quantity, 0);
}

/**
 * Submit the cart and return an order ID
 * @param username - The username to submit the cart for
 * @returns Order ID as a UUID string
 */
submitCart(username: string): string {
	const orderId = randomUUID();
	// Clear the cart after submission
	console.log("*".repeat(20));
	console.log("Submitting cart for username:", username, "with order ID:", orderId);
	console.log("*".repeat(20));
	this.clearCart(username);
	return orderId;
}
}

