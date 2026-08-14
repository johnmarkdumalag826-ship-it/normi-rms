const PanelAvailability = require('../models/PanelAvailability');

const listAvailability = async (req, res) => {
  const filter = {};
  if (req.query.panelistId) filter.panelistId = req.query.panelistId;
  res.json(await PanelAvailability.find(filter));
};

const createAvailability = async (req, res) => {
  const availability = await PanelAvailability.create(req.body);
  res.status(201).json(availability);
};

module.exports = { listAvailability, createAvailability };
