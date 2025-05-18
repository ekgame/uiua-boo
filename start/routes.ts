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
    router.get('/', [PackageController, 'show']).as('package.show');
    router.get('/init', [PackageController, 'init']).as('package.init').use(middleware.auth());
  })
  .prefix('/:scope/:name')
  .where('scope', {
    match: /^@/,
    cast: (scope) => scope.replace(/^@/, ''),
  })

router
  .group(() => {
    router.get('/request/:code', [AppController, 'viewPendingApp']).as('app.request.view');
    router.post('/request/:code', [AppController, 'submitPendingApp']).as('app.request.submit').use(middleware.auth())
  })
  .prefix('/app')

router
  .group(() => {
    router.post('/app/request', [AppController, 'apiRequestApp']).as('app.new.request');
    router.delete('/app/request/:code', [AppController, 'apiDeleteAppRequest']).as('app.new.request.delete');
    router.get('/app/request/:code', [AppController, 'apiPendingAppStatus']).as('app.request.status');
  })
  .use(middleware.json())
  .prefix('/api')