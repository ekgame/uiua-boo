import vine from '@vinejs/vine'

const appPermission = vine.group([
  vine.group.if((data) => data.type === 'package.upload-new-version', {
    type: vine.literal('package.upload-new-version'),
    scope: vine.string().minLength(2).maxLength(32),
    name: vine.string().maxLength(32).optional(),
    version: vine.string().maxLength(32).optional(),
  }),
]);

export const appPermissionSchema = vine
  .object({
    type: vine.enum([
      'package.upload-new-version',
    ]),
  })
  .merge(appPermission);

export const appPermissionsArraySchema = vine.compile(
  vine.array(appPermissionSchema).minLength(1)
);

export const pendingAppSchema = vine.compile(
  vine.object({
    app_name: vine.string().minLength(2).maxLength(32),
    requested_permissions: vine.array(appPermissionSchema),
  }),
);
