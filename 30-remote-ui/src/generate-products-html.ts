const escapeHtml = (text: string): string => {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
};

export const generateProductsHTML = (products: Array<{ articleNumber: string; description: string; normalPrice: number; articleImageUrl?: string }>, searchTerm: string): string => {
  const productsHTML = products.map(product => `
    <div class="product-card">
      <div class="product-image">
        <img src="${product.articleImageUrl || `https://webshop.transgourmet.ch/images/articles/120px/${product.articleNumber}.jpg`}" 
             alt="${product.description}" 
             onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'120\\' height=\\'120\\'%3E%3Crect fill=\\'%23ddd\\' width=\\'120\\' height=\\'120\\'/%3E%3Ctext fill=\\'%23999\\' font-family=\\'sans-serif\\' font-size=\\'14\\' x=\\'50%25\\' y=\\'50%25\\' text-anchor=\\'middle\\' dy=\\'.3em\\'%3ENo Image%3C/text%3E%3C/svg%3E';">
      </div>
      <div class="product-info">
        <h3 class="product-description">${escapeHtml(product.description)}</h3>
        <div class="product-details">
          <span class="product-number">Article: ${escapeHtml(product.articleNumber)}</span>
          <span class="product-price">CHF ${product.normalPrice.toFixed(2)}</span>
        </div>
      </div>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Transgourmet Search Results</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: white;
      padding: 20px;
      min-height: 100vh;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      overflow: hidden;
    }
    
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    
    .header h1 {
      font-size: 28px;
      font-weight: 600;
      margin-bottom: 10px;
    }
    
    .header .search-term {
      font-size: 18px;
      opacity: 0.9;
      font-weight: 300;
    }
    
    .header .results-count {
      font-size: 14px;
      opacity: 0.8;
      margin-top: 8px;
    }
    
    .products-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 24px;
      padding: 30px;
    }
    
    .product-card {
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 12px;
      overflow: hidden;
      transition: all 0.3s ease;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    
    .product-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
      border-color: #667eea;
    }
    
    .product-image {
      width: 100%;
      background: #f5f5f5;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    
    .product-image img {
      max-width: 100%;
      height: auto;
    }
    
    .product-info {
      padding: 20px;
    }
    
    .product-description {
      font-size: 16px;
      font-weight: 600;
      color: #333;
      margin-bottom: 12px;
      line-height: 1.4;
      min-height: 44px;
    }
    
    .product-details {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }
    
    .product-number {
      font-size: 12px;
      color: #666;
      font-weight: 500;
    }
    
    .product-price {
      font-size: 20px;
      font-weight: 700;
      color: #667eea;
    }
    
    .no-results {
      padding: 60px 30px;
      text-align: center;
      color: #666;
    }
    
    .no-results h2 {
      font-size: 24px;
      margin-bottom: 10px;
      color: #333;
    }
    
    .no-results p {
      font-size: 16px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Transgourmet Search Results</h1>
      <div class="search-term">Search: "${escapeHtml(searchTerm)}"</div>
      <div class="results-count">${products.length} product${products.length !== 1 ? 's' : ''} found</div>
    </div>
    ${products.length > 0 
      ? `<div class="products-grid">${productsHTML}</div>`
      : `<div class="no-results">
           <h2>No products found</h2>
           <p>Try a different search term</p>
         </div>`
    }
  </div>
</body>
</html>`;
};

