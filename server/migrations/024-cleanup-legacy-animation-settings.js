'use strict'

const { Op } = require('sequelize')

const LEGACY_ANIMATION_SETTING_KEYS = [
  'anim_profile',
  'anim_reduce_motion_mode',
  'anim_ease_preset',
  'anim_section_reveal_type',
  'anim_section_duration_ms',
  'anim_section_distance_px',
  'anim_section_once',
  'anim_card_hover',
  'anim_card_lift_px',
  'anim_card_scale',
  'anim_card_tilt_deg',
  'anim_cta_pulse',
  'anim_cta_pulse_interval_ms',
  'anim_mascot_style',
  'anim_mascot_bubbles_enabled',
  'anim_mascot_bubble_interval_ms',
  'anim_mascot_bubble_max_visible',
  'anim_mascot_bubble_messages',
  'anim_sprite_style',
  'anim_sprite_path',
  'anim_sprite_side_pattern',
  'anim_sprite_flip_enabled',
  'anim_sprite_bounce_px',
  'anim_sprite_wander_rotation_deg',
  'anim_scene_hero',
  'anim_scene_about',
  'anim_scene_skills',
  'anim_scene_projects',
  'anim_scene_blog',
  'anim_scene_contact',
  'anim_scroll_progress_enabled',
  'anim_scroll_progress_thickness',
]

module.exports = {
  /**
   * Supprime les anciens settings d'animation devenus inutiles
   * apres le passage au mode assets-only (Lottie/Rive).
   *
   * @param {import('sequelize').QueryInterface} queryInterface Query interface Sequelize.
   * @returns {Promise<void>} Promise resolue apres nettoyage.
   */
  async up(queryInterface) {
    await queryInterface.bulkDelete('settings', {
      key: {
        [Op.in]: LEGACY_ANIMATION_SETTING_KEYS,
      },
    })
  },

  /**
   * Migration irreversible: les valeurs legacy supprimees ne sont pas restaurees.
   *
   * @returns {Promise<void>} Promise resolue immediatement.
   */
  async down() {
    return Promise.resolve()
  },
}

