import type { HttpContext } from '@adonisjs/core/http'

export default class BrowsesController {
  async home({ view }: HttpContext) {
    return view.render('pages/home');
  }

  async packages({ view }: HttpContext) {
    return view.render('pages/packages');
  }
}