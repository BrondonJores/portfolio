const { Skill } = require('../models')
const { createHttpError } = require('../utils/httpError')

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

function createSkillService(deps = {}) {
  const skillModel = deps.skillModel || Skill

  async function getAllSkillsGrouped() {
    const skills = await skillModel.findAll({ order: [['category', 'ASC'], ['sort_order', 'ASC']] })
    return groupByCategory(skills)
  }

  async function createSkill(payload) {
    return skillModel.create(payload)
  }

  async function updateSkill(id, payload) {
    const skill = await skillModel.findByPk(id)
    if (!skill) {
      throw createHttpError(404, 'Competence introuvable.')
    }

    await skill.update(payload)
    return skill
  }

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