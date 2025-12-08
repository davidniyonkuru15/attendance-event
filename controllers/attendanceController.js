const db = require('../models');
const Attendance = db.Attendance;

// Mark attendance
exports.markAttendance = async (req, res) => {
  try {
    const { userId, eventId, status } = req.body;
    const record = await Attendance.create({ userId, eventId, status });
    res.status(200).json({ success: true, message: 'Attendance marked', data: record });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get attendance by event
exports.getEventAttendance = async (req, res) => {
  try {
    const { eventId } = req.params;
    const records = await Attendance.findAll({ where: { eventId } });
    res.status(200).json({ success: true, data: records });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
