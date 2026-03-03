/* Controleur des temoignages */
const { Testimonial } = require('../models')

/* Recuperation publique des temoignages visibles */
async function getAllPublic(req, res, next) {
  try {
    const testimonials = await Testimonial.findAll({
      where: { visible: true },
      order: [['created_at', 'DESC']],
    })
    return res.json({ data: testimonials })
  } catch (err) {
    next(err)
  }
}

/* Recuperation admin de tous les temoignages */
async function getAllAdmin(req, res, next) {
  try {
    const testimonials = await Testimonial.findAll({ order: [['created_at', 'DESC']] })
    return res.json({ data: testimonials })
  } catch (err) {
    next(err)
  }
}

/* Creation d'un temoignage */
async function create(req, res, next) {
  try {
    const testimonial = await Testimonial.create(req.body)
    return res.status(201).json({ data: testimonial })
  } catch (err) {
    next(err)
  }
}

/* Mise a jour d'un temoignage */
async function update(req, res, next) {
  try {
    const testimonial = await Testimonial.findByPk(req.params.id)

    if (!testimonial) {
      return res.status(404).json({ error: 'Temoignage introuvable.' })
    }

    await testimonial.update(req.body)

    return res.json({ data: testimonial })
  } catch (err) {
    next(err)
  }
}

/* Suppression d'un temoignage */
async function remove(req, res, next) {
  try {
    const testimonial = await Testimonial.findByPk(req.params.id)

    if (!testimonial) {
      return res.status(404).json({ error: 'Temoignage introuvable.' })
    }

    await testimonial.destroy()

    return res.status(204).send()
  } catch (err) {
    next(err)
  }
}

module.exports = { getAllPublic, getAllAdmin, create, update, remove }
