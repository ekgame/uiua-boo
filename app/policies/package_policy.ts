import Package from '#models/package';
import Scope from '#models/scope';
import User from '#models/user';
import ScopeService from '#services/scope_service';
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