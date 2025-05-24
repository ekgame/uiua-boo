import { test } from '@japa/runner';
import ScopeService from '#features/scopes/ScopeService';
import UserService from '#features/users/UserService';
import User from '#features/users/User';

test.group('scope', (group) => {
  let user1: User;
  let user2: User;

  group.setup(async () => {
    user1 = await UserService.createOrUpdateUser({
      githubId: 1,
      githubName: 'test',
      githubUsername: 'test',
      email: 'test@example.com',
    });

    user2 = await UserService.createOrUpdateUser({
      githubId: 2,
      githubName: 'test2',
      githubUsername: 'test2',
      email: 'test2@example.com',
    });

    return async () => {
      await user1.delete();
      await user2.delete();
    };
  });

  test('create scope', async ({ assert }) => {
    const scope = await ScopeService.createScope(user1, 'test-scope');
    assert.equal(scope.name, 'test-scope', 'Scope name should be "test-scope"');

    await scope.load('members', (query) => {
      query.pivotColumns(['member_type']);
    });

    assert.equal(scope.members.length, 1, 'New scope should have one member');

    const member = scope.members[0];
    assert.equal(member.id, user1.id, 'Member should be the creator');
    assert.equal(member.$extras.pivot_member_type, 'OWNER', 'Member type should be "OWNER"');

    await scope.delete();
  });

  test('do not allow duplicate scopes', async ({ assert }) => {
    const scope = await ScopeService.createScope(user1, 'test-scope');

    await assert.rejects(() => {
      return ScopeService.createScope(user1, 'test-scope');
    });

    await assert.rejects(() => {
      return ScopeService.createScope(user2, 'test-scope');
    });

    await scope.delete();
  });

  test('available scopes', async ({ assert }) => {
    const availableScopesBecore = await ScopeService.getAvailableScopesForNewPackage(user1);
    assert.equal(availableScopesBecore.length, 0, 'User should not have any scopes before creating one');

    const availableScopesBefore2 = await ScopeService.getAvailableScopesForNewPackage(user2);
    assert.equal(availableScopesBefore2.length, 0, 'User should not have any scopes before creating one');

    const scope1 = await ScopeService.createScope(user1, 'test-scope');
    const availableScopesAfter = await ScopeService.getAvailableScopesForNewPackage(user1);
    assert.equal(availableScopesAfter.length, 1, 'User should have one scope after creating one');

    const scope2 = await ScopeService.createScope(user2, 'test-scope2');
    const scope3 = await ScopeService.createScope(user2, 'test-scope3');
    const availableScopesAfter2 = await ScopeService.getAvailableScopesForNewPackage(user2);
    assert.equal(availableScopesAfter2.length, 2, 'User should have two scopes after creating two');

    const availableScopesAfter3 = await ScopeService.getAvailableScopesForNewPackage(user1);
    assert.equal(availableScopesAfter3.length, 1, 'User should still have one scope after other user created two');

    await scope1.delete();
    await scope2.delete();
    await scope3.delete();
  });

  test('select scope for new package', async ({ assert }) => {
    const scope = await ScopeService.createScope(user1, 'test-scope');

    const validatedScope = await ScopeService.validateSelectedScope(user1, scope.name);
    assert.equal(validatedScope.name, scope.name, 'Should validate the selected scope for the user');

    await assert.rejects(() => {
      return ScopeService.validateSelectedScope(user2, scope.name);
    });

    await assert.rejects(() => {
      return ScopeService.validateSelectedScope(user1, 'this-scope-does-not-exist');
    });

    await scope.delete();
  });
});