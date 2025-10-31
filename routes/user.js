const express = require("express");
const router = express.Router();

const uid2 = require("uid2");
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const fileUpload = require("express-fileupload");
const isAuthenticated = require("../middlewares/isAuthenticated");
const convertToBase64 = require("../utils/convertToBase64");
const cloudinary = require("cloudinary").v2;

const User = require("../models/User.js");

// Create an account
router.post("/user/signup", fileUpload(), async (req, res) => {
  try {
    // Ensure that username is specified
    if (!req.body.username)
      return res.status(400).json({ message: "User name not specified" });

    // Check if email is not already tied to an existing account
    const existingAccount = await User.find({ email: req.body.email });
    if (existingAccount[0])
      return res.status(409).json({ message: "This e-mail is already used" });

    // Encrypt password
    const salt = uid2(16);
    const hash = SHA256(req.body.password + salt).toString(encBase64);
    const token = uid2(64);

    const newUser = new User({
      email: req.body.email,
      account: { username: req.body.username },
      newsletter: req.body.newsletter,
      token: token,
      hash: hash,
      salt: salt,
    });

    // Upload avatar if any
    if (req.files) {
      const fileString = convertToBase64(req.files.avatar);
      const cloudinaryResponse = await cloudinary.uploader.upload(fileString, {
        folder: `vinted/users/${newUser._id}`,
      });
      newUser.account.avatar = cloudinaryResponse;
    }

    // Successfully create an account
    await newUser.save();

    res.status(201).json({
      message: "Account successfully created",
      newUser: {
        _id: newUser._id,
        token: newUser.token,
        account: newUser.account,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Log in
router.post("/user/login", async (req, res) => {
  try {
    // Check if account with specified email exists
    const foundUser = await User.findOne({ email: req.body.email });
    if (!foundUser) return res.status(401).json({ message: "Unauthorized" });

    const hash = SHA256(req.body.password + foundUser.salt).toString(encBase64);

    // If password is correct, send account info back
    if (hash === foundUser.hash)
      return res.status(202).json({
        _id: foundUser._id,
        token: foundUser.token,
        account: foundUser.account,
      });
    else return res.status(401).json({ message: "Unauthorized" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

// Change avatar
router.post(
  "/user/change-avatar",
  isAuthenticated,
  fileUpload(),
  async (req, res) => {
    try {
      if (req.files) {
        const token = req.headers.authorization.replace("Bearer ", "");
        const foundUser = await User.findOne({ token: token });
        if (!foundUser)
          return res.status(401).json({ message: "Unauthorized" });

        if (foundUser.account.avatar)
          await cloudinary.uploader.destroy(foundUser.account.avatar.public_id);
        const fileString = convertToBase64(req.files.avatar);
        const cloudinaryResponse = await cloudinary.uploader.upload(
          fileString,
          {
            folder: `vinted/users/${foundUser._id}`,
          }
        );
        foundUser.account.avatar = cloudinaryResponse;
        await foundUser.save();
        return res.status(202).json({ message: "Avatar changed" });
      } else {
        return res.status(422).json({ message: "No image supplied" });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);
