import PackagePolicy from "./PackagePolicy.js";
import { HttpContext } from "@adonisjs/core/http";
import { PackageResolver } from "./PackageResolver.js";
import { makeAbsoluteUrl } from "../../utils/url.js";

export default class PackageController {
  async packages({ view }: HttpContext) {
    return view.render('pages/packages');
  }

  async show({ view, params }: HttpContext) {
    const { pack, version } = await this.packageResolverFromParams(params)
      .defaultToStableVersion()
      .expectExactVersion()
      .resolveOrFail();

    return view.render('pages/package/show', {
      pack,
      version,
    });
  }

  async init({ response, view, params, bouncer }: HttpContext) {
    const { pack } = await this.packageResolverFromParams(params)
      .defaultToStableVersion()
      .resolveOrFail();

    if (await bouncer.with(PackagePolicy).denies('init', pack)) {
      return response.redirect().toRoute('package.show', {
        scope: pack.scope.reference,
        name: pack.name,
      });
    }

    return view.render('pages/package/init', {
      pack,
    });
  }

  async apiResolvePackage({ params, response }: HttpContext) {
    const { pack, version } = await this.packageResolverFromParams(params)
      .defaultToStableVersion()
      .expectVersion()
      .resolveOrFail();

    return response.ok({
      reference: pack.reference,
      version: version!.version,
      info_url: makeAbsoluteUrl('package.show', {
        scope: pack.scope.reference,
        name: `${pack.name}@${version!.version}`,
      }),
    });
  }

  private packageResolverFromParams(params: Record<string, any>): PackageResolver {
    let name = params.name;

    if (name) {
      name = decodeURIComponent(name);
    }

    return PackageResolver.fromScopeAndNameWithOptionalVersion(params.scope || null, name);
  }
}