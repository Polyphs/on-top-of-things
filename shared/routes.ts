
import { z } from 'zod';
import { insertTaskSchema, insertReflectionSchema, insertTaskReviewSchema, tasks, reflections, taskReviews, users } from './schema';

// ============================================
// SHARED ERROR SCHEMAS
// ============================================
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

// ============================================
// API CONTRACT
// ============================================
export const api = {
  // Auth endpoints
  auth: {
    signup: {
      method: 'POST' as const,
      path: '/api/auth/signup',
      input: z.object({
        email: z.string().email(),
        profileName: z.string().min(2),
        password: z.string().min(6),
      }),
      responses: {
        201: z.object({ message: z.string() }),
        400: errorSchemas.validation,
      },
    },
    verifyOtp: {
      method: 'POST' as const,
      path: '/api/auth/verify-otp',
      input: z.object({
        email: z.string().email(),
        code: z.string().length(6),
      }),
      responses: {
        200: z.custom<Omit<typeof users.$inferSelect, 'password'>>(),
        400: errorSchemas.validation,
      },
    },
    login: {
      method: 'POST' as const,
      path: '/api/auth/login',
      input: z.object({
        emailOrProfile: z.string(),
        password: z.string(),
      }),
      responses: {
        200: z.custom<Omit<typeof users.$inferSelect, 'password'>>(),
        401: errorSchemas.unauthorized,
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/auth/logout',
      responses: {
        200: z.object({ message: z.string() }),
      },
    },
    me: {
      method: 'GET' as const,
      path: '/api/auth/me',
      responses: {
        200: z.custom<Omit<typeof users.$inferSelect, 'password'> | null>(),
      },
    },
    forgotPassword: {
      method: 'POST' as const,
      path: '/api/auth/forgot-password',
      input: z.object({
        email: z.string().email(),
      }),
      responses: {
        200: z.object({ message: z.string() }),
        404: errorSchemas.notFound,
      },
    },
    resetPassword: {
      method: 'POST' as const,
      path: '/api/auth/reset-password',
      input: z.object({
        email: z.string().email(),
        code: z.string().length(6),
        newPassword: z.string().min(6),
      }),
      responses: {
        200: z.object({ message: z.string() }),
        400: errorSchemas.validation,
      },
    },
    resendOtp: {
      method: 'POST' as const,
      path: '/api/auth/resend-otp',
      input: z.object({
        email: z.string().email(),
        type: z.enum(['signup', 'forgot_password']),
      }),
      responses: {
        200: z.object({ message: z.string() }),
        400: errorSchemas.validation,
      },
    },
  },
  
  // Task endpoints
  tasks: {
    list: {
      method: 'GET' as const,
      path: '/api/tasks',
      responses: {
        200: z.array(z.custom<typeof tasks.$inferSelect & { reflections: typeof reflections.$inferSelect[]; reviews: typeof taskReviews.$inferSelect[] }>()),
        401: errorSchemas.unauthorized,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/tasks/:id',
      responses: {
        200: z.custom<typeof tasks.$inferSelect & { reflections: typeof reflections.$inferSelect[]; reviews: typeof taskReviews.$inferSelect[] }>(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/tasks',
      input: z.object({
        content: z.string().min(1),
      }),
      responses: {
        201: z.custom<typeof tasks.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/tasks/:id',
      input: insertTaskSchema.partial(),
      responses: {
        200: z.custom<typeof tasks.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/tasks/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
    startFocus: {
      method: 'POST' as const,
      path: '/api/tasks/:id/start-focus',
      responses: {
        200: z.custom<typeof tasks.$inferSelect>(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
    complete: {
      method: 'POST' as const,
      path: '/api/tasks/:id/complete',
      responses: {
        200: z.custom<typeof tasks.$inferSelect>(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
    addReflection: {
      method: 'POST' as const,
      path: '/api/tasks/:id/reflections',
      input: z.object({
        question: z.string(),
        answer: z.string(),
      }),
      responses: {
        201: z.custom<typeof reflections.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
    addReview: {
      method: 'POST' as const,
      path: '/api/tasks/:id/reviews',
      input: z.object({
        satisfactionRating: z.number().min(1).max(5),
        improvements: z.string().optional(),
      }),
      responses: {
        201: z.custom<typeof taskReviews.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
    stats: {
      method: 'GET' as const,
      path: '/api/tasks/stats',
      responses: {
        200: z.object({
          totalCompleted: z.number(),
          totalPending: z.number(),
          avgFocusTimeSeconds: z.number(),
          avgSatisfaction: z.number(),
          completedTasks: z.array(z.custom<typeof tasks.$inferSelect & { reflections: typeof reflections.$inferSelect[]; reviews: typeof taskReviews.$inferSelect[] }>()),
        }),
        401: errorSchemas.unauthorized,
      },
    },
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================
export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

// ============================================
// TYPE HELPERS
// ============================================
export type TaskInput = z.infer<typeof api.tasks.create.input>;
export type TaskResponse = z.infer<typeof api.tasks.create.responses[201]>;
export type TaskUpdateInput = z.infer<typeof api.tasks.update.input>;
export type TasksListResponse = z.infer<typeof api.tasks.list.responses[200]>;
export type SignupInput = z.infer<typeof api.auth.signup.input>;
export type LoginInput = z.infer<typeof api.auth.login.input>;
export type VerifyOtpInput = z.infer<typeof api.auth.verifyOtp.input>;
