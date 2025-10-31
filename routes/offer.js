const express = require("express");
const router = express.Router();
const isAuthenticated = require("../middlewares/isAuthenticated");
const convertToBase64 = require("../utils/convertToBase64");
const cloudinary = require("cloudinary").v2;

const Offer = require("../models/Offer");
const User = require("../models/User");
const fileUpload = require("express-fileupload");

// Publish an offer
router.post(
  "/offer/publish",
  isAuthenticated,
  fileUpload(),
  async (req, res) => {
    try {
      // Ensure that offer details are valid
      if (
        req.body.title.length > 50 ||
        req.body.description > 500 ||
        req.body.price > 100000
      )
        return res.status(431).json({ message: "Offer details are not valid" });

      // Find user info
      const token = req.headers.authorization.replace("Bearer ", "");
      const userOwner = await User.findOne({ token: token });
      console.log(userOwner.account.username);

      const newOffer = new Offer({
        product_name: req.body.title,
        product_description: req.body.description,
        product_price: req.body.price,
        product_details: [
          { MARQUE: req.body.brand },
          { TAILLE: req.body.size },
          { ÉTAT: req.body.condition },
          { COULEUR: req.body.color },
          { EMPLACEMENT: req.body.city },
        ],
        owner: userOwner._id,
      });

      console.log(newOffer);

      // Upload image
      if (req.files) {
        const fileString = convertToBase64(req.files.picture);
        const cloudinaryResponse = await cloudinary.uploader.upload(
          fileString,
          {
            folder: `vinted/offers/${newOffer._id}`,
          }
        );

        // Add image refs into offer keys
        newOffer.product_image = cloudinaryResponse;
      }

      // Successfully create offer
      await newOffer.save();
      return res.json(
        await newOffer.populate("owner", "account username avatar")
      );
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// Modify an offer
router.put(
  "/offer/modify/:id",
  isAuthenticated,
  fileUpload(),
  async (req, res) => {
    try {
      const foundOffer = await Offer.findById(req.params.id);
      if (!foundOffer)
        return res.status(404).json({ message: "Offer not found" });
      foundOffer.product_name = req.body.title;
      foundOffer.product_description = req.body.description;
      foundOffer.product_price = req.body.price;
      foundOffer.product_details = [
        { MARQUE: req.body.brand },
        { TAILLE: req.body.size },
        { ÉTAT: req.body.condition },
        { COULEUR: req.body.color },
        { EMPLACEMENT: req.body.city },
      ];

      // Check if image was modified
      if (req.files) {
        await cloudinary.uploader.destroy(foundOffer.product_image.public_id);
        const fileString = convertToBase64(req.files.picture);
        const cloudinaryResponse = await cloudinary.uploader.upload(
          fileString,
          {
            folder: `vinted/offers/${foundOffer._id}`,
          }
        );
        foundOffer.product_image = cloudinaryResponse;
      }

      // Modify offer
      await foundOffer.save();
      return res
        .status(202)
        .json({ message: "Offer modifications saves", foundOffer });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// Delete an offer
router.delete("/offer/delete/:id", isAuthenticated, async (req, res) => {
  try {
    const foundOffer = await Offer.findById(req.params.id);
    if (!foundOffer)
      return res.status(404).json({ message: "Offer not found" });
    // Delete image folder tied to offer
    await cloudinary.api.delete_resources_by_prefix(
      `vinted/offers/${foundOffer._id}`
    );
    // Delete offer
    await foundOffer.deleteOne();
    return res.status(202).json({ message: "Offer deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Fetch offers with optional filters
router.get("/offers", async (req, res) => {
  try {
    // Pre-process search filters
    const searchTerm = req.query.title || "";
    const reqMinPrice = Number(req.query.priceMin) || 0;
    const reqMaxPrice = Number(req.query.priceMax) || Infinity;

    let reqSort = null;
    if (req.query.sort === "price-desc") reqSort = -1;
    else if (req.query.sort === "price-asc") reqSort = 1;

    let reqPage = Number(req.query.page) || 1;
    if (reqPage < 0) reqPage = 1;
    const perPage = 2;

    const filter = {
      product_name: { $regex: searchTerm, $options: "i" },
      product_price: { $gte: reqMinPrice, $lte: reqMaxPrice },
    };

    // Force last page if beyond total available articles
    const totalOffers = await Offer.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(totalOffers / perPage));
    if (reqPage > totalPages) reqPage = totalPages;

    const skip = (reqPage - 1) * perPage;

    // Build resulting query
    let query = Offer.find(filter)
      .limit(perPage)
      .skip(skip)
      .populate("owner", "account.username account.avatar");

    if (reqSort) query = query.sort({ product_price: reqSort });

    const searchResult = await query;

    // Return search result
    res.status(200).json({
      count: searchResult.length,
      offers: searchResult,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/offer/:id", async (req, res) => {
  try {
    if (!req.params.id) {
      return res.status(400).json({ message: "Bad request" });
    }

    const foundOffer = await Offer.findById(req.params.id).populate(
      "owner",
      "account.username account.avatar"
    );
    console.log(foundOffer);

    if (!foundOffer) return res.status(400).json({ message: "Bad request" });

    return res.status(200).json(foundOffer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
