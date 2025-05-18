import cron from 'node-cron';
import AppService from '../app/features/apps/AppService.js';
import logger from '@adonisjs/core/services/logger';

cron.schedule('* * * * *', async () => {
  await AppService.removeExpiredPendingApps();
});

logger.info('scheduled tasks started');