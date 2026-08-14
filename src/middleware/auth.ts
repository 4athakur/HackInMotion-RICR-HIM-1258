import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { DecodedIdToken } from 'firebase-admin/auth';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { eq } from 'drizzle-orm';
import { seedDemoDataForUser } from '../routes/demo.ts';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing token' });
    return;
  }

  const token = authHeader.split('Bearer ')[1];

  // 1. Handle Demo Token & Local Offline / Hackathon Tokens
  if (token.startsWith('demo-token-') || token === 'guest-demo-token' || token.startsWith('local-token-')) {
    let uid = 'demo_user_hackathon';
    let email = 'demo.alex@smartspend.app';
    let name = 'Alex Morgan (Demo)';

    if (token.startsWith('local-token-')) {
      try {
        const payload = JSON.parse(Buffer.from(token.replace('local-token-', ''), 'base64').toString('utf-8'));
        uid = payload.uid || `user_${payload.email.replace(/[^a-zA-Z0-9]/g, '_')}`;
        email = payload.email || email;
        name = payload.name || name;
      } catch (err) {
        console.warn('Failed to parse local token payload, fallback to demo user:', err);
      }
    }

    req.user = {
      uid,
      email,
      name,
      aud: 'smartspend-local',
      auth_time: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400 * 365,
      firebase: { identities: {}, sign_in_provider: 'custom' },
      iat: Math.floor(Date.now() / 1000),
      iss: 'smartspend-local',
      sub: uid,
    } as unknown as DecodedIdToken;

    // Upsert user to database
    try {
      await db.insert(users)
        .values({
          uid,
          email,
          name,
        })
        .onConflictDoUpdate({
          target: users.uid,
          set: {
            email,
            name,
          },
        });

      // If this is the demo user, ensure default rich data is seeded
      if (uid === 'demo_user_hackathon') {
        try {
          await seedDemoDataForUser(uid);
        } catch (seedErr) {
          console.error('Error auto-seeding demo user data:', seedErr);
        }
      }
    } catch (dbErr) {
      console.error('Database error when upserting user in demo/local auth mode:', dbErr);
    }

    return next();
  }

  // 2. Firebase Admin Token Verification (Cloud / Production)
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    
    // Upsert user to database
    try {
      await db.insert(users)
        .values({
          uid: decodedToken.uid,
          email: decodedToken.email || '',
          name: decodedToken.name || 'User',
        })
        .onConflictDoUpdate({
          target: users.uid,
          set: {
            email: decodedToken.email || '',
            name: decodedToken.name || 'User',
          },
        });
    } catch (dbErr) {
      console.error('Database error when upserting user profile in auth middleware:', dbErr);
    }

    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};