/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import { middleware } from './kernel.js';

import HomeController from '../app/features/home/HomeController.js';
import PackageController from '../app/features/packages/PackageController.js';
import AuthController from '../app/features/users/AuthController.js';
import PublishController from '../app/features/publishing/PublishController.js';
import AppController from '../app/features/apps/AppController.js';
import ScopeController from '#features/scopes/ScopeController';

// TODO: add admin requirement for the dashboard
router.jobs()

router.get('/', [HomeController, 'home']).as('home');
router.get('/packages', [PackageController, 'packages']).as('browse.packages');

router.get('/login/github', [AuthController, 'login']).as('auth.login').use(middleware.guest());
router.get('/login/github/callback', [AuthController, 'callback']).as('auth.login.callback');
router.get('/logout', [AuthController, 'logout']).as('auth.logout').use(middleware.auth());

router
  .group(() => {
    router.get('/', [PublishController, 'scopeForm']).as('package.publish');
    router.post('/', [PublishController, 'submitScope']).as('package.publish.submit_scope').use(middleware.auth());
    router.get('/:scope', [PublishController, 'packageForm']).as('package.publish.package_form').use(middleware.auth());
    router.post('/:scope', [PublishController, 'submitPackage']).as('package.publish.submit_package').use(middleware.auth());
  })
  .prefix('/publish')

router
  .group(() => {
    router.get('/', [ScopeController, 'packages']).as('scope.packages');
    router.get('/~/members', [ScopeController, 'members']).as('scope.members');
    router.get('/~/settings', [ScopeController, 'settings']).as('scope.settings');

    router.group(() => {
      router.get('/', [PackageController, 'show']).as('package.show');
      router.get('/init', [PackageController, 'init']).as('package.init').use(middleware.auth());

      router.get('/:version', [PackageController, 'files']).as('package.files.root');
      router.get('/:version/*', [PackageController, 'files']).as('package.files');
    }).prefix('/:name');
  })
  .prefix('/:scope')
  .where('scope', {
    match: /^@/,
    cast: (scope) => scope.replace(/^@/, ''),
  })

router
  .group(() => {
    router.get('/request/:code', [AppController, 'viewPendingApp']).as('auth.request.view');
    router.post('/request/:code', [AppController, 'submitPendingApp']).as('auth.request.submit').use(middleware.auth())
  })
  .prefix('/auth')

router
  .group(() => {
    router.post('/auth/request', [AppController, 'apiRequestApp']).as('auth.new.request');
    router.delete('/auth/request/:code', [AppController, 'apiDeleteAppRequest']).as('auth.new.request.delete');
    router.get('/auth/request/:code', [AppController, 'apiPendingAppStatus']).as('auth.request.status');

    router.group(() => {
      router.post('/publish', [PublishController, 'apiCreatePublishJob']).as('package.publish.api.submit');
      router.post('/publish/:jobId/upload', [PublishController, 'apiUploadArchive']).as('package.publish.api.upload');
      router.get('/publish/:jobId', [PublishController, 'apiPublishJobStatus']).as('package.publish.api.status');
    }).use(middleware.auth({guards: ['api']}));

    router
      .group(() => {
        router.get('/', [PackageController, 'apiResolvePackage']).as('package.api.resolve');
      })
      .prefix('/package/:scope/:name')
      .where('scope', {
        match: /^@/,
        cast: (scope) => scope.replace(/^@/, ''),
      });

    // Catch-all route for API invalid endpoints
    router.any('/*' , ({ response }) => {
      return response.badRequest({ message: 'Invalid API endpoint' });
    });
  })
  .use(middleware.json())
  .prefix('/api')