import { Request, Response } from 'express';
import * as authService from '../services/auth.service';
import jwt from 'jsonwebtoken';

export async function signup(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    const user = await authService.registerUser(email, password);
    res.status(201).json({ msg: 'User registered', user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    const data = await authService.loginUser(email, password);
    res.json(data);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
}

export async function refreshToken(req: Request, res: Response) {
  try {
    const { token } = req.body;
    const data = await authService.refreshAuthToken(token);
    res.json(data);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
}

export async function logout(req: Request, res: Response) {
  try {
    const { userId, refreshToken } = req.body;
    await authService.logoutDevice(userId, refreshToken);
    res.json({ msg: 'Logged out from current device' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function logoutAll(req: Request, res: Response) {
  try {
    const { userId } = req.body;
    await authService.logoutAllDevices(userId);
    res.json({ msg: 'Logged out from all devices' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function verify2FA(req: Request, res: Response) {
  try {
    const { code, tempToken, deviceInfo = 'unknown' } = req.body;

    const payload = (await new Promise((resolve, reject) => {
      const secret = process.env.JWT_SECRET || 'your-secret-key';
      jwt.verify(tempToken, secret, (err, decoded) => {
        if (err) return reject(err);
        resolve(decoded);
      });
    })) as { userId: string; type: string };

    if (payload.type !== '2fa') {
      return res.status(401).json({ error: 'Invalid token type' });
    }

    const tokens = await authService.verify2FA(payload.userId, code, deviceInfo);
    const user = { id: payload.userId };

    res.json({
      message: '2FA verified successfully',
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
}

export async function googleCallback(req: Request, res: Response) {
  const user = req.user as any;

  // Optionally, initiate 2FA for extra layer
  await authService.initiate2FA(user.id);

  // Generate temp token to proceed to 2FA verification
  const tempToken = jwt.sign({ userId: user.id, type: '2fa' }, process.env.JWT_SECRET!, {
    expiresIn: '10m',
  });

  return res.json({
    msg: 'Google login successful. 2FA code sent.',
    tempToken,
    user: { id: user.id, email: user.email },
  });
}

export async function requestPasswordReset(req: Request, res: Response) {
  try {
    const { email } = req.body;
    await authService.requestPasswordReset(email);
    res.json({ msg: 'If the email is valid, a reset link has been sent.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}