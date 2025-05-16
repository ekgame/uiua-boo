import Scope from './Scope.js';
import User from '../users/User.js';
import ScopeService from './ScopeService.js';
import { BasePolicy } from '@adonisjs/bouncer';

export default class ScopePolicy extends BasePolicy {
  /**
   * Check if the user can use the scope (to create a new package).
   * User has to be a member of the scope with 'OWNER' or 'ADMIN' role.
   */
  async use(user: User, scope: Scope): Promise<boolean> {
    const role = await ScopeService.getMemberRole(user, scope);
    return role === 'OWNER' || role === 'ADMIN';
  }
}