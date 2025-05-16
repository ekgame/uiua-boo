import Package from './Package.js';
import Scope from '../scopes/Scope.js';
import User from '../users/User.js';
import ScopeService from '../scopes/ScopeService.js';
import { BasePolicy } from '@adonisjs/bouncer';

export default class PackagePolicy extends BasePolicy {
  async init(user: User, pack: Package): Promise<boolean> {
    if (!await ScopeService.isMember(user, pack.scope as Scope)) {
      return false;
    }

    // TODO: deny if the pack has versions
    return true;
  }
}