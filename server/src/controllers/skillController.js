const {
  getAllSkillsGrouped,
  createSkill,
  updateSkill,
  deleteSkill,
} = require('../services/skillService')

async function getAll(req, res, next) {
  try {
    const skills = await getAllSkillsGrouped()
    return res.json({ data: skills })
  } catch (err) {
    next(err)
  }
}

async function create(req, res, next) {
  try {
    const skill = await createSkill(req.body)
    return res.status(201).json({ data: skill })
  } catch (err) {
    next(err)
  }
}

async function update(req, res, next) {
  try {
    const skill = await updateSkill(req.params.id, req.body)
    return res.json({ data: skill })
  } catch (err) {
    next(err)
  }
}

async function remove(req, res, next) {
  try {
    await deleteSkill(req.params.id)
    return res.status(204).send()
  } catch (err) {
    next(err)
  }
}

module.exports = { getAll, create, update, remove }