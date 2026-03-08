/* Controleur HTTP des brouillons persistants du visual builder admin. */
const {
  getCurrentVisualBuilderDraft,
  saveCurrentVisualBuilderDraft,
  deleteCurrentVisualBuilderDraft,
} = require('../services/visualBuilderDraftService')

/**
 * Recupere le brouillon courant d'un channel builder.
 * @param {import('express').Request} req Requete HTTP.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres reponse JSON.
 */
async function getCurrent(req, res, next) {
  try {
    const draft = await getCurrentVisualBuilderDraft({
      entity: req.query.entity,
      channel: req.query.channel,
    })

    return res.json({ data: draft })
  } catch (err) {
    next(err)
  }
}

/**
 * Cree ou met a jour le brouillon courant d'un channel builder.
 * @param {import('express').Request} req Requete HTTP avec payload.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres reponse JSON.
 */
async function upsertCurrent(req, res, next) {
  try {
    const result = await saveCurrentVisualBuilderDraft({
      entity: req.body?.entity,
      channel: req.body?.channel,
      title: req.body?.title,
      blocks: req.body?.blocks,
      adminId: req.user?.id,
    })

    return res.status(result.created ? 201 : 200).json({
      data: result.draft,
      meta: {
        changed: result.changed,
        created: result.created,
      },
    })
  } catch (err) {
    next(err)
  }
}

/**
 * Supprime un brouillon courant (entite + channel).
 * @param {import('express').Request} req Requete HTTP.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres suppression.
 */
async function removeCurrent(req, res, next) {
  try {
    const result = await deleteCurrentVisualBuilderDraft({
      entity: req.query.entity,
      channel: req.query.channel,
    })

    return res.json({ data: result })
  } catch (err) {
    next(err)
  }
}

module.exports = {
  getCurrent,
  upsertCurrent,
  removeCurrent,
}
