import Scope from "#models/scope";
import User from "#models/user";
import { createScopeValidator, selectScopeValidator } from "#validators/scope";
import logger from "@adonisjs/core/services/logger";
import db from '@adonisjs/lucid/services/db';

class ScopeService {
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
          {
            [user.id]: {
              member_type: 'OWNER',
            }
          },
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

  async validateSelectScope(user: User, scopeName: String): Promise<Scope> {
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