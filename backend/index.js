import express from "express";
import connectDB from "./src/utils/connectdb.js";
import { config } from "dotenv";
import userRouter from "./src/route/user.route.js";
import cookieParser from "cookie-parser";
import { ensureAdminUser } from "./admin.js";
import busRoute from "./src/route/rute.js";
import busRouter from "./src/route/bus.route.js";
import { bookingRouter } from "./src/route/booking.route.js";
import morgan from "morgan";
config();
const app = express();
app.use(express.json());
app.use(cookieParser());
const PORT = process.env.PORT || 3000;
app.use("/api/users", userRouter);
app.use("/api/routes", busRoute);
app.use("/api/buses", busRouter);
// app.use("/api/upload", uploadOneRouter);
app.use("/api/bookings", bookingRouter);
app.get("/", (req, res) => {
  res.send("Hello World!");
});
app.use(morgan("dev"));
await connectDB();
await ensureAdminUser();

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
