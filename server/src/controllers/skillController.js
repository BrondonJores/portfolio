/* Controleur des competences */
const { Skill } = require('../models')

/* Recuperation de toutes les competences groupees par categorie */
async function getAll(req, res, next) {
  try {
    const skills = await Skill.findAll({ order: [['category', 'ASC'], ['sort_order', 'ASC']] })

    /* Regroupement par categorie */
    const grouped = skills.reduce((acc, skill) => {
      const cat = skill.category
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(skill)
      return acc
    }, {})

    return res.json({ data: grouped })
  } catch (err) {
    next(err)
  }
}

/* Creation d'une competence */
async function create(req, res, next) {
  try {
    const skill = await Skill.create(req.body)
    return res.status(201).json({ data: skill })
  } catch (err) {
    next(err)
  }
}

/* Mise a jour d'une competence */
async function update(req, res, next) {
  try {
    const skill = await Skill.findByPk(req.params.id)

    if (!skill) {
      return res.status(404).json({ error: 'Competence introuvable.' })
    }

    await skill.update(req.body)

    return res.json({ data: skill })
  } catch (err) {
    next(err)
  }
}

/* Suppression d'une competence */
async function remove(req, res, next) {
  try {
    const skill = await Skill.findByPk(req.params.id)

    if (!skill) {
      return res.status(404).json({ error: 'Competence introuvable.' })
    }

    await skill.destroy()

    return res.status(204).send()
  } catch (err) {
    next(err)
  }
}

module.exports = { getAll, create, update, remove }
