// types/express.d.ts
import { Profile } from 'passport';
import { JwtPayload } from 'jsonwebtoken';
import { AuthenticatedRequest } from '@shared/utils/auth/requireAuth';

interface JwtUserPayload extends JwtPayload {
  userId: string;
  email?: string;
  role?: string;
}

declare module 'express-serve-static-core' {
  interface Request {
    correlationId?: string;
    user?: Profile | JwtUserPayload;
  }
}

declare module 'express-session' {
  interface SessionData {
    passport?: {
      user?: {
        userId: string;
        email?: string;
        role?: string;
      };
    };
  }
}