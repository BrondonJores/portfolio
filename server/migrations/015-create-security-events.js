/* Creation de la table des evenements de securite (audit admin). */
'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('security_events', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      event_type: {
        type: Sequelize.STRING(120),
        allowNull: false,
      },
      severity: {
        type: Sequelize.STRING(16),
        allowNull: false,
        defaultValue: 'info',
      },
      source: {
        type: Sequelize.STRING(60),
        allowNull: false,
        defaultValue: 'server',
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      ip_address: {
        type: Sequelize.STRING(64),
        allowNull: true,
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      request_path: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      http_method: {
        type: Sequelize.STRING(16),
        allowNull: true,
      },
      origin: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      email: {
        type: Sequelize.STRING(160),
        allowNull: true,
      },
      admin_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    })

    await queryInterface.addIndex('security_events', ['created_at'])
    await queryInterface.addIndex('security_events', ['event_type'])
    await queryInterface.addIndex('security_events', ['severity'])
    await queryInterface.addIndex('security_events', ['ip_address'])
  },

  async down(queryInterface) {
    await queryInterface.dropTable('security_events')
  },
}
