import Package from "./Package.js";
import PackagePolicy from "./PackagePolicy.js";
import PackageService from "./PackageService.js";
import { errors, HttpContext } from "@adonisjs/core/http";
import PackageVersion from "./PackageVersion.js";

export default class PackageController {
  async packages({ view }: HttpContext) {
    return view.render('pages/packages');
  }

  async show({ view, params }: HttpContext) {
    const { pack, version } = await this.getPackageOrFail(params);

    return view.render('pages/package/show', {
      pack,
      version,
    });
  }

  async init({ response, view, params, bouncer }: HttpContext) {
    const { pack } = await this.getPackageOrFail(params);

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

  private async getPackageOrFail(params: Record<string, any>): Promise<{ pack: Package, version: PackageVersion|null }> {
    const { pack, version } = await PackageService.getPackageAndVersion(
      params.scope || null,
      params.name || null,
    );

    if (!pack) {
      throw new errors.E_HTTP_EXCEPTION(
        `Package @${params.scope}/${params.name} not found`,
        { status: 404 },
      );
    }

    return { pack, version };
  }
}