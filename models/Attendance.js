module.exports = (sequelize, DataTypes) => {
  const Attendance = sequelize.define('Attendance', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.STRING, allowNull: false },
    eventId: { type: DataTypes.STRING, allowNull: false },
    status: { type: DataTypes.ENUM('present', 'absent'), defaultValue: 'present' },
  }, {
    timestamps: true,
    tableName: 'attendances'
  });

  return Attendance;
};
