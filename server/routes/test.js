import express from 'express';
import { resend } from '../config/email.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * Test email sending with Resend
 * GET /api/test-email?to=your@email.com
 */
router.get('/test-email', async (req, res) => {
  const { to } = req.query;

  if (!to) {
    return res.status(400).json({
      success: false,
      error: 'Missing "to" query parameter. Usage: /api/test-email?to=your@email.com'
    });
  }

  if (!resend) {
    return res.status(500).json({
      success: false,
      error: 'Resend not initialized. Check RESEND_API_KEY environment variable.',
      env_check: {
        RESEND_API_KEY: process.env.RESEND_API_KEY ? '✅ Set' : '❌ Not set',
        EMAIL_FROM: process.env.EMAIL_FROM || 'Not set (using default: onboarding@resend.dev)',
        NOTIFICATION_EMAIL: process.env.NOTIFICATION_EMAIL || 'Not set'
      }
    });
  }

  try {
    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
      to: to,
      subject: 'Test Email from CertiCredia',
      html: `
        <h1>🎉 Email Test Successful!</h1>
        <p>If you're reading this, Resend is working correctly!</p>
        <p><strong>Server:</strong> CertiCredia Production</p>
        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
      `
    });

    logger.info(`✅ Test email sent to ${to}: ${result.id}`);

    res.json({
      success: true,
      message: 'Email sent successfully! Check your inbox (and spam folder).',
      email_id: result.id,
      sent_to: to,
      config: {
        from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
        resend_initialized: '✅ Yes'
      }
    });

  } catch (error) {
    logger.error('❌ Test email failed:', error);

    res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data || error,
      troubleshooting: {
        check_api_key: 'Verify RESEND_API_KEY is correct on Render dashboard',
        check_domain: 'If using custom domain, make sure it\'s verified in Resend',
        check_limits: 'Free tier: 100 emails/day, 3000/month - check you haven\'t exceeded',
        resend_dashboard: 'https://resend.com/emails - check for bounces/errors'
      }
    });
  }
});

export default router;
