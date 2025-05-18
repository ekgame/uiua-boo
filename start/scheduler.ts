
import logger from '@adonisjs/core/services/logger'
import scheduler from 'adonisjs-scheduler/services/main'

// Schedules are written as commands that are executed at the specified time.
// See the /commands directory for the commands that are executed.

scheduler.onStarted(() => {
    logger.info(`Scheduled jobs: ${scheduler.items.length}`)
});
