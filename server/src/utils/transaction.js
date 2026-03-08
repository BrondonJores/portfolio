/* Utilitaire transactionnel: execute une operation en transaction si Sequelize est disponible. */

/**
 * Retourne un gestionnaire transactionnel Sequelize exploitable.
 * @param {object} options Options de resolution.
 * @param {object} [options.model] Modele Sequelize potentiel.
 * @param {Function} [options.transactionProvider] Provider transaction injecte (DI/tests).
 * @returns {Function|null} Fonction de transaction ou `null`.
 */
function resolveTransactionProvider({ model, transactionProvider }) {
  if (typeof transactionProvider === 'function') {
    return transactionProvider
  }

  const sequelizeInstance = model?.sequelize
  if (sequelizeInstance && typeof sequelizeInstance.transaction === 'function') {
    return sequelizeInstance.transaction.bind(sequelizeInstance)
  }

  return null
}

/**
 * Execute un callback dans une transaction Sequelize quand possible.
 * En environnement DI/tests sans DB, retombe en execution directe.
 * @template T
 * @param {object} options Options transaction.
 * @param {object} [options.model] Modele Sequelize potentiel.
 * @param {Function} [options.transactionProvider] Provider transaction injecte.
 * @param {(transaction: object|null) => Promise<T>} callback Travail metier a executer.
 * @returns {Promise<T>} Resultat du callback.
 */
async function withOptionalTransaction(options, callback) {
  const provider = resolveTransactionProvider(options || {})
  if (!provider) {
    return callback(null)
  }

  return provider(async (transaction) => callback(transaction))
}

module.exports = {
  resolveTransactionProvider,
  withOptionalTransaction,
}

