/* Service metier certification : regles applicatives et acces donnees. */
const { Certification } = require('../models')
const { createHttpError } = require('../utils/httpError')
const { resolveLimitOffsetPagination, buildPaginatedPayload } = require('../utils/pagination')

/**
 * Normalise une liste de badges en tableau de chaines dedoublonne.
 * @param {unknown} value Valeur source.
 * @returns {string[]} Tableau de badges nettoyes.
 */
function normalizeBadges(value) {
  if (!Array.isArray(value)) {
    return []
  }

  return Array.from(
    new Set(
      value
        .map((entry) => String(entry || '').trim())
        .filter(Boolean)
    )
  ).slice(0, 24)
}

/**
 * Construit le service certification avec dependances injectables.
 * @param {object} [deps={}] Dependances externes.
 * @param {object} [deps.certificationModel] Modele certification.
 * @returns {object} API metier certification.
 */
function createCertificationService(deps = {}) {
  const certificationModel = deps.certificationModel || Certification

  /**
   * Liste les certifications publiques (publiees uniquement).
   * @returns {Promise<Array<object>>} Liste triee des certifications.
   */
  async function getAllPublicCertifications() {
    return certificationModel.findAll({
      where: { published: true },
      order: [['sort_order', 'ASC'], ['issued_at', 'DESC'], ['created_at', 'DESC']],
    })
  }

  /**
   * Liste admin des certifications avec pagination.
   * @param {object} [params={}] Parametres de pagination.
   * @returns {Promise<{items:Array<object>,total:number,limit:number,offset:number}>} Liste paginee.
   */
  async function getAllAdminCertifications(params = {}) {
    const { limit, offset } = resolveLimitOffsetPagination(params, {
      defaultLimit: 20,
      maxLimit: 200,
    })

    const result = await certificationModel.findAndCountAll({
      order: [['sort_order', 'ASC'], ['issued_at', 'DESC'], ['created_at', 'DESC']],
      limit,
      offset,
    })

    return buildPaginatedPayload({
      items: result.rows,
      total: result.count,
      limit,
      offset,
    })
  }

  /**
   * Cree une certification.
   * @param {object} payload Donnees certification.
   * @returns {Promise<object>} Certification creee.
   */
  async function createCertification(payload) {
    return certificationModel.create({
      ...payload,
      badges: normalizeBadges(payload?.badges),
    })
  }

  /**
   * Met a jour une certification.
   * @param {number|string} id Identifiant certification.
   * @param {object} payload Donnees a modifier.
   * @returns {Promise<object>} Certification mise a jour.
   * @throws {Error} Erreur 404 si certification introuvable.
   */
  async function updateCertification(id, payload) {
    const certification = await certificationModel.findByPk(id)
    if (!certification) {
      throw createHttpError(404, 'Certification introuvable.')
    }

    const updates = { ...payload }
    if (Object.prototype.hasOwnProperty.call(updates, 'badges')) {
      updates.badges = normalizeBadges(updates.badges)
    }

    await certification.update(updates)
    return certification
  }

  /**
   * Supprime une certification.
   * @param {number|string} id Identifiant certification.
   * @returns {Promise<void>} Promise resolue apres suppression.
   * @throws {Error} Erreur 404 si certification introuvable.
   */
  async function deleteCertification(id) {
    const certification = await certificationModel.findByPk(id)
    if (!certification) {
      throw createHttpError(404, 'Certification introuvable.')
    }

    await certification.destroy()
  }

  return {
    getAllPublicCertifications,
    getAllAdminCertifications,
    createCertification,
    updateCertification,
    deleteCertification,
  }
}

module.exports = {
  createCertificationService,
  ...createCertificationService(),
}
