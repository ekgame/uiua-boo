import vine from '@vinejs/vine';

export const createScopeValidator = vine.object({
  name: vine.string()
    .minLength(2)
    .maxLength(32)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    .unique({table: 'scope', column: 'name'}),
});