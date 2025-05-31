import type { HttpContext } from '@adonisjs/core/http';
import ScopeService from '../scopes/ScopeService.js';
import PackageService from '../packages/PackageService.js';
import PublishService from './PublishService.js';
import { cuid } from '@adonisjs/core/helpers';
import PackagePublishJobModel, { PackagePublishJobStatus } from './PackagePublishJobModel.js';
import Package from '#features/packages/Package';
import Scope from '#features/scopes/Scope';
import PackagePolicy from '#features/packages/PackagePolicy';
import { Bouncer } from '@adonisjs/bouncer';
import { PackagePublishJob } from './PackagePublishJob.js';

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

  async apiCreatePublishJob({ request, response, auth }: HttpContext) {
    const user = auth.getUserOrFail();
    const data = await PublishService.validatePublishRequest(
      user,
      request.only(['scope', 'name', 'version']),
    );

    const job = await PackagePublishJobModel.create({
      packageId: data.package.id,
      version: data.version.toString(),
      status: PackagePublishJobStatus.PENDING,
    });

    return response.created({
      message: 'Successfully created a publishing job.',
      publishing_id: job.id,
    });
  }

  async apiUploadArchive({ request, response, auth }: HttpContext) {
    const user = auth.getUserOrFail();
    const jobId = request.input('publishing_id');
    const job = await PackagePublishJobModel.findOrFail(jobId);
    const jobPackage = await Package.findOrFail(job.packageId);
    
    await new Bouncer(user)
      .with(PackagePolicy)
      .authorize('publish', jobPackage);

    if (job.status !== PackagePublishJobStatus.PENDING) {
      return response.badRequest({
        message: 'The package is already being published or has been published.',
      });
    }

    const archiveFile = request.file('archive', {
      extnames: ['tgz', 'tar.gz'],
      size: '5mb',
    });

    if (!archiveFile) {
      return response.badRequest({
        message: 'No archive file provided or file type is not supported.',
      });
    }

    const archiveFileName = `${cuid()}.${archiveFile.extname}`;
    await archiveFile.moveToDisk(archiveFileName, 'fs');
    job.updateQueued(archiveFileName);

    PackagePublishJob.dispatch({
      publishingJobId: job.id,
    });

    return response.ok({
      message: 'Archive uploaded successfully, publishing job started.',
      publishing_id: job.id,
    });
  }
}