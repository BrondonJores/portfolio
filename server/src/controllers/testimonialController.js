const {
  getVisibleTestimonials,
  getAllTestimonialsAdmin,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
} = require('../services/testimonialService')

async function getAllPublic(req, res, next) {
  try {
    const testimonials = await getVisibleTestimonials()
    return res.json({ data: testimonials })
  } catch (err) {
    next(err)
  }
}

async function getAllAdmin(req, res, next) {
  try {
    const testimonials = await getAllTestimonialsAdmin()
    return res.json({ data: testimonials })
  } catch (err) {
    next(err)
  }
}

async function create(req, res, next) {
  try {
    const testimonial = await createTestimonial(req.body)
    return res.status(201).json({ data: testimonial })
  } catch (err) {
    next(err)
  }
}

async function update(req, res, next) {
  try {
    const testimonial = await updateTestimonial(req.params.id, req.body)
    return res.json({ data: testimonial })
  } catch (err) {
    next(err)
  }
}

async function remove(req, res, next) {
  try {
    await deleteTestimonial(req.params.id)
    return res.status(204).send()
  } catch (err) {
    next(err)
  }
}

module.exports = { getAllPublic, getAllAdmin, create, update, remove }