import Scope from '#models/scope';
import User from '#models/user';
import db from '@adonisjs/lucid/services/db';
import vine, { SimpleMessagesProvider } from '@vinejs/vine';
import { FieldContext } from '@vinejs/vine/types';

export const createScopeValidator = vine.compile(
  vine.object({
    new_scope: vine.string()
      .minLength(2)
      .maxLength(32)
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
      .unique({table: 'scope', column: 'name'}),
  })
);

createScopeValidator.messagesProvider = new SimpleMessagesProvider({
  'new_scope.required': 'Scope name is required',
  'new_scope.minLength': 'Scope name must be at least {{ min }} characters long',
  'new_scope.maxLength': 'Scope name must be at most {{ max }} characters long',
  'new_scope.regex': 'Scope name can only contain lowercase letters, numbers, and dashes',
  'new_scope.database.unique': 'This scope already exists',
});

async function canUseScope(
  value: unknown,
  _: void,
  field: FieldContext
) {
  if (typeof value !== 'string') {
    return;
  }
  
  if (!field.isValid) {
    return;
  }

  const user = field.meta.user as User;
  const scope = await Scope.findByOrFail('name', value);
  const isAdmin = await db.query()
    .select(1)
    .from('scope_member')
    .where('scope_member.scope_id', scope.id)
    .where('scope_member.user_id', user.id)
    .where('scope_member.member_type', 'IN', ['ADMIN', 'OWNER'])
    .first();
    
  if (!isAdmin) {
    field.report('You are not allowed to use this scope', 'use.scope', field);
  }
}

const canUseScopeRule = vine.createRule(canUseScope);

export const selectScopeValidator = vine
  .withMetaData<{
    user: User,
  }>()
  .compile(
    vine
      .object({
        selected_scope: vine.string()
          .exists({table: 'scope', column: 'name'})
          .use(canUseScopeRule())
          .transform(async (value) => await Scope.findByOrFail('name', value)),
      })
  );

selectScopeValidator.messagesProvider = new SimpleMessagesProvider({
  'selected_scope.required': 'You must select a scope',
  'selected_scope.database.exists': 'Scope does not exist',
  'selected_scope.use.scope': 'You are not allowed to use this scope',
});