import { test } from '@japa/runner'

test.group('home', () => {
  test('the website works', async ({ assert, client }) => {
    const response = await client.get('/');
    assert.equal(response.status(), 200);
  });
});