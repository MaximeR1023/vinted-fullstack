require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const userRoutes = require("./routes/user");
const offerRoutes = require("./routes/offer");

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect(process.env.MONGODB_URI);

app.use(userRoutes);
app.use(offerRoutes);

app.all(/.*/, (req, res) => {
  res.status(401).json({ message: "This route does not exist" });
});

app.listen(process.env.PORT, () => console.log("Server started"));
