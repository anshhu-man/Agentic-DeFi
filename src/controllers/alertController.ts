import { Router, Request, Response } from 'express';
import { logger } from '@/utils/logger';

const router = Router();

router.get('/test', async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      message: 'Alert controller is working',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Alert controller test failed', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

export default router;
