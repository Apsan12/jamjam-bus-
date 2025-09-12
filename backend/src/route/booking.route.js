import { Router } from "express";
import {
  createBooking,
  listBookings,
  getBooking,
  myBookings,
  cancelBooking,
  markBookingPaid,
} from "../controller/booking.controller.js";
import authenticated from "../middleware/authinticate.js";
import authorization from "../middleware/authorize.js";

export const bookingRouter = Router();

// Create a booking
bookingRouter.post("/", authenticated, createBooking);

// Current user's bookings
bookingRouter.get("/mine", authenticated, myBookings);

// Admin list with filtering
bookingRouter.get("/", authenticated, authorization("admin"), listBookings);

// Get single booking (owner or admin enforced in controller)
bookingRouter.get("/:id", authenticated, getBooking);

// Cancel booking (owner or admin)
bookingRouter.patch("/:id/cancel", authenticated, cancelBooking);

// Mark paid (admin)
bookingRouter.patch(
  "/:id/paid",
  authenticated,
  authorization("admin"),
  markBookingPaid
);
