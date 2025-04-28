import UserService from '#services/user_service';
import { UserRole } from '#types/user_role';
import { test } from '@japa/runner'

test.group('user', () => {
  test('create users', async ({ assert }) => {
    let user1 = await UserService.createOrUpdateUser({
      githubId: 1,
      githubName: 'test',
      githubUsername: 'test',
      email: 'test@example.com',
    });

    let user2 = await UserService.createOrUpdateUser({
      githubId: 2,
      githubName: 'test2',
      githubUsername: 'test2',
      email: 'test2@example.com',
    });

    assert.equal(user1.role, UserRole.ADMIN, 'First user role should be "admin"');
    assert.equal(user2.role, UserRole.USER, 'Second user role should be "user"');
  });
});