import mongoose from "mongoose";

const busSchema = new mongoose.Schema(
  {
    busName: { type: String, required: [true, "busname is required"] },
    busNumber: {
      type: String,
      required: [true, "busnumber is required"],
      unique: true,
    },
    route: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Route",
      required: [true, "route is required"],
    },
    capacity: { type: Number, required: [true, "capacity is required"] },
    imageUrl: { type: String, required: [true, "imageUrl is required"] },
  },
  { timestamps: true }
);

const Bus = mongoose.model("Bus", busSchema);

export default Bus;
