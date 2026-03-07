/* Migration de backfill: copie les templates existants vers marketplace_items. */
'use strict'

/**
 * Tronque un texte pour respecter une taille max.
 * @param {unknown} value Texte brut.
 * @param {number} maxLength Limite max.
 * @returns {string} Texte normalise.
 */
function sanitizeText(value, maxLength) {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxLength)
}

module.exports = {
  async up(queryInterface) {
    const [templates] = await queryInterface.sequelize.query(
      `SELECT id, name, context, description, blocks
       FROM block_templates`
    )

    if (!Array.isArray(templates) || templates.length === 0) {
      return
    }

    const rows = templates
      .map((template) => {
        const id = Number.parseInt(String(template.id), 10)
        if (!Number.isFinite(id) || id <= 0) return null

        const name = sanitizeText(template.name, 160)
        if (!name) return null

        const context = sanitizeText(template.context, 80) || 'all'
        const description = sanitizeText(template.description, 10000)
        const blocks = Array.isArray(template.blocks) ? template.blocks : []

        return {
          type: 'template',
          slug: `template-${id}`,
          name,
          short_description: description ? description.slice(0, 255) : `${name} (${context})`,
          description: description || null,
          category: context,
          style: 'custom',
          author: 'Admin',
          featured: false,
          version: 1,
          tags: [context],
          payload: {
            block_template_id: id,
            context,
            blocks,
          },
          source: 'admin',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        }
      })
      .filter(Boolean)

    if (rows.length === 0) {
      return
    }

    await queryInterface.bulkInsert('marketplace_items', rows)
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('marketplace_items', {
      type: 'template',
      source: 'admin',
    })
  },
}
