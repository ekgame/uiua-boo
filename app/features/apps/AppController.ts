import AppService from './AppService.js';
import { type HttpContext } from '@adonisjs/core/http';
import PendingApp from './PendingApp.js';
import { makeAbsoluteUrl } from '../../utils/url.js';

export default class AppController {
  async viewPendingApp({ view, params }: HttpContext) {
    const pendingApp = await PendingApp.findByOrFail('public_code', params.code)

    return view.render('pages/app/request', {
      pendingApp: pendingApp.serialize(),
      requestedPermissions: await pendingApp.requestedPermissionsArray(),
    });
  }

  async submitPendingApp({ request, auth, params, session, response }: HttpContext) {
    const user = auth.getUserOrFail();
    const pendingApp = await PendingApp.findByOrFail('public_code', params.code);

    if (pendingApp.status !== 'PENDING') {
      session.flash('error', 'App request is no longer pending.');
      return response.redirect().back();
    }

    const action = request.input('action');
    if (action === 'approve') {
      await AppService.approvePendingApp(pendingApp, user);
    } else if (action === 'deny') {
      await AppService.denyPendingApp(pendingApp);
    } else {
      session.flash('error', 'Invalid action');
    }

    return response.redirect().back();
  }

  async apiRequestApp({ request }: HttpContext) {
    const { app_name, requested_permissions } = request.body();
    const pendingApp = await AppService.createPendingApp(app_name, requested_permissions);
    
    return {
      private_code: pendingApp.privateCode,
      public_code: pendingApp.publicCode,
      expires_at: pendingApp.expiresAt.toISO(),
      request_url: makeAbsoluteUrl('auth.request.view', { code: pendingApp.publicCode }),
    };
  }

  async apiPendingAppStatus({ params }: HttpContext) {
    const pendingApp = await PendingApp.findByOrFail('private_code', params.code);
    let token = null;

    if (pendingApp.status === 'APPROVED' && pendingApp.accessToken) {
      token = pendingApp.accessToken;
    }

    return {
      status: pendingApp.status,
      expires_at: pendingApp.expiresAt.toISO(),
      requested_permissions: await pendingApp.requestedPermissionsArray(),
      access_token: !token ? null : {
        type: 'Bearer',
        token: token,
      },
    };
  }

  async apiDeleteAppRequest({ params }: HttpContext) {
    const pendingApp = await PendingApp.findByOrFail('private_code', params.code);
    await pendingApp.delete();
    return { status: 'ok' };
  }
}