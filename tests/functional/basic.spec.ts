import { test } from '@japa/runner'

test.group('basic', () => {
  test('health check', async ({ assert, client }) => {
    const response = await client.get('/');
    assert.equal(response.status(), 200);
  })
})