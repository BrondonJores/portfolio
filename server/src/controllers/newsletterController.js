const {
  getAllCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  sendCampaign,
} = require('../services/newsletterService')

async function getAll(req, res, next) {
  try {
    const campaigns = await getAllCampaigns()
    return res.json({ data: campaigns })
  } catch (err) {
    next(err)
  }
}

async function create(req, res, next) {
  try {
    const campaign = await createCampaign(req.body)
    return res.status(201).json({ data: campaign })
  } catch (err) {
    next(err)
  }
}

async function update(req, res, next) {
  try {
    const campaign = await updateCampaign(req.params.id, req.body)
    return res.json({ data: campaign })
  } catch (err) {
    next(err)
  }
}

async function remove(req, res, next) {
  try {
    await deleteCampaign(req.params.id)
    return res.status(204).end()
  } catch (err) {
    next(err)
  }
}

async function send(req, res, next) {
  try {
    const result = await sendCampaign(req.params.id)
    return res.json({ data: result.campaign, mailer: result.mailer })
  } catch (err) {
    if (err.statusCode === 502) {
      return res.status(502).json({
        error: err.message,
        details: err.details,
      })
    }

    next(err)
  }
}

module.exports = { getAll, create, update, remove, send }