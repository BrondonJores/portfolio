/* Service metier skill : regles applicatives et acces donnees. */
const { Skill } = require('../models')
const { createHttpError } = require('../utils/httpError')

/**
 * Regroupe les competences par categorie.
 * @param {Array<object>} skills Liste brute de competences.
 * @returns {Record<string, Array<object>>} Dictionnaire category -> competences.
 */
function groupByCategory(skills) {
  return skills.reduce((acc, skill) => {
    const category = skill.category
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(skill)
    return acc
  }, {})
}

/**
 * Construit le service skill avec dependances injectables.
 * @param {object} [deps={}] Dependances externes.
 * @param {object} [deps.skillModel] Modele skill.
 * @returns {object} API metier skill.
 */
function createSkillService(deps = {}) {
  const skillModel = deps.skillModel || Skill

  /**
   * Retourne les competences regroupees par categorie.
   * @returns {Promise<Record<string, Array<object>>>} Groupement des competences.
   */
  async function getAllSkillsGrouped() {
    const skills = await skillModel.findAll({ order: [['category', 'ASC'], ['sort_order', 'ASC']] })
    return groupByCategory(skills)
  }

  /**
   * Cree une competence.
   * @param {object} payload Donnees skill.
   * @returns {Promise<object>} Skill creee.
   */
  async function createSkill(payload) {
    return skillModel.create(payload)
  }

  /**
   * Met a jour une competence.
   * @param {number|string} id Identifiant skill.
   * @param {object} payload Donnees a modifier.
   * @returns {Promise<object>} Skill mise a jour.
   * @throws {Error} Erreur 404 si skill introuvable.
   */
  async function updateSkill(id, payload) {
    const skill = await skillModel.findByPk(id)
    if (!skill) {
      throw createHttpError(404, 'Competence introuvable.')
    }

    await skill.update(payload)
    return skill
  }

  /**
   * Supprime une competence.
   * @param {number|string} id Identifiant skill.
   * @returns {Promise<void>} Promise resolue apres suppression.
   * @throws {Error} Erreur 404 si skill introuvable.
   */
  async function deleteSkill(id) {
    const skill = await skillModel.findByPk(id)
    if (!skill) {
      throw createHttpError(404, 'Competence introuvable.')
    }

    await skill.destroy()
  }

  return {
    getAllSkillsGrouped,
    createSkill,
    updateSkill,
    deleteSkill,
  }
}

module.exports = {
  createSkillService,
  ...createSkillService(),
}
