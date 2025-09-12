import mongoose from "mongoose";
import Booking from "../model/booking.model.js";
import Bus from "../model/bus.model.js";
import Route from "../model/route.model.js";
import User from "../model/user.model.js";
import { bookingConfirmationTemplate, sendMail } from "../utils/sendmail.js";

const normalizeDate = (d) => {
  const dt = new Date(d);
  if (isNaN(dt)) return null;
  dt.setHours(0, 0, 0, 0);
  return dt;
};

const generateBookingRef = () =>
  "BK-" +
  Math.random().toString(36).substring(2, 6).toUpperCase() +
  Date.now().toString().slice(-5);

const calcPrice = (bus, route, seatCount) => {
  // Customize: e.g. distance * ratePerKm. Fallback flat 10 per seat.
  const basePerSeat = 10;
  return seatCount * basePerSeat;
};

// Create booking (atomic with transaction if available)
export const createBooking = async (req, res) => {
  const { busId, routeId, travelDate, seatNumbers, notes } = req.body;
  if (
    !busId ||
    !routeId ||
    !travelDate ||
    !Array.isArray(seatNumbers) ||
    !seatNumbers.length
  ) {
    return res
      .status(400)
      .json({ message: "busId, routeId, travelDate, seatNumbers required" });
  }

  const cleanSeats = [...new Set(seatNumbers.map(Number))].filter(
    (n) => Number.isInteger(n) && n > 0
  );
  if (!cleanSeats.length)
    return res.status(400).json({ message: "Valid seatNumbers required" });

  let dateObj = normalizeDate(travelDate);
  if (!dateObj) return res.status(400).json({ message: "Invalid travelDate" });

  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const session = await mongoose.startSession();
  let useTxn = false;
  try {
    // Try to start transaction (works only on replica set)
    session.startTransaction();
    useTxn = true;

    const [bus, route, user] = await Promise.all([
      Bus.findById(busId).session(session),
      Route.findById(routeId).session(session),
      User.findById(userId).session(session),
    ]);

    if (!bus) return res.status(404).json({ message: "Bus not found" });
    if (!route) return res.status(404).json({ message: "Route not found" });
    if (!user) return res.status(404).json({ message: "User not found" });

    // (Optional) ensure route.bus == busId
    if (route.bus?.toString() !== bus._id.toString()) {
      return res.status(400).json({ message: "Route does not belong to bus" });
    }

    // Validate seat range
    const invalidSeats = cleanSeats.filter((s) => s > bus.capacity);
    if (invalidSeats.length) {
      return res
        .status(400)
        .json({ message: `Invalid seat numbers: ${invalidSeats.join(",")}` });
    }

    // Check already booked seats for that bus/date
    const existing = await Booking.aggregate([
      {
        $match: {
          bus: bus._id,
          travelDate: dateObj,
          status: "booked",
        },
      },
      { $unwind: "$seatNumbers" },
      {
        $group: {
          _id: null,
          seats: { $addToSet: "$seatNumbers" },
        },
      },
    ]).session(session);

    const taken = existing.length ? new Set(existing[0].seats) : new Set();
    const clashes = cleanSeats.filter((s) => taken.has(s));
    if (clashes.length) {
      return res
        .status(409)
        .json({ message: "Seats already booked", seats: clashes });
    }

    const totalPrice = calcPrice(bus, route, cleanSeats.length);
    const bookingReference = generateBookingRef();

    const booking = await Booking.create(
      [
        {
          user: user._id,
          bus: bus._id,
          route: route._id,
          travelDate: dateObj,
          seatNumbers: cleanSeats,
          totalPrice,
          status: "booked",
          paymentStatus: "pending",
          bookingReference,
          notes: notes?.trim(),
        },
      ],
      { session }
    );

    await session.commitTransaction();
    sendMail(
      bookingConfirmationTemplate(user.email, {
        name: user.username,
        bookingRef: bookingReference,
        bus: bus.name,
        route: route.name,
        travelDate: dateObj,
        seatNumbers: cleanSeats,
        totalPrice,
      })
    );
    res.status(201).json({ message: "Booking created", booking: booking[0] });
  } catch (e) {
    if (useTxn) {
      try {
        await session.abortTransaction();
      } catch (_) {}
    }
    console.error("createBooking error:", e);
    res.status(500).json({ message: "Server error" });
  } finally {
    session.endSession();
  }
};

// List bookings (admin) with filtering
export const listBookings = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = {};
    const { userId, busId, routeId, status, paymentStatus, date } = req.query;
    if (userId) filter.user = userId;
    if (busId) filter.bus = busId;
    if (routeId) filter.route = routeId;
    if (status) filter.status = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (date) {
      const d = normalizeDate(date);
      if (d) filter.travelDate = d;
    }

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate("user", "email username")
        .populate("bus")
        .populate("route")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Booking.countDocuments(filter),
    ]);

    res.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      count: bookings.length,
      bookings,
    });
  } catch (e) {
    console.error("listBookings error:", e);
    res.status(500).json({ message: "Server error" });
  }
};

// Get single booking (owner or admin)
export const getBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id)
      .populate("user", "email username role")
      .populate("bus")
      .populate("route");
    if (!booking) return res.status(404).json({ message: "Not found" });

    if (
      booking.user._id.toString() !== req.user.id &&
      booking.user.role !== "admin" &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ message: "Forbidden" });
    }

    res.json({ booking });
  } catch (e) {
    console.error("getBooking error:", e);
    res.status(500).json({ message: "Server error" });
  }
};

// List current user's bookings
export const myBookings = async (req, res) => {
  try {
    const userId = req.user.id;
    const bookings = await Booking.find({ user: userId })
      .populate("bus")
      .populate("route")
      .sort({ createdAt: -1 });
    res.json({ count: bookings.length, bookings });
  } catch (e) {
    console.error("myBookings error:", e);
    res.status(500).json({ message: "Server error" });
  }
};

// Cancel booking (owner or admin)
export const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ message: "Not found" });

    const user = await User.findById(req.user.id);
    const isAdmin = user?.role === "admin";

    if (booking.user.toString() !== req.user.id && !isAdmin) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (booking.status === "cancelled") {
      return res.status(200).json({ message: "Already cancelled", booking });
    }

    booking.status = "cancelled";
    // Optional: adjust paymentStatus, trigger refund, etc.
    await booking.save();

    res.json({ message: "Booking cancelled", booking });
  } catch (e) {
    console.error("cancelBooking error:", e);
    res.status(500).json({ message: "Server error" });
  }
};

// (Optional) mark paid
export const markBookingPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ message: "Not found" });
    booking.paymentStatus = "paid";
    await booking.save();
    res.json({ message: "Payment updated", booking });
  } catch (e) {
    console.error("markBookingPaid error:", e);
    res.status(500).json({ message: "Server error" });
  }
};
