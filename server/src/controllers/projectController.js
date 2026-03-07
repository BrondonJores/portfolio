const {
  getAllPublicProjects,
  getPublicProjectBySlug,
  getAllAdminProjects,
  createProject,
  updateProject,
  deleteProject,
} = require('../services/projectService')

async function getAllPublic(req, res, next) {
  try {
    const result = await getAllPublicProjects({
      page: req.query.page,
      limit: req.query.limit,
      tag: req.query.tag,
      featured: req.query.featured,
    })

    return res.json(result)
  } catch (err) {
    next(err)
  }
}

async function getBySlug(req, res, next) {
  try {
    const project = await getPublicProjectBySlug(req.params.slug)
    return res.json({ data: project })
  } catch (err) {
    next(err)
  }
}

async function getAllAdmin(req, res, next) {
  try {
    const projects = await getAllAdminProjects()
    return res.json({ data: projects })
  } catch (err) {
    next(err)
  }
}

async function create(req, res, next) {
  try {
    const project = await createProject(req.body)
    return res.status(201).json({ data: project })
  } catch (err) {
    next(err)
  }
}

async function update(req, res, next) {
  try {
    const project = await updateProject(req.params.id, req.body)
    return res.json({ data: project })
  } catch (err) {
    next(err)
  }
}

async function remove(req, res, next) {
  try {
    await deleteProject(req.params.id)
    return res.status(204).send()
  } catch (err) {
    next(err)
  }
}

module.exports = { getAllPublic, getBySlug, getAllAdmin, create, update, remove }