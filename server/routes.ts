
import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import bcrypt from "bcrypt";
import { generateOtp, sendOtpEmail } from "./email";
import session from "express-session";
import MemoryStore from "memorystore";

// Extend express-session to include userId
declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

// Auth middleware
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Session setup
  const SessionStore = MemoryStore(session);
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret && process.env.NODE_ENV === "production") {
    console.error("FATAL: SESSION_SECRET environment variable is required in production");
    process.exit(1);
  }
  app.use(
    session({
      secret: sessionSecret || "dev-only-secret-not-for-production",
      resave: false,
      saveUninitialized: false,
      store: new SessionStore({
        checkPeriod: 86400000,
      }),
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      },
    })
  );

  // === AUTH ROUTES ===

  app.post(api.auth.signup.path, async (req, res) => {
    try {
      const input = api.auth.signup.input.parse(req.body);
      
      // Check if email exists
      const existingEmail = await storage.getUserByEmail(input.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already registered" });
      }

      // Check if profile name exists
      const existingProfile = await storage.getUserByProfileName(input.profileName);
      if (existingProfile) {
        return res.status(400).json({ message: "Profile name already taken" });
      }

      // Create user (unverified)
      await storage.createUser({
        email: input.email.toLowerCase(),
        profileName: input.profileName,
        password: input.password,
      });

      // Generate and send OTP
      const otp = generateOtp();
      await storage.createOtp(input.email, otp, "signup");
      await sendOtpEmail(input.email, otp, "signup");

      res.status(201).json({ message: "Verification code sent to your email" });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  app.post(api.auth.verifyOtp.path, async (req, res) => {
    try {
      const input = api.auth.verifyOtp.input.parse(req.body);
      
      const isValid = await storage.verifyOtp(input.email, input.code, "signup");
      if (!isValid) {
        return res.status(400).json({ message: "Invalid or expired verification code" });
      }

      // Verify user and log them in
      const user = await storage.verifyUser(input.email);
      await storage.deleteOtps(input.email, "signup");
      
      req.session.userId = user.id;
      
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  app.post(api.auth.login.path, async (req, res) => {
    try {
      const input = api.auth.login.input.parse(req.body);
      
      // Try to find user by email or profile name
      let user = await storage.getUserByEmail(input.emailOrProfile);
      if (!user) {
        user = await storage.getUserByProfileName(input.emailOrProfile);
      }

      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (!user.isVerified) {
        return res.status(401).json({ message: "Please verify your email first" });
      }

      const validPassword = await bcrypt.compare(input.password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.session.userId = user.id;
      
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      throw err;
    }
  });

  app.post(api.auth.logout.path, (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Could not log out" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get(api.auth.me.path, async (req, res) => {
    if (!req.session.userId) {
      return res.json(null);
    }
    
    const user = await storage.getUserById(req.session.userId);
    if (!user) {
      return res.json(null);
    }
    
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });

  app.post(api.auth.forgotPassword.path, async (req, res) => {
    try {
      const input = api.auth.forgotPassword.input.parse(req.body);
      
      const user = await storage.getUserByEmail(input.email);
      if (!user) {
        return res.status(404).json({ message: "No account found with this email" });
      }

      const otp = generateOtp();
      await storage.createOtp(input.email, otp, "forgot_password");
      await sendOtpEmail(input.email, otp, "forgot_password");

      res.json({ message: "Password reset code sent to your email" });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  app.post(api.auth.resetPassword.path, async (req, res) => {
    try {
      const input = api.auth.resetPassword.input.parse(req.body);
      
      const isValid = await storage.verifyOtp(input.email, input.code, "forgot_password");
      if (!isValid) {
        return res.status(400).json({ message: "Invalid or expired verification code" });
      }

      await storage.updatePassword(input.email, input.newPassword);
      await storage.deleteOtps(input.email, "forgot_password");

      res.json({ message: "Password updated successfully" });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  app.post(api.auth.resendOtp.path, async (req, res) => {
    try {
      const input = api.auth.resendOtp.input.parse(req.body);
      
      const user = await storage.getUserByEmail(input.email);
      if (!user) {
        return res.status(400).json({ message: "No account found with this email" });
      }

      const otp = generateOtp();
      await storage.createOtp(input.email, otp, input.type);
      await sendOtpEmail(input.email, otp, input.type);

      res.json({ message: "Verification code resent" });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  // === TASK ROUTES ===

  // Stats must come before :id route
  app.get("/api/tasks/stats", requireAuth, async (req, res) => {
    const stats = await storage.getTaskStats(req.session.userId!);
    res.json(stats);
  });

  app.get(api.tasks.list.path, requireAuth, async (req, res) => {
    const tasks = await storage.getTasks(req.session.userId!);
    res.json(tasks);
  });

  app.get(api.tasks.get.path, requireAuth, async (req, res) => {
    const task = await storage.getTask(Number(req.params.id), req.session.userId!);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    res.json(task);
  });

  app.post(api.tasks.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.tasks.create.input.parse(req.body);
      const task = await storage.createTask(req.session.userId!, input.content);
      res.status(201).json(task);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  app.patch(api.tasks.update.path, requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const existing = await storage.getTask(id, req.session.userId!);
      if (!existing) {
        return res.status(404).json({ message: "Task not found" });
      }

      const input = api.tasks.update.input.parse(req.body);
      const updated = await storage.updateTask(id, req.session.userId!, input);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  app.delete(api.tasks.delete.path, requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    const existing = await storage.getTask(id, req.session.userId!);
    if (!existing) {
      return res.status(404).json({ message: "Task not found" });
    }
    await storage.deleteTask(id, req.session.userId!);
    res.status(204).send();
  });

  app.post(api.tasks.startFocus.path, requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    const existing = await storage.getTask(id, req.session.userId!);
    if (!existing) {
      return res.status(404).json({ message: "Task not found" });
    }
    const task = await storage.startFocusOnTask(id, req.session.userId!);
    res.json(task);
  });

  app.post(api.tasks.complete.path, requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    const existing = await storage.getTask(id, req.session.userId!);
    if (!existing) {
      return res.status(404).json({ message: "Task not found" });
    }
    const task = await storage.completeTask(id, req.session.userId!);
    res.json(task);
  });

  app.post(api.tasks.addReflection.path, requireAuth, async (req, res) => {
    try {
      const taskId = Number(req.params.id);
      const existing = await storage.getTask(taskId, req.session.userId!);
      if (!existing) {
        return res.status(404).json({ message: "Task not found" });
      }

      const input = api.tasks.addReflection.input.parse(req.body);
      const reflection = await storage.addReflection(taskId, input.question, input.answer);
      res.status(201).json(reflection);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  app.post(api.tasks.addReview.path, requireAuth, async (req, res) => {
    try {
      const taskId = Number(req.params.id);
      const existing = await storage.getTask(taskId, req.session.userId!);
      if (!existing) {
        return res.status(404).json({ message: "Task not found" });
      }

      const input = api.tasks.addReview.input.parse(req.body);
      const review = await storage.addReview(taskId, input.satisfactionRating, input.improvements);
      res.status(201).json(review);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  return httpServer;
}
