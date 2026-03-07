/* Controleur HTTP des presets de theme administrables. */
const {
  getAllThemePresets,
  createThemePreset,
  updateThemePreset,
  deleteThemePreset,
  applyThemePreset,
  getThemePresetReleases,
  rollbackThemePreset,
  exportThemePresetPackage,
  importThemePresetPackage,
} = require('../services/themePresetService')

/**
 * Liste les presets de theme.
 * @param {import('express').Request} req Requete HTTP.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres envoi JSON.
 */
async function getAll(req, res, next) {
  try {
    const presets = await getAllThemePresets()
    return res.json({ data: presets })
  } catch (err) {
    next(err)
  }
}

/**
 * Liste publiquement les presets de theme (lecture seule).
 * @param {import('express').Request} req Requete HTTP.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres envoi JSON.
 */
async function getAllPublic(req, res, next) {
  try {
    const presets = await getAllThemePresets()
    return res.json({ data: presets })
  } catch (err) {
    next(err)
  }
}

/**
 * Cree un preset de theme.
 * @param {import('express').Request} req Requete avec payload.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres creation.
 */
async function create(req, res, next) {
  try {
    const preset = await createThemePreset(req.body)
    return res.status(201).json({ data: preset })
  } catch (err) {
    next(err)
  }
}

/**
 * Met a jour un preset existant.
 * @param {import('express').Request} req Requete avec `params.id`.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres mise a jour.
 */
async function update(req, res, next) {
  try {
    const preset = await updateThemePreset(req.params.id, req.body)
    return res.json({ data: preset })
  } catch (err) {
    next(err)
  }
}

/**
 * Supprime un preset.
 * @param {import('express').Request} req Requete avec `params.id`.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres suppression.
 */
async function remove(req, res, next) {
  try {
    await deleteThemePreset(req.params.id)
    return res.status(204).send()
  } catch (err) {
    next(err)
  }
}

/**
 * Applique un preset aux settings globaux.
 * @param {import('express').Request} req Requete avec `params.id`.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres application.
 */
async function apply(req, res, next) {
  try {
    const preset = await applyThemePreset(req.params.id)
    return res.json({ data: preset, success: true })
  } catch (err) {
    next(err)
  }
}

/**
 * Liste l'historique des releases d'un preset.
 * @param {import('express').Request} req Requete avec `params.id`.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres envoi JSON.
 */
async function listReleases(req, res, next) {
  try {
    const releases = await getThemePresetReleases(req.params.id)
    return res.json({ data: releases })
  } catch (err) {
    next(err)
  }
}

/**
 * Effectue un rollback vers une release de preset.
 * @param {import('express').Request} req Requete avec `params.id` et `body.releaseId`.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres rollback.
 */
async function rollback(req, res, next) {
  try {
    const result = await rollbackThemePreset(req.params.id, req.body?.releaseId)
    return res.json({ data: result })
  } catch (err) {
    next(err)
  }
}

/**
 * Exporte un preset en package JSON.
 * @param {import('express').Request} req Requete avec `params.id`.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres export.
 */
async function exportPackage(req, res, next) {
  try {
    const data = await exportThemePresetPackage(req.params.id)
    return res.json({ data })
  } catch (err) {
    next(err)
  }
}

/**
 * Importe un package de preset (creation/mise a jour).
 * @param {import('express').Request} req Requete avec payload package.
 * @param {import('express').Response} res Reponse HTTP.
 * @param {import('express').NextFunction} next Middleware d'erreur.
 * @returns {Promise<void>} Promise resolue apres import.
 */
async function importPackage(req, res, next) {
  try {
    const result = await importThemePresetPackage(req.body)
    return res.status(200).json({ data: result })
  } catch (err) {
    next(err)
  }
}

module.exports = {
  getAll,
  getAllPublic,
  create,
  update,
  remove,
  apply,
  listReleases,
  rollback,
  exportPackage,
  importPackage,
}
