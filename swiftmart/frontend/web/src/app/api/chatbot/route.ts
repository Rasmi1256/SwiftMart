const CHATBOT_SERVICE_URL = 'http://localhost:3009';

export async function POST(req: Request) {
  const body = await req.json();

  console.log('Proxying to chatbot service at:', `${CHATBOT_SERVICE_URL}/chatbot`);

  const response = await fetch(`${CHATBOT_SERVICE_URL}/chatbot`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  return new Response(JSON.stringify(data), {
    status: response.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
