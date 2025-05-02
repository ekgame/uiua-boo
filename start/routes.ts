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

router.get('/', '#controllers/browse_controller.home').as('home');
router.get('/packages', '#controllers/browse_controller.packages').as('browse.packages');

router.get('/login/github', '#controllers/auth_controller.login').as('auth.login').use(middleware.guest());
router.get('/login/github/callback', '#controllers/auth_controller.callback').as('auth.login.callback');
router.get('/logout', '#controllers/auth_controller.logout').as('auth.logout').use(middleware.auth());

router.get('/publish', '#controllers/publish_controller.view').as('package.publish');
router.post('/publish', '#controllers/publish_controller.submit').as('package.publish.submit').use(middleware.auth());