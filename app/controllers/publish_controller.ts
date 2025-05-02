import type { HttpContext } from '@adonisjs/core/http';
import ScopeService from '#services/scope_service';

export default class PublishController {
  async view({ view, auth }: HttpContext) {
    return view.render('pages/publish', {
      availableScopes: await ScopeService.getAvailableScopesForNewPackage(auth.user),
    });
  }

  async submit({ request, view, auth }: HttpContext) {
    const user = auth.getUserOrFail();

    let selectedScope = null;

    const action = request.input('action');
    if (action === 'create-scope') {
      selectedScope = await ScopeService.createScope(user, request.input('new_scope'));
    } else if (action === 'select-scope') {
      selectedScope = await ScopeService.validateSelectScope(user, request.input('selected_scope'));
    } else if (action === 'create-package') {
      selectedScope = await ScopeService.validateSelectScope(user, request.input('selected_scope'));
    }

    return view.render('pages/publish', {
      availableScopes: await ScopeService.getAvailableScopesForNewPackage(user),
      selectedScope,
    });
  }
}