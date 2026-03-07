/* Middleware de validation des donnees d'entree */
const { validationResult } = require('express-validator')

/**
 * Execute les validations express-validator et retourne les erreurs si presentes.
 */
function validate(validations) {
  return async (req, res, next) => {
    /* Execution de chaque validation */
    for (const validation of validations) {
      await validation.run(req)
    }

    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      const details = errors.array()
      const messages = Array.from(
        new Set(
          details
            .map((item) => String(item?.msg || '').trim())
            .filter(Boolean)
        )
      )

      return res.status(422).json({
        error: messages.length > 0 ? messages.join(' ') : 'Donnees invalides.',
        errors: details,
      })
    }

    next()
  }
}

module.exports = { validate }
