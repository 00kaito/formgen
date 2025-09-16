import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import { type Express } from "express";
import { storage } from "./storage";
import { type User } from "@shared/schema";

declare global {
  namespace Express {
    interface User {
      id: string;
      username: string;
    }
  }
}

export function setupAuth(app: Express): void {
  // Session middleware
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "your-secret-key-change-in-production",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false, // Set to true in production with HTTPS
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    })
  );

  // Initialize passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure Local Strategy
  passport.use(
    new LocalStrategy(
      {
        usernameField: "username",
        passwordField: "password",
      },
      async (username: string, password: string, done) => {
        try {
          const user = await storage.getUserByUsername(username);
          
          if (!user) {
            return done(null, false, { message: "Nieprawidłowa nazwa użytkownika" });
          }

          // In production, you should hash passwords and compare hashed versions
          if (user.password !== password) {
            return done(null, false, { message: "Nieprawidłowe hasło" });
          }

          // Return user without password
          return done(null, {
            id: user.id,
            username: user.username,
          });
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  // Serialize user for session
  passport.serializeUser((user: Express.User, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUserById(id);
      if (user) {
        done(null, {
          id: user.id,
          username: user.username,
        });
      } else {
        done(null, false);
      }
    } catch (error) {
      done(error);
    }
  });
}

// Middleware to check if user is authenticated
export function requireAuth(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Wymagane uwierzytelnienie" });
}

// Middleware to check if user is logged in (for client requests)
export function isAuthenticated(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return res.json({ authenticated: true, user: req.user });
  }
  res.json({ authenticated: false, user: null });
}