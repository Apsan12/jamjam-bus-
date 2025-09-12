import mongoose from "mongoose";

const routeSchema = new mongoose.Schema(
  {
    routeName: {
      type: String,
      required: [true, "Route name is required"],
      unique: true,
    },
    startLocation: {
      type: String,
      required: [true, "Start location is required"],
    },
    endLocation: { type: String, required: [true, "End location is required"] },
    distance: { type: Number, required: [true, "Distance is required"] },
    bus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bus",
      required: [true, "Bus is required"],
    },
    routemapUrl: { type: String },
  },
  { timestamps: true }
);

const Route = mongoose.model("Route", routeSchema);

export default Route;
