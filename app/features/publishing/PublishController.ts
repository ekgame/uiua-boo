import type { HttpContext } from '@adonisjs/core/http';
import ScopeService from '../scopes/ScopeService.js';
import PackageService from '../packages/PackageService.js';
import PublishService from './PublishService.js';
import PackagePublishJobModel, { PackagePublishJobStatus } from './PackagePublishJobModel.js';
import PackagePolicy from '#features/packages/PackagePolicy';
import { Bouncer } from '@adonisjs/bouncer';
import PackagePublishJob from '#jobs/PackagePublishJob';
import { generatePendingPackageArchiveFileKey } from '../../utils/files.js';

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
      scope: selectedScope.reference,
      name: pack.name,
    });
  }

  async apiCreatePublishJob({ request, response, auth }: HttpContext) {
    const user = auth.getUserOrFail();
    const data = await PublishService.validatePublishRequest(
      user,
      request.only(['name', 'version']),
    );

    const job = await PackagePublishJobModel.create({
      packageId: data.package.id,
      version: data.version.toString(),
      status: PackagePublishJobStatus.PENDING,
    });

    return response.created(await this.presentPublishingJob(job));
  }

  async apiUploadArchive({ request, response, auth, params }: HttpContext) {
    const user = auth.getUserOrFail();
    const job = await PackagePublishJobModel.findOrFail(params.jobId);
    await job.loadOnce('relatedPackage');
    
    await new Bouncer(user)
      .with(PackagePolicy)
      .authorize('publish', job.relatedPackage);

    if (job.status !== PackagePublishJobStatus.PENDING) {
      return response.badRequest({
        message: 'The package is already being published or has been published.',
      });
    }

    const archiveFile = request.file('archive', {
      extnames: ['tar.gz'],
      size: '5mb',
    });

    if (!archiveFile) {
      return response.badRequest({
        message: 'No archive file provided or file type is not supported.',
      });
    }

    const archiveFileName = generatePendingPackageArchiveFileKey();
    await archiveFile.moveToDisk(archiveFileName, 'fs');

    await PackagePublishJob.dispatch({
      publishingJobId: job.id,
    }, { delay: 100 });

    await job.updateQueued(archiveFileName);

    return response.ok(await this.presentPublishingJob(job));
  }

  async apiPublishJobStatus({ response, auth, params }: HttpContext) {
    const user = auth.getUserOrFail();
    const job = await PackagePublishJobModel.findOrFail(params.jobId);
    await job.loadOnce('relatedPackage');

    await new Bouncer(user)
      .with(PackagePolicy)
      .authorize('publish', job.relatedPackage);

    return response.ok(await this.presentPublishingJob(job));
  }

  private async presentPublishingJob(job: PackagePublishJobModel) {
    await job.loadOnce('relatedPackage');

    return {
      publishing_id: job.id,
      package_name: job.relatedPackage.reference,
      publishing_version: job.version,
      status: job.status,
      result: job.result ? JSON.parse(job.result) : null,
    };
  }
}