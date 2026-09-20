const Room = require('../models/Room');

const listRooms = async (req, res) => {
  res.json(await Room.find().sort({ name: 1 }));
};

const createRoom = async (req, res) => {
  const room = await Room.create(req.body);
  res.status(201).json(room);
};

module.exports = { listRooms, createRoom };
