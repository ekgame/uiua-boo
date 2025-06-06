import PackagePolicy from "./PackagePolicy.js";
import { HttpContext } from "@adonisjs/core/http";
import { PackageResolver } from "./PackageResolver.js";
import { makeAbsoluteUrl } from "../../utils/url.js";
import PackageVersion from "./PackageVersion.js";
import drive from "@adonisjs/drive/services/main";
import { marked } from 'marked';
import createDOMPurify, { WindowLike } from 'dompurify';
import { JSDOM } from 'jsdom';
import markedFootnote from 'marked-footnote';
import { uiuaifyNameToIdentifier } from "../../utils/uiua.js";
import Package from "./Package.js";
import { PackageFileNode, PackageFileSystem } from "../../utils/files.js";
import { errors } from "@adonisjs/core";

export default class PackageController {
  async packages({ view }: HttpContext) {
    return view.render('pages/packages');
  }

  async getVersionOverviewData(pack: Package, version: PackageVersion) {
    let readme = null;

    const disk = drive.use('fs')
    const readmeFile = await version.getFile('README.md');
    if (readmeFile && readmeFile.fileKey) {
      const content = await disk.get(readmeFile.fileKey);
      if (content) {
        const md = marked
          .use(markedFootnote())
          .use({
            pedantic: false,
            gfm: true,
          });

        const window = new JSDOM('').window as unknown as WindowLike;
        const purify = createDOMPurify(window);
        readme = purify.sanitize(await md.parse(content));
      }
    }

    const hasLibraryFile = await version.getFile('lib.ua');
    const hasExecutableFile = await version.getFile('main.ua');

    let importStatement = null;
    if (hasLibraryFile) {
      const identifier = uiuaifyNameToIdentifier(pack.name);
      importStatement = `${identifier} ~ "boo:${pack.reference}"`;
    }
    
    return {
      readme,
      hasLibraryFile,
      hasExecutableFile,
      importStatement,
    };
  }

  async show({ view, params }: HttpContext) {
    const { pack, version } = await this.packageResolverFromParams(params)
      .defaultToStableVersion()
      .expectExactVersion()
      .resolveOrFail();

    let versionData = null;
    if (version) {
      versionData = await this.getVersionOverviewData(pack, version);
    }

    return view.render('pages/package/show', {
      pack,
      version,
      ...versionData
    });
  }

  async files({ view, params }: HttpContext) {
    const { pack, version } = await PackageResolver
      .fromScopeAndName(params.scope, params.name)
      .withVersion(params.version)
      .expectExactVersion()
      .expectVersion()
      .resolveOrFail();

    const packageVersion = version!;
    await packageVersion.loadOnce('files');
    
    const fileSystem = new PackageFileSystem(packageVersion);
    fileSystem.addFiles(packageVersion.files);
    await fileSystem.finalize();

    const path = (params['*'] || ['']).join('/');
    const fileNode = fileSystem.resolveFile(path);

    if (!fileNode) {
      throw new errors.E_HTTP_EXCEPTION(
        `File '${path}' not found`,
        { status: 404 },
      );
    }

    let fileContent = null;
    if (fileNode.isFile && fileNode.file && fileNode.file.fileKey && fileNode.file.isPreviewable) {
      const disk = drive.use('fs');
      fileContent = await disk.get(fileNode.file.fileKey);
    }

    return view.render('pages/package/files', {
      pack,
      version,
      fileNode,
      fileContent,
      generateFileUrl: (fileNode: PackageFileNode) => fileSystem.generateFileUrl(fileNode),
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