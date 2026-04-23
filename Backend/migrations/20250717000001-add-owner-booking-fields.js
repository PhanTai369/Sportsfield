const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Check which columns already exist
      const tableInfo = await queryInterface.describeTable('bookings');
      
      // Add is_owner_booking if it doesn't exist
      if (!tableInfo.is_owner_booking) {
        await queryInterface.addColumn('bookings', 'is_owner_booking', {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
          allowNull: false,
          comment: 'Indicates if this booking was created by the field owner on behalf of a customer'
        });
        console.log('Added is_owner_booking column');
      }

      // Add created_by_owner if it doesn't exist
      if (!tableInfo.created_by_owner) {
        await queryInterface.addColumn('bookings', 'created_by_owner', {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
          comment: 'Owner ID who created this booking (if is_owner_booking is true)'
        });
        console.log('Added created_by_owner column');
      }

      // Add remaining_amount if it doesn't exist
      if (!tableInfo.remaining_amount) {
        await queryInterface.addColumn('bookings', 'remaining_amount', {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: true,
          defaultValue: 0,
          comment: 'Remaining amount to be paid'
        });
        console.log('Added remaining_amount column');
      }

      // Add notes if it doesn't exist
      if (!tableInfo.notes) {
        await queryInterface.addColumn('bookings', 'notes', {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: 'Additional notes for the booking'
        });
        console.log('Added notes column');
      }

      console.log('Owner booking fields migration completed successfully');
    } catch (error) {
      console.error('Error in migration:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Remove fields only if they exist
      const tableInfo = await queryInterface.describeTable('bookings');
      
      if (tableInfo.is_owner_booking) {
        await queryInterface.removeColumn('bookings', 'is_owner_booking');
      }
      if (tableInfo.created_by_owner) {
        await queryInterface.removeColumn('bookings', 'created_by_owner');
      }
      if (tableInfo.remaining_amount) {
        await queryInterface.removeColumn('bookings', 'remaining_amount');
      }
      if (tableInfo.notes) {
        await queryInterface.removeColumn('bookings', 'notes');
      }
    } catch (error) {
      console.error('Error in rollback:', error);
      throw error;
    }
  }
};
