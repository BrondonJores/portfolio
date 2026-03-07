const { Testimonial } = require('../models')
const { createHttpError } = require('../utils/httpError')

function createTestimonialService(deps = {}) {
  const testimonialModel = deps.testimonialModel || Testimonial

  async function getVisibleTestimonials() {
    return testimonialModel.findAll({
      where: { visible: true },
      order: [['created_at', 'DESC']],
    })
  }

  async function getAllTestimonialsAdmin() {
    return testimonialModel.findAll({ order: [['created_at', 'DESC']] })
  }

  async function createTestimonial(payload) {
    return testimonialModel.create(payload)
  }

  async function updateTestimonial(id, payload) {
    const testimonial = await testimonialModel.findByPk(id)
    if (!testimonial) {
      throw createHttpError(404, 'Temoignage introuvable.')
    }

    await testimonial.update(payload)
    return testimonial
  }

  async function deleteTestimonial(id) {
    const testimonial = await testimonialModel.findByPk(id)
    if (!testimonial) {
      throw createHttpError(404, 'Temoignage introuvable.')
    }

    await testimonial.destroy()
  }

  return {
    getVisibleTestimonials,
    getAllTestimonialsAdmin,
    createTestimonial,
    updateTestimonial,
    deleteTestimonial,
  }
}

module.exports = {
  createTestimonialService,
  ...createTestimonialService(),
}