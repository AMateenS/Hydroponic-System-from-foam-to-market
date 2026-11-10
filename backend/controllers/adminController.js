const fs = require("fs");
const path = require("path");
const Product = require("../models/Product");
const Team = require("../models/Team");
const Sponsor = require("../models/Sponsor");
const Slider = require("../models/Slider");
const Video = require("../models/Video");

const uploadDir = path.join(__dirname, "..", "uploads");

const removeImage = (filename) => {
  if (!filename) return;
  fs.unlink(path.join(uploadDir, path.basename(filename)), () => {});
};

const pick = (body, fields) => {
  const data = {};
  for (const f of fields) {
    if (body[f] !== undefined) data[f] = typeof body[f] === "string" ? body[f].trim() : body[f];
  }
  return data;
};

const fail = (res, error) => {
  const status = error.name === "ValidationError" || error.name === "CastError" ? 400 : 500;
  res.status(status).json({ error: error.message });
};

/**
 * One CRUD implementation for Product, Team, Sponsor, Slider and Video.
 * Same behaviour as your old controllers, but updating without a new image
 * no longer crashes.
 */
const makeCrud = ({ Model, label, fields, hasImage }) => ({
  add: async (req, res) => {
    try {
      if (hasImage && !req.file) return res.status(400).json({ error: "Please upload an image" });
      const data = pick(req.body, fields);
      if (hasImage) data.image = req.file.filename;
      const item = await Model.create(data);
      res.status(201).json({ message: `${label} added successfully`, item });
    } catch (error) {
      if (req.file) removeImage(req.file.filename);
      fail(res, error);
    }
  },

  list: async (req, res) => {
    try {
      res.status(200).json(await Model.find().sort({ createdAt: -1 }));
    } catch (error) {
      fail(res, error);
    }
  },

  remove: async (req, res) => {
    try {
      const item = await Model.findByIdAndDelete(req.params.id);
      if (!item) return res.status(404).json({ error: `${label} not found` });
      if (hasImage) removeImage(item.image);
      res.status(200).json({ message: "Deleted" });
    } catch (error) {
      fail(res, error);
    }
  },

  update: async (req, res) => {
    try {
      const old = await Model.findById(req.params.id);
      if (!old) {
        if (req.file) removeImage(req.file.filename);
        return res.status(404).json({ error: `${label} not found` });
      }
      const data = pick(req.body, fields);
      if (hasImage && req.file) data.image = req.file.filename;

      await Model.findByIdAndUpdate(req.params.id, data, { runValidators: true });
      if (hasImage && req.file) removeImage(old.image);
      res.status(200).json({ message: "Updated" });
    } catch (error) {
      if (req.file) removeImage(req.file.filename);
      fail(res, error);
    }
  },
});

const product = makeCrud({
  Model: Product,
  label: "Product",
  fields: ["name", "price", "unit", "description", "stock"],
  hasImage: true,
});
const team = makeCrud({
  Model: Team,
  label: "Team member",
  fields: ["name", "role", "description"],
  hasImage: true,
});
const sponsor = makeCrud({
  Model: Sponsor,
  label: "Sponsor",
  fields: ["name", "description"],
  hasImage: true,
});
const slider = makeCrud({
  Model: Slider,
  label: "Slide",
  fields: ["description"],
  hasImage: true,
});
const video = makeCrud({
  Model: Video,
  label: "Video",
  fields: ["title", "url", "description"],
  hasImage: false,
});

module.exports = {
  addProduct: product.add, getProducts: product.list, deleteProduct: product.remove, updateProduct: product.update,
  addTeam: team.add, getTeams: team.list, deleteTeam: team.remove, updateTeam: team.update,
  addSponsor: sponsor.add, getSponsors: sponsor.list, deleteSponsor: sponsor.remove, updateSponsor: sponsor.update,
  addSlider: slider.add, getSliders: slider.list, deleteSlider: slider.remove, updateSlider: slider.update,
  addVideo: video.add, getVideos: video.list, deleteVideo: video.remove, updateVideo: video.update,
};
