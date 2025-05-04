import Package from "#models/package";
import PackagePolicy from "#policies/package_policy";
import PackageService from "#services/package_service";
import { errors, HttpContext } from "@adonisjs/core/http";

export default class PackageController {
  private async getPackageOrFail(params: Record<string, any>): Promise<Package> {
    const pack = await PackageService.getPackage(
      params.scope || null,
      params.name || null,
    );

    if (!pack) {
      throw new errors.E_HTTP_EXCEPTION(
        `Package @${params.scope}/${params.name} not found`,
        { status: 404 },
      );
    }

    return pack;
  }

  async show({ view, params }: HttpContext) {
    const pack = await this.getPackageOrFail(params);

    return view.render('pages/package/show', {
      pack,
    });
  }

  async init({ response, view, params, bouncer }: HttpContext) {
    const pack = await this.getPackageOrFail(params);
    
    if (await bouncer.with(PackagePolicy).denies('init', pack)) {
      return response.redirect().toRoute('package.show', {
        scope: pack.scope.identifier,
        name: pack.name,
      });
    }

    return view.render('pages/package/init', {
      pack,
    });
  }
}