'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Tạo bảng review_replies để lưu trữ phản hồi đánh giá
    await queryInterface.createTable('review_replies', {
      id: {
        allowNull: false,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        type: Sequelize.UUID
      },
      review_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'reviews',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Tạo index cho review_id để tối ưu query
    try {
      await queryInterface.addIndex('review_replies', ['review_id']);
    } catch (error) {
      console.log('Index review_replies_review_id already exists, skipping...');
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('review_replies');
  }
};
