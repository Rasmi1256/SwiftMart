import fetch from 'node-fetch';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api/products';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'your_admin_token_here'; // Replace with actual admin token

interface UpdateProductPayload {
  isAvailable: boolean;
}

async function updateProductAvailability(productId: string, isAvailable: boolean) {
  const url = `${API_BASE_URL}/${productId}`;
  const payload: UpdateProductPayload = { isAvailable };

  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Failed to update product availability:', errorData.message);
      return;
    }

    const data = await response.json();
    console.log(`Product ${productId} availability updated to ${isAvailable}:`, data);
  } catch (error) {
    console.error('Error updating product availability:', error);
  }
}

// Example usage: update product availability
const productId = process.argv[2];
const availabilityArg = process.argv[3];

if (!productId || !availabilityArg) {
  console.error('Usage: ts-node updateProductAvailability.ts <productId> <true|false>');
  process.exit(1);
}

const isAvailable = availabilityArg.toLowerCase() === 'true';

updateProductAvailability(productId, isAvailable);
