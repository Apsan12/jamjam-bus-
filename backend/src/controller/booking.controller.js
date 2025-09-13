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
  // Customize: distance-based if available
  const perSeat = 10;
  return seatCount * perSeat;
};

const isTxnError = (e) =>
  e?.code === 251 ||
  e?.codeName === "NoSuchTransaction" ||
  e?.errorLabelSet?.has?.("TransientTransactionError");

const getCleanSeats = (arr) => {
  const nums = Array.isArray(arr) ? arr : [arr];
  const clean = [...new Set(nums.map(Number))].filter(
    (n) => Number.isInteger(n) && n > 0
  );
  return clean;
};

// Create booking (transaction if possible, fallback if not)
export const createBooking = async (req, res) => {
  const { busId, routeId, travelDate, seatNumber, notes } = req.body;

  // Basic validation
  if (!busId || !routeId || !travelDate || !seatNumber) {
    return res
      .status(400)
      .json({ message: "busId, routeId, travelDate, seatNumber required" });
  }

  const seats = getCleanSeats(seatNumber);
  if (!seats.length) {
    return res.status(400).json({ message: "Valid seatNumber array required" });
  }

  const dateObj = normalizeDate(travelDate);
  if (!dateObj) return res.status(400).json({ message: "Invalid travelDate" });

  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const run = async (session) => {
    const q = (m) => (session ? m.session(session) : m);

    const [bus, route, user] = await Promise.all([
      q(Bus.findById(busId)),
      q(Route.findById(routeId)),
      q(User.findById(userId)),
    ]);

    if (!bus) return res.status(404).json({ message: "Bus not found" });
    if (!route) return res.status(404).json({ message: "Route not found" });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (route.bus?.toString() !== bus._id.toString()) {
      return res.status(400).json({ message: "Route does not belong to bus" });
    }

    const invalidSeats = seats.filter((s) => s > bus.capacity);
    if (invalidSeats.length) {
      return res
        .status(400)
        .json({ message: `Invalid seat numbers: ${invalidSeats.join(",")}` });
    }

    // Check taken seats for this bus/date
    const agg = Booking.aggregate([
      {
        $match: {
          bus: bus._id,
          travelDate: dateObj,
          status: "booked",
        },
      },
      { $unwind: "$seatNumber" }, // each seat as separate doc
      {
        $group: {
          _id: null,
          seats: { $addToSet: "$seatNumber" },
        },
      },
    ]);
    if (session) agg.session(session);
    const existing = await agg;
    const taken = existing.length ? new Set(existing[0].seats) : new Set();

    const clashes = seats.filter((s) => taken.has(s));
    if (clashes.length) {
      return res
        .status(409)
        .json({ message: "Seats already booked", seats: clashes });
    }

    const totalPrice = calcPrice(bus, route, seats.length);
    const bookingReference = generateBookingRef();

    const created = await Booking.create(
      [
        {
          user: user._id,
          bus: bus._id,
          route: route._id,
          travelDate: dateObj,
          seatNumber: seats,
          totalPrice,
          status: "booked",
          paymentStatus: "pending",
          bookingReference,
          notes: typeof notes === "string" ? notes.trim() : undefined,
        },
      ],
      session ? { session } : {}
    );

    // Fire-and-forget email (do not block booking)
    try {
      const { subject, html, text } = bookingConfirmationTemplate({
        name: user.username,
        bookingRef: bookingReference,
        bus: bus.busName || bus.busNumber || String(bus._id),
        route: route.routeName || String(route._id),
        travelDate: dateObj,
        seatNumbers: seats,
        totalPrice,
      });

      sendMail({ to: user.email, subject, html, text }).catch((e) =>
        console.warn("sendMail error:", e.message)
      );
    } catch (e) {
      console.warn("email template error:", e.message);
    }

    return res
      .status(201)
      .json({ message: "Booking created", booking: created[0] });
  };

  // Try transaction
  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    const out = await run(session);
    if (out?.headersSent) {
      await session.commitTransaction();
      return;
    }
    await session.commitTransaction();
  } catch (e) {
    try {
      await session?.abortTransaction();
    } catch {}
    if (isTxnError(e)) {
      // Fallback: retry without transaction
      try {
        await run(null);
        return;
      } catch (e2) {
        console.error("createBooking fallback error:", e2);
        return res.status(500).json({ message: "Server error" });
      }
    }
    console.error("createBooking error:", e);
    return res.status(500).json({ message: "Server error" });
  } finally {
    await session?.endSession();
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

    const isOwner = booking.user._id.toString() === req.user.id;
    const isAdmin = booking.user.role === "admin" || req.user.role === "admin";
    if (!isOwner && !isAdmin)
      return res.status(403).json({ message: "Forbidden" });

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

    const user = await User.findById(req.user.id).select("role");
    const isAdmin = user?.role === "admin";

    if (booking.user.toString() !== req.user.id && !isAdmin) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (booking.status === "cancelled") {
      return res.status(200).json({ message: "Already cancelled", booking });
    }

    booking.status = "cancelled";
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
