import type { HttpContext } from '@adonisjs/core/http';
import ScopeService from '../scopes/ScopeService.js';
import PackageService from '../packages/PackageService.js';
import PublishService from './PublishService.js';
import { cuid } from '@adonisjs/core/helpers';

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
    } else {
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

  async submitPackage({ request, response, auth, params }: HttpContext) {
    const user = auth.getUserOrFail();
    const selectedScope = await ScopeService.validateSelectedScope(user, params.scope);

    const pack = await PackageService.createPackage(
      selectedScope,
      request.input('package_name'),
    );
    
    return response.redirect().toRoute('package.init', {
      scope: selectedScope.identifier,
      name: pack.name,
    });
  }

  async apiSubmitPackage({ request, response, auth }: HttpContext) {
    const user = auth.getUserOrFail();
    const data = await PublishService.validatePublishRequest(
      user,
      request.only(['scope', 'name', 'version']),
    );

    return response.created({
      message: 'Successfully submitted package for publishing.',
      job_id: cuid(),
    });
  }
}