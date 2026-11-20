const test = require('node:test');
const assert = require('node:assert/strict');

const { startServer } = require('../server');

test('secure config endpoint exposes the backend Telegram chat id', async () => {
  process.env.INTERGRAM_CHAT_ID = 'chat-secret-123';

  const server = startServer(0);
  await new Promise((resolve) => server.once('listening', resolve));

  const port = server.address().port;
  const response = await fetch(`http://127.0.0.1:${port}/config`);
  const data = await response.json();

  assert.equal(response.status, 200);
  assert.equal(data.chatId, 'chat-secret-123');

  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
});
