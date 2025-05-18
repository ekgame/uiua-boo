import router from "@adonisjs/core/services/router";

export function makeAbsoluteUrl(routeIdentifier: string, params: Record<string, any> = {}): string {
  const baseUrl = process.env.APP_URL || 'http://localhost:3333';
  const url = new URL(router.makeUrl(routeIdentifier, params), baseUrl);
  return url.toString();
}