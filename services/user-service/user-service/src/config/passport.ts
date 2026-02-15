import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { config } from '../config';

const connectionString = `${process.env.DATABASE_URL}`;

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

passport.use(
  new GoogleStrategy(
    {
      clientID: (config as any).googleClientId,
      clientSecret: (config as any).googleClientSecret,
      callbackURL: '/api/users/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Find if the user already exists
        let user = await prisma.user.findUnique({ where: { googleId: profile.id } });

        if (user) {
          // If user exists, pass them to the next middleware
          return done(null, user);
        }

        const userEmail = profile.emails?.[0].value;
        if (!userEmail) {
          return done(new Error('Google account does not have an email.'), false);
        }

        // If not, check if the email is already in use
        user = await prisma.user.findUnique({ where: { email: userEmail } });
        if (user) {
          // TODO: Link account or handle conflict. For now, we can throw an error.
          return done(new Error('Email is already in use with a different authentication method.'), false);
        }

        // Create a new user with the Google profile data
        const newUser = await prisma.user.create({
          data: {
            googleId: profile.id,
            email: userEmail,
            firstName: profile.name?.givenName || 'User',
            lastName: profile.name?.familyName || '',
          },
        });

        done(null, newUser);
      } catch (error) {
        done(error, false);
      }
    }
  )
);

// These are not strictly needed for JWT-based sessions but are good practice for passport
passport.serializeUser((user: any, done) => done(null, user.id));
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});