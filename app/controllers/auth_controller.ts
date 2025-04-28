import type { HttpContext } from '@adonisjs/core/http';
import UserService from '#services/user_service';
import router from '@adonisjs/core/services/router';

const RETURN_ROUTE_NAME_PARAM = 'return_to_route_name';

export default class AuthController {
  async login({ ally, request, session }: HttpContext) {
    const backRouteName = request.input('back', null);

    if (backRouteName && router.has(backRouteName)) {
      session.put(RETURN_ROUTE_NAME_PARAM, request.input('back'));
    } else {
      session.forget(RETURN_ROUTE_NAME_PARAM);
    }

    return ally
      .use('github')
      .redirect((request) => {
        request.scopes(['user', 'user:email']);
      });
  }

  async callback({ ally, response, auth, logger, session }: HttpContext) {
    const github = ally.use('github');

    if (github.accessDenied()) {
      return 'You have denied the authentication.';
    }

    if (github.stateMisMatch()) {
      return 'We are unable to verify the request. Please try again.';
    }

    if (github.hasError()) {
      return github.getError();
    }

    const githubUser = await github.user();
    const user = await UserService.createOrUpdateUser({
      githubId: githubUser.id,
      githubName: githubUser.name,
      githubUsername: githubUser.original.login,
      email: githubUser.email,
    });

    await auth.use('web').login(user);
    logger.info('User logged in: %s', user.githubUsername);

    const returnToRouteName = session.get(RETURN_ROUTE_NAME_PARAM) || 'home';
    logger.debug('Redirecting logged in user to %s', returnToRouteName);
    return response.redirect().toRoute(returnToRouteName);
  }

  async logout({ auth, response }: HttpContext) {
    await auth.use('web').logout();
    return response.redirect().toRoute('home');
  }
}