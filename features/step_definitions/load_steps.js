const { Given } = require('@cucumber/cucumber');
const axios = require('axios');

const API_URL = process.env.PRODUCTS_API_URL || 'http://localhost:8080/api/products';

function parseBoolean(value, columnName) {
  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  throw new Error(`Invalid boolean value '${value}' in '${columnName}' column.`);
}

Given('the following products', async function (dataTable) {
  // Fail setup if the service is unavailable or cleanup is incomplete; otherwise
  // a scenario could pass/fail against stale data from an earlier run.
  const response = await axios.get(API_URL);
  if (!Array.isArray(response.data)) {
    throw new Error(`Expected ${API_URL} to return an array of products.`);
  }

  for (const product of response.data) {
    if (product.id !== undefined && product.id !== null) {
      await axios.delete(`${API_URL}/${encodeURIComponent(product.id)}`);
    }
  }

  const rows = dataTable.hashes();
  for (const row of rows) {
    const price = Number(row.price);
    if (!Number.isFinite(price)) {
      throw new Error(`Invalid price '${row.price}' for product '${row.name}'.`);
    }

    const payload = {
      name: row.name,
      description: row.description,
      price,
      available: parseBoolean(row.available, 'available'),
      category: String(row.category).trim().toUpperCase()
    };

    try {
      await axios.post(API_URL, payload, {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      const detail = error.response
        ? JSON.stringify(error.response.data)
        : error.message;
      throw new Error(`Failed to create product '${row.name}': ${detail}`);
    }
  }
});
