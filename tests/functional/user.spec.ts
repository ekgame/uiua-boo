import UserService from '#features/users/UserService';
import { UserRole } from '#features/users/UserRole';
import { test } from '@japa/runner'

test.group('user', () => {
  test('create users', async ({ assert }) => {
    const user1 = await UserService.createOrUpdateUser({
      githubId: 1,
      githubName: 'test',
      githubUsername: 'test',
      email: 'test@example.com',
    });

    const user2 = await UserService.createOrUpdateUser({
      githubId: 2,
      githubName: 'test2',
      githubUsername: 'test2',
      email: 'test2@example.com',
    });

    assert.equal(user1.role, UserRole.ADMIN, 'First user role should be "admin"');
    assert.equal(user2.role, UserRole.USER, 'Second user role should be "user"');

    await user1.delete();
    await user2.delete();
  });
});