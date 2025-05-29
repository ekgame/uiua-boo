import vine from '@vinejs/vine'
import { concatRegex } from '../../utils/validation.js';
import { Infer } from '@vinejs/vine/types';

export const scopeWithOptionalPackageAndVersion = /(?<scope>[a-z0-9]+(-[a-z0-9]+)*)(\/(?<name>[a-z0-9]+(-[a-z0-9]+)*)(@(?<version>[a-z0-9\.\-\+]+))?)?/;

const appPermission = vine.union([
  vine.union.if(
    (value) => vine.helpers.isString(value) && value.startsWith('package.upload-new-version:'),
    vine.string().regex(concatRegex(/^package\.upload-new-version:/, scopeWithOptionalPackageAndVersion, /$/)),
  ),
  vine.union.else(vine.enum([
    'user.profile',
  ]))
]);

export const appPermissionsArraySchema = vine.compile(
  vine.array(appPermission).minLength(1)
);

export const pendingAppSchema = vine.compile(
  vine.object({
    app_name: vine.string().minLength(2).maxLength(32),
    requested_permissions: vine.array(appPermission).minLength(1),
  }),
);

export type AccessTokenPermission ={
  type: 'package.upload-new-version';
  scope: string;
  name?: string;
  version?: string;
} | {
  type: string;
};

export function parsePermissionString(string: Infer<typeof appPermission>): AccessTokenPermission  {
  if (string.startsWith('package.upload-new-version:')) {
    const identifier = string.split(':')[1];
    const match = identifier.match(scopeWithOptionalPackageAndVersion);
    if (!match?.groups) {
      return { type: string };
    }
    
    return {
      type: 'package.upload-new-version',
      scope: match.groups.scope,
      name: match.groups.name,
      version: match.groups.version,
    };
  }

  return { type: string };
}