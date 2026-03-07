/* Service metier testimonial : regles applicatives et acces donnees. */
const { Testimonial } = require('../models')
const { createHttpError } = require('../utils/httpError')

/**
 * Construit le service temoignage avec dependances injectables.
 * @param {object} [deps={}] Dependances externes.
 * @param {object} [deps.testimonialModel] Modele testimonial.
 * @returns {object} API metier testimonial.
 */
function createTestimonialService(deps = {}) {
  const testimonialModel = deps.testimonialModel || Testimonial

  /**
   * Liste les temoignages visibles cote public.
   * @returns {Promise<Array>} Liste des temoignages visibles.
   */
  async function getVisibleTestimonials() {
    return testimonialModel.findAll({
      where: { visible: true },
      order: [['created_at', 'DESC']],
    })
  }

  /**
   * Liste tous les temoignages cote admin.
   * @returns {Promise<Array>} Liste complete des temoignages.
   */
  async function getAllTestimonialsAdmin() {
    return testimonialModel.findAll({ order: [['created_at', 'DESC']] })
  }

  /**
   * Cree un temoignage.
   * @param {object} payload Donnees temoignage.
   * @returns {Promise<object>} Temoignage cree.
   */
  async function createTestimonial(payload) {
    return testimonialModel.create(payload)
  }

  /**
   * Met a jour un temoignage.
   * @param {number|string} id Identifiant temoignage.
   * @param {object} payload Champs a modifier.
   * @returns {Promise<object>} Temoignage mis a jour.
   * @throws {Error} Erreur 404 si temoignage introuvable.
   */
  async function updateTestimonial(id, payload) {
    const testimonial = await testimonialModel.findByPk(id)
    if (!testimonial) {
      throw createHttpError(404, 'Temoignage introuvable.')
    }

    await testimonial.update(payload)
    return testimonial
  }

  /**
   * Supprime un temoignage.
   * @param {number|string} id Identifiant temoignage.
   * @returns {Promise<void>} Promise resolue apres suppression.
   * @throws {Error} Erreur 404 si temoignage introuvable.
   */
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
