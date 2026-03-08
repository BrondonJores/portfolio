/* Migration pour ajouter l'entite `page` au visual builder persistant. */
'use strict'

module.exports = {
  /**
   * Ajoute la valeur `page` a l'enum `visual_builder_drafts.entity_type`.
   * @param {import('sequelize').QueryInterface} queryInterface Interface migration.
   * @returns {Promise<void>} Promise resolue apres alter type.
   */
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type t
          JOIN pg_enum e ON t.oid = e.enumtypid
          WHERE t.typname = 'enum_visual_builder_drafts_entity_type'
            AND e.enumlabel = 'page'
        ) THEN
          ALTER TYPE "enum_visual_builder_drafts_entity_type" ADD VALUE 'page';
        END IF;
      END$$;
    `)
  },

  /**
   * Migration non reversible de facon sure (PostgreSQL enum).
   * @returns {Promise<void>} Promise resolue sans action.
   */
  async down() {},
}
