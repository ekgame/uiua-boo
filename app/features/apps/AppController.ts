import AppService from './AppService.js';
import type { HttpContext } from '@adonisjs/core/http';

export default class AppController {
  /**
   * Allow a logged in user to approve an app to act on their behalf.
   * This shows a 
   */
  async viewAppApproval({ auth }: HttpContext) {

  }

  async submitAppApproval({ auth }: HttpContext) {

  }

  async apiRequestApp({ request }: HttpContext) {
    const { app_name, requested_permissions } = request.body();
    const pendingApp = await AppService.createPendingApp(app_name, requested_permissions);
    
    return {
      code: pendingApp.code,
      expires_at: pendingApp.expiresAt.toISO(),
    };
  }
}