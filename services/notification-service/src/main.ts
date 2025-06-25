import express from "express";
import dotenv from "dotenv";
import notificationRoutes from "./routes/notification.route";
import { connectDB } from "./config/db";

dotenv.config();

const app = express();
app.use(express.json());

connectDB(); // neatly handles connection in its own module

app.use("/api/notification", notificationRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Notification service running on port ${PORT}`);
});