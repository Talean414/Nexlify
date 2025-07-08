import express from "express";
import dotenv from "dotenv";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import session from "express-session";
import passport from "passport";
import authRoutes from "./routes/auth.route";
import { connectDB } from "./config/db"; // we’ll adjust this below
import "./config/passport"; // Ensure it runs

dotenv.config();

const app = express();
const port = process.env.PORT || 5001;

// Middleware for parsing JSON, adding security, rate limiting, CORS
app.use(express.json());
app.use(helmet());
app.use(cors());
app.use(rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // max requests per IP
  message: "Too many requests. Please try again later."
}));

// Session + Passport setup
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'keyboard cat',
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use("/api/auth", authRoutes);

// Start server only after DB is ready
connectDB().then(() => {
  app.listen(port, () => {
    console.log(`✅ Auth service running on http://localhost:${port}`);
  });
}).catch((err) => {
  console.error("❌ Failed to connect to database:", err.message);
});