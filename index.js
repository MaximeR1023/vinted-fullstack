require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const cloudinary = require("cloudinary").v2;
const userRoutes = require("./routes/user");
const offerRoutes = require("./routes/offer");

const app = express();
app.use(express.json());
app.use(cors());

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

mongoose.connect(process.env.MONGODB_URI);

app.use(userRoutes);
app.use(offerRoutes);

app.all(/.*/, (req, res) => {
  res.status(401).json({ message: "This route does not exist" });
});

app.listen(process.env.PORT, () => console.log("Server started"));
