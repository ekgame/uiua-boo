import app from '@adonisjs/core/services/app'
import { HttpContext, ExceptionHandler } from '@adonisjs/core/http'
import type { HttpError, StatusPageRange, StatusPageRenderer } from '@adonisjs/core/types/http'
import { errors } from '@adonisjs/lucid';

export default class HttpExceptionHandler extends ExceptionHandler {
  /**
   * In debug mode, the exception handler will display verbose errors
   * with pretty printed stack traces.
   */
  protected debug = !app.inProduction

  /**
   * Status pages are used to display a custom HTML pages for certain error
   * codes. You might want to enable them in production only, but feel
   * free to enable them in development as well.
   */
  protected renderStatusPages = true;

  /**
   * Status pages is a collection of error code range and a callback
   * to return the HTML contents to send as a response.
   */
  protected statusPages: Record<StatusPageRange, StatusPageRenderer> = {
    '404': (error, ctx) => {
      return this.customErrorHandler(error, ctx, () => {
        return ctx.view.render('pages/errors/not_found', { error });
      });
    },
    '500..599': (error, ctx) => {
      return this.customErrorHandler(error, ctx, () => {
        return ctx.view.render('pages/errors/server_error', { error });
      });
    },
  }

  private customErrorHandler(error: HttpError, ctx: HttpContext, htmlRenderer: () => Promise<string>) {
    if (error instanceof errors.E_ROW_NOT_FOUND && error.model) {
      error.message = `${error.model.name} not found.`;
    }

    switch (ctx.request.accepts(['html', 'json'])) {
      case 'json':
        return this.renderErrorAsJSON(error, ctx);
      case 'html':
      default:
        if (this.debug && error.status >= 500 && error.status <= 599) {
          return this.renderErrorAsHTML(error, ctx);
        }
        return htmlRenderer();
    }
  }

  /**
   * The method is used for handling errors and returning
   * response to the client
   */
  async handle(error: unknown, ctx: HttpContext) {
    return super.handle(error, ctx)
  }

  /**
   * The method is used to report error to the logging service or
   * the a third party error monitoring service.
   *
   * @note You should not attempt to send a response from this method.
   */
  async report(error: unknown, ctx: HttpContext) {
    return super.report(error, ctx)
  }
}
