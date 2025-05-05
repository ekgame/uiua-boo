import { test } from '@japa/runner';
import ScopeService from '#services/scope_service';
import UserService from '#services/user_service';
import User from '#models/user';
import Scope from '#models/scope';
import PackageService from '#services/package_service';

test.group('package', (group) => {
  let user1: User;
  let user2: User;

  let scope1: Scope;
  let scope2: Scope;

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

    scope1 = await ScopeService.createScope(user1, 'test-scope1');
    scope2 = await ScopeService.createScope(user2, 'test-scope2');

    return async () => {
      await user1.delete();
      await user2.delete();
      await scope1.delete();
      await scope2.delete();
    };
  });

  test('create package', async ({ assert }) => {
    const pack = await PackageService.createPackage(scope1, 'test-package');

    assert.equal(pack.name, 'test-package', 'Package name should be "test-package"');
    assert.equal(pack.scope.id, scope1.id, 'Package scope should be the same as the scope it was created in');

    await pack.delete();
  });

  test('fail on duplicate package name', async ({ assert }) => {
    const pack1 = await PackageService.createPackage(scope1, 'test-package');
    // Should fail to create a second package with the same name
    await assert.rejects(() => PackageService.createPackage(scope1, 'test-package'));
    // Should allow to create a package with the same name in a different scope

    const pack2 = await PackageService.createPackage(scope2, 'test-package');
    // Should fail to create a second package with the same name in the second scope
    await assert.rejects(() => PackageService.createPackage(scope2, 'test-package'));

    await pack1.delete();
    await pack2.delete();
  });

  test('resolve package by scope and name', async ({ assert }) => {
    const pack = await PackageService.createPackage(scope1, 'test-package');
    const resolvedPack = await PackageService.getPackage(scope1.name, pack.name);

    assert.exists(resolvedPack, 'Package should exist');
    assert.equal(pack.id, resolvedPack?.id, 'Package ids should be equal');

    const nonExistantPack = await PackageService.getPackage(scope1.name, 'non-existant-package');
    assert.notExists(nonExistantPack, 'Non-existent package should not exist');

    const nonExistantPackInDifferentScope = await PackageService.getPackage(scope2.name, 'test-package');
    assert.notExists(nonExistantPackInDifferentScope, 'Package should not exist in a different scope');

    await pack.delete();
  });
});