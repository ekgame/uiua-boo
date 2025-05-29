import { AccessTokenPermission, parsePermissionString } from "#features/apps/validators";
import User from "./User.js";
import { UserRole } from "./UserRole.js";
import logger from "@adonisjs/core/services/logger";

class UserService {
  async createOrUpdateUser(userData: {
    githubId: number;
    githubName: string;
    githubUsername: string;
    email: string;
    role?: UserRole;
  }): Promise<User> {
    let user = await User.findBy('githubId', userData.githubId);

    if (!user) {
      let role = userData.role || null;
      if (!role) {
        // If no role is provided, automatically assign the role.
        // If there are no admins, assign admin role to the user.
        const adminExists = await User.findBy('role', UserRole.ADMIN) !== null;
        role = adminExists ? UserRole.USER : UserRole.ADMIN;
      }

      user = await User.create({
        githubId: userData.githubId,
        githubName: userData.githubName,
        githubUsername: userData.githubUsername,
        email: userData.email,
        role: role,
      });

      const message = user.role === UserRole.ADMIN
        ? 'New admin created: %s (%s)'
        : 'New user created: %s (%s)';
      logger.info(message, user.githubUsername, user.email);
    } else {
      // Update user information as it may have changed
      user.githubName = userData.githubName;
      user.githubUsername = userData.githubUsername;
      user.email = userData.email;

      if (userData.role && user.role !== userData.role) {
        user.role = userData.role;
        logger.info('User (%s) role updated to "%s"', user.githubUsername, user.role);
      }

      await user.save();
      logger.debug('User updated: %s', user.githubUsername);
    }

    return user;
  }

  /**
   * Checks if the user has the requested permission in their current access token.
   * If no access token is present, it assumes that the user is not using API access
   * and therefore has no restrictions.
   */
  accessTokenHasPermission(
    accessToken: User['currentAccessToken'],
    requested: AccessTokenPermission
  ): boolean {
    if (!accessToken) {
      return true;
    }

    const permissions = accessToken.abilities.map(parsePermissionString);
    for (const perm of permissions) {
      if (this.validatePermission(requested, perm)) {
        return true;
      }
    }

    return false;
  }

  private validatePermission(requested: AccessTokenPermission, available: AccessTokenPermission): boolean {
    const isValidType = requested.type === available.type;
    let isValidAction = true;

    if (isValidType && available.type === 'package.upload-new-version') {
      const a = requested as { scope: string, name?: string, version?: string};
      const b = available as { scope: string, name?: string, version?: string};

      const conditions = [
        (b.scope && (!a.scope || a.scope !== b.scope)),
        (b.name && (!a.name || a.name !== b.name)),
        (b.version && (!a.version || a.version !== b.version)),
      ];

      // If any of the conditions are true, the action is not valid
      isValidAction = !conditions.some(condition => condition);
    }

    return isValidType && isValidAction;
  }
}

export default new UserService();