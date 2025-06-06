import { HttpContext } from "@adonisjs/core/http";
import Scope from "./Scope.js";

export default class ScopeController {
  async packages({ params, view }: HttpContext) {
    const scope = await Scope.findByOrFail('name', params.scope);
    await scope.loadOnce('packages');

    return view.render('pages/scope/packages', {
      scope: scope,
    });
  }

  async members({ params, view }: HttpContext) {
    const scope = await Scope.findByOrFail('name', params.scope);
    await scope.loadOnce('members');

    return view.render('pages/scope/members', {
      scope: scope,
    });
  }

  async settings({ params, view }: HttpContext) {
    const scope = await Scope.findByOrFail('name', params.scope);

    // TODO: Implement scope settings logic

    return view.render('pages/scope/settings', {
      scope: scope,
    });
  }
}