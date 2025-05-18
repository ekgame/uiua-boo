import Scope from "./Scope.js";
import User from "../users/User.js";
import { createScopeValidator, selectScopeValidator } from "./validators.js";
import logger from "@adonisjs/core/services/logger";
import db from '@adonisjs/lucid/services/db';
import { ScopeMemberRole } from "./ScopeMemberRole.js";

class ScopeService {
  async getMemberRole(user: User, scope: Scope): Promise<ScopeMemberRole|null> {
    const result = await db.query()
      .select('scope_member.member_type')
      .from('scope_member')
      .where('scope_member.scope_id', scope.id)
      .where('scope_member.user_id', user.id)
      .first();
    
    return result?.member_type || null;
  }

  async isMember(user: User, scope: Scope) {
    return this.getMemberRole(user, scope) !== null;
  }

  async createScope(user: User, name: string): Promise<Scope> {
    const validatedData = await createScopeValidator.validate({
      new_scope: name,
    });

    return await db.transaction(async (trx) => {
      const scope = await Scope.create({
        name: validatedData.new_scope,
      }, { client: trx });

      await scope
        .related('members')
        .attach(
          { [user.id]: { member_type: 'OWNER' } },
          trx
        );

      logger.info(`Scope "@${scope.name}" created by ${user.githubUsername}`);

      return scope;
    });
  }

  async getAvailableScopesForNewPackage(user: User | null | undefined): Promise<Scope[]> {
    if (!user) {
      return [];
    }

    return await user
      .related('scopes')
      .query()
      .where('scope_member.member_type', 'IN', ['OWNER', 'ADMIN']);
  }

  async validateSelectedScope(user: User, scopeName: String): Promise<Scope> {
    const validatedData = await selectScopeValidator.validate({
      selected_scope: scopeName,
    }, {
      meta: {
        user,
      },
    });

    return validatedData.selected_scope;
  }
}

export default new ScopeService();