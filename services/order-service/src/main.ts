import express from "express";
import orderRoutes from "./routes/order.route";

const app = express();
app.use(express.json());

app.use("/api/orders", orderRoutes);

app.listen(5006, () => {
  console.log("📦 Order service running on port 5006");
});