import express from 'express';
import * as authController from '../controllers/auth.controller';
import passport from 'passport';

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/verify-2fa', authController.verify2FA);
// Google OAuth Start
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
}));

// Callback after Google login
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/login-failed' }),
  authController.googleCallback
);
router.post('/request-password-reset', authController.requestPasswordReset);

export default router;