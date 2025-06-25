import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { getDB } from './db';
import { config } from 'dotenv';

config();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: '/api/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const db = getDB();
        const email = profile.emails?.[0].value;

        // Check if user exists
        let user = await db('users').where({ email }).first();

        if (!user) {
          // Register user
          const [newUser] = await db('users')
            .insert({
              email,
              google_id: profile.id,
              password: null, // No password if Google
            })
            .returning(['id', 'email']);

          user = newUser;
        }

        // Pass user to the next step
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

// Required for session
passport.serializeUser((user: any, done) => done(null, user));
passport.deserializeUser((user: any, done) => done(null, user));