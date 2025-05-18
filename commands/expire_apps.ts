import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import AppService from '../app/features/apps/AppService.js'
import { schedule } from 'adonisjs-scheduler'

@schedule("* * * * *", "--silent")
export default class ExpireApps extends BaseCommand {
  static commandName = 'app:expire-apps'
  static description = 'Remove expired apps'

  static options: CommandOptions = {
    startApp: true,
  }

  @flags.boolean({ description: 'Run the command in the background' })
  silent: boolean = false

  async run() {
    const numRemoved = await AppService.removeExpiredApps()
    if (!this.silent || numRemoved > 0) {
      this.logger.info(`Removed expired apps: ${numRemoved}`)
    }
  }
}
