import Package from './Package.js';
import Scope from '../scopes/Scope.js';
import User from '../users/User.js';
import ScopeService from '../scopes/ScopeService.js';
import { AuthorizationResponse, BasePolicy } from '@adonisjs/bouncer';
import UserService from '#features/users/UserService';

export default class PackagePolicy extends BasePolicy {
  async init(user: User, pack: Package): Promise<AuthorizationResponse> {
    if (!await ScopeService.isMember(user, pack.scope as Scope)) {
      return AuthorizationResponse.deny("You are not a member of this scope.");
    }

    // TODO: deny if the pack has versions
    
    return AuthorizationResponse.allow();
  }

  async publish(user: User, pack: Package): Promise<AuthorizationResponse> {
    if (!await ScopeService.isMember(user, pack.scope as Scope)) {
      return AuthorizationResponse.deny("You are not a member of this scope.");
    }

    if (UserService.accessTokenHasPermission(user.currentAccessToken, {
        type: 'package.upload-new-version',
        scope: pack.scope.identifier,
        name: pack.name,
    })) {
      return AuthorizationResponse.deny("You don't have permission to upload a new version of this package.");
    }

    return AuthorizationResponse.allow();
  }
}