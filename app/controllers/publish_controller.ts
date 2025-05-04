import type { HttpContext } from '@adonisjs/core/http';
import ScopeService from '#services/scope_service';

export default class PublishController {
  async scopeForm({ view, auth }: HttpContext) {
    return view.render('pages/publish/index', {
      availableScopes: await ScopeService.getAvailableScopesForNewPackage(auth.user),
    });
  }

  async submitScope({ request, response, session, auth, }: HttpContext) {
    const user = auth.getUserOrFail();
    let selectedScope = null;

    const action = request.input('action');
    if (action === 'create-scope') {
      selectedScope = await ScopeService.createScope(user, request.input('new_scope'));
    } else if (action === 'select-scope') {
      selectedScope = await ScopeService.validateSelectedScope(user, request.input('selected_scope'));
    }

    if (!selectedScope) {
      session.flashErrors({ general: 'Invalid action.' });
      return response.redirect().toRoute('package.publish');
    }

    return response.redirect().toRoute('package.publish.package_form', {
      scope: selectedScope.name,
    });
  }

  async packageForm({ view, auth, params }: HttpContext) {
    const user = auth.getUserOrFail();
    const selectedScope = await ScopeService.validateSelectedScope(user, params.scope);

    return view.render('pages/publish/create_package', {
      selectedScope,
    });
  }

  async submitPackage({ response, auth, params }: HttpContext) {
    const user = auth.getUserOrFail();
    const selectedScope = await ScopeService.validateSelectedScope(user, params.scope);

    // TODO: Implement package submission logic here

    return response.redirect().toRoute('package.publish.package_form', {
      scope: selectedScope.name,
    });
  }
}