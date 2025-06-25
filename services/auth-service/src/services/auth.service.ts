import { config } from 'dotenv';
import { getDB, connectDB } from '../config/db';
import bcrypt from 'bcryptjs';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '@shared/utils/auth/jwt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import sendResetEmail from '@email/sendEmail';

// Load environment variables
config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // Ensure this is set in .env

// Initialize database connection
let db: any;
connectDB()
  .then((knexInstance) => {
    db = knexInstance;
    console.log('Database initialized for authentication service');
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err.message);
    process.exit(1);
  });

// Generate 6-digit 2FA code
function generate2FACode() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
}

export async function registerUser(email: string, password: string) {
  const dbInstance = getDB();
  const existing = await dbInstance('users').where({ email }).first();
  if (existing) throw new Error('Email already in use');

  const hashed = await bcrypt.hash(password, 12);
  const [user] = await dbInstance('users')
    .insert({ email, password: hashed })
    .returning(['id', 'email']);

  return user;
}

export async function loginUser(email: string, password: string, deviceInfo: string = 'unknown') {
  const dbInstance = getDB();
  const user = await dbInstance('users').where({ email }).first();
  if (!user) throw new Error('Invalid credentials');

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new Error('Invalid credentials');

  // Initiate 2FA
  await initiate2FA(user.id);

  // Generate a temporary token for 2FA verification
  const tempToken = jwt.sign({ userId: user.id, type: '2fa' }, JWT_SECRET, {
    expiresIn: '10m',
  });

  // Optionally store device info in user_devices for tracking
  await dbInstance('user_devices')
  .insert({
    user_id: user.id,
    device_info: deviceInfo,
    created_at: new Date(),
  })
  .onConflict(['user_id', 'device_info'])
  .merge({ created_at: new Date() }); // This avoids duplicate key error

  return {
    user: { id: user.id, email: user.email },
    tempToken,
    message: '2FA code sent. Please verify to complete login.',
  };
}

export async function initiate2FA(userId: string) {
  const dbInstance = getDB();
  const code = generate2FACode();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  // Clean up expired or used codes for the user
  await dbInstance('user_2fa_codes').where({ user_id: userId }).del();

  await dbInstance('user_2fa_codes').insert({
    user_id: userId,
    code,
    expires_at: expiresAt,
  });

  // TODO: Send code via email or SMS (mock here)
  console.log(`🔐 2FA Code for ${userId}: ${code}`);
}

export async function verify2FA(userId: string, code: string, deviceInfo: string = 'unknown') {
  const dbInstance = getDB();
  const entry = await dbInstance('user_2fa_codes')
    .where({ user_id: userId, code, verified: false })
    .andWhere('expires_at', '>', new Date())
    .first();

  if (!entry) throw new Error('Invalid or expired 2FA code');

  await dbInstance('user_2fa_codes').where({ id: entry.id }).update({ verified: true });

  // Generate access and refresh tokens
  const accessToken = generateAccessToken(userId);
  const refreshToken = generateRefreshToken(userId);

  // Store refresh token in users table
  await dbInstance('users')
    .where({ id: userId })
    .update({ refresh_token: refreshToken });

  // Optionally update or insert device info in user_devices
  await dbInstance('user_devices')
    .insert({
      user_id: userId,
      device_info: deviceInfo,
      created_at: new Date(),
    })
    .onConflict(['user_id', 'device_info']) // Assumes unique constraint on user_id and device_info
    .merge({ created_at: new Date() });

  return {
    accessToken,
    refreshToken,
  };
}

export async function refreshAuthToken(refreshToken: string) {
  try {
    const { userId } = verifyRefreshToken(refreshToken);
    const dbInstance = getDB();
    const user = await dbInstance('users')
      .where({ id: userId, refresh_token: refreshToken })
      .first();

    if (!user) {
      throw new Error('Invalid refresh token');
    }

    const newAccessToken = generateAccessToken(userId);
    return { accessToken: newAccessToken };
  } catch (err) {
    throw new Error(`Invalid refresh token: ${err.message}`);
  }
}

export async function logoutDevice(userId: string, refreshToken: string) {
  const dbInstance = getDB();
  // Clear the refresh token in the users table for the specific user
  await dbInstance('users')
    .where({ id: userId, refresh_token: refreshToken })
    .update({ refresh_token: null });
}

export async function logoutAllDevices(userId: string) {
  const dbInstance = getDB();
  // Clear the refresh token in the users table for the user
  await dbInstance('users')
    .where({ id: userId })
    .update({ refresh_token: null });

  // Optionally clear all device records for the user
  await dbInstance('user_devices').where({ user_id: userId }).del();
}

// 🔐 Password Reset Logic
export async function requestPasswordReset(email: string): Promise<void> {
  const dbInstance = getDB();

  // Check if user exists
  const user = await dbInstance('users').where({ email }).first();
  if (!user) throw new Error('No user found with this email');

  // Generate secure token
  const token = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  // Set expiration (15 minutes)
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  // Clean previous resets
  await dbInstance('password_resets').where({ email }).del();

  // Insert reset entry
  await dbInstance('password_resets').insert({
    email,
    token: hashedToken,
    expires_at: expiresAt,
  });

  // Send email with reset link (plain token)
  await sendResetEmail(email, token);
}