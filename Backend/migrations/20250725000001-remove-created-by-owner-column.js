const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      console.log('Starting migration: remove created_by_owner column');
      
      // Check if the column exists before trying to remove it
      const tableInfo = await queryInterface.describeTable('bookings');
      
      if (tableInfo.created_by_owner) {
        // Before removing the column, update existing data
        // Set user_id to created_by_owner value where created_by_owner is not null and user_id is null
        await queryInterface.sequelize.query(`
          UPDATE bookings 
          SET user_id = created_by_owner 
          WHERE created_by_owner IS NOT NULL 
          AND user_id IS NULL
        `);
        
        console.log('Updated existing data: set user_id to created_by_owner value');
        
        // Now remove the created_by_owner column
        await queryInterface.removeColumn('bookings', 'created_by_owner');
        console.log('Removed created_by_owner column successfully');
      } else {
        console.log('created_by_owner column does not exist, skipping removal');
      }
      
      console.log('Migration completed successfully');
    } catch (error) {
      console.error('Error in migration:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      console.log('Starting rollback: add created_by_owner column back');
      
      // Check if the column exists
      const tableInfo = await queryInterface.describeTable('bookings');
      
      if (!tableInfo.created_by_owner) {
        // Add the created_by_owner column back
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
        
        console.log('Added created_by_owner column back');
      }
      
      console.log('Rollback completed successfully');
    } catch (error) {
      console.error('Error in rollback:', error);
      throw error;
    }
  }
};
