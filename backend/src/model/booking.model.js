import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    bus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bus",
      required: true,
      index: true,
    },
    route: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Route",
      required: true,
      index: true,
    },
    travelDate: { type: Date, required: true, index: true },

    // FIX: store multiple seats
    seatNumber: {
      type: [Number],
      required: true,
      validate: {
        validator: (arr) =>
          Array.isArray(arr) &&
          arr.length > 0 &&
          arr.every((n) => Number.isInteger(n) && n > 0),
        message: "seatNumber must be a non-empty array of positive integers",
      },
    },

    totalPrice: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["booked", "cancelled"],
      default: "booked",
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "refunded"],
      default: "pending",
      index: true,
    },
    bookingReference: { type: String, unique: true, index: true },
    notes: { type: String },
  },
  { timestamps: true }
);

// Helpful index for queries by date/bus
bookingSchema.index({ bus: 1, travelDate: 1, status: 1 });

export default mongoose.model("Booking", bookingSchema);
