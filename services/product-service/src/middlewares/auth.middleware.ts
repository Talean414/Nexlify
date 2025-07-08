import { Request, Response, NextFunction } from 'express'
import { getUserFromRequest, TokenPayload } from '@nexlify/shared/utils/auth/jwt'

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = getUserFromRequest(req)
  if (!user) return res.status(401).json({ message: 'Unauthorized' })

  req.user = user
  next()
}

export function requireRole(roles: TokenPayload['role'][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user
    if (!roles.includes(user?.role)) {
      return res.status(403).json({ message: 'Forbidden' })
    }
    next()
  }
}