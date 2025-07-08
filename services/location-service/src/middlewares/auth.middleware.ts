import { Request, Response, NextFunction } from 'express'
import { getUserFromRequest } from '@nexlify/shared/utils/auth/jwt'

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = getUserFromRequest(req)
  if (!user) return res.status(401).json({ message: 'Unauthorized' })

  req.user = user
  next()
}