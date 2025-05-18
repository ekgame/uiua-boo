import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import AppService from '../app/features/apps/AppService.js'
import { schedule } from 'adonisjs-scheduler'

@schedule("* * * * *", "--silent")
export default class ExpirePendingApps extends BaseCommand {
  static commandName = 'app:expire-pending-apps'
  static description = 'Expire pending apps'

  static options: CommandOptions = {
    startApp: true,
  }

  @flags.boolean({ description: 'Run the command in the background' })
  silent: boolean = false

  async run() {
    const numRemoved = await AppService.removeExpiredPendingApps()
    if (!this.silent || numRemoved > 0) {
      this.logger.info(`Removed pending apps: ${numRemoved}`)
    }
  }
}