import AppService from './AppService.js';
import type { HttpContext } from '@adonisjs/core/http';
import PendingApp from './PendingApp.js';
import { request } from 'http';

export default class AppController {
  async viewPendingApp({ view, params }: HttpContext) {
    const pendingApp = await PendingApp.findByOrFail('code', params.code)

    return view.render('pages/app/request', {
      pendingApp: pendingApp.serialize(),
      requestedPermissions: await pendingApp.requestedPermissionsArray(),
    });
  }

  async submitPendingApp({ request, auth, params, session, response }: HttpContext) {
    const user = auth.getUserOrFail();
    const pendingApp = await PendingApp.findByOrFail('code', params.code);

    const action = request.input('action');
    if (action === 'approve') {
      await AppService.approvePendingApp(pendingApp, user);
    }
    else if (action === 'deny') {
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
      code: pendingApp.code,
      expires_at: pendingApp.expiresAt.toISO(),
    };
  }

  async apiPendingAppStatus({ params }: HttpContext) {
    const pendingApp = await PendingApp.findByOrFail('code', params.code);
    let appToken = null;

    if (pendingApp.status === 'APPROVED') {
    }

    return {
      status: pendingApp.status,
      expires_at: pendingApp.expiresAt.toISO(),
      requested_permissions: await pendingApp.requestedPermissionsArray(),
      app_token: appToken,
    };
  }

  async apiDeleteAppRequest({ params }: HttpContext) {
    const pendingApp = await PendingApp.findByOrFail('code', params.code);
    await pendingApp.delete();
    return { status: 'ok' };
  }
}