import { inject } from '@adonisjs/core';
import type { HttpContext } from '@adonisjs/core/http';
import UserService from '#services/user_service';

export default class AuthController {

  async login({ ally }: HttpContext) {
    return ally
      .use('github')
      .redirect((request) => {
        request.scopes(['user', 'user:email']);
      });
  }

  @inject()
  async callback({ ally, response, auth, logger }: HttpContext) {
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

    return response.redirect().toRoute('home');
  }

  async logout({ auth, response }: HttpContext) {
    await auth.use('web').logout();
    return response.redirect().toRoute('home');
  }
}