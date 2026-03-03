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
      return res.status(422).json({ errors: errors.array() })
    }

    next()
  }
}

module.exports = { validate }
