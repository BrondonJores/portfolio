'use strict'

/**
 * Migration d'index de performance.
 * Couvre les filtres/tri les plus fréquents observes dans:
 * - dashboard stats
 * - listings admin
 * - lecture commentaires publics
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.addIndex('messages', ['created_at'], {
      name: 'idx_messages_created_at',
    })
    await queryInterface.addIndex('messages', ['read_at'], {
      name: 'idx_messages_read_at',
    })

    await queryInterface.addIndex('comments', ['article_id', 'approved', 'created_at'], {
      name: 'idx_comments_article_approved_created_at',
    })
    await queryInterface.addIndex('comments', ['created_at'], {
      name: 'idx_comments_created_at',
    })

    await queryInterface.addIndex('articles', ['published', 'published_at'], {
      name: 'idx_articles_published_published_at',
    })
    await queryInterface.addIndex('articles', ['created_at'], {
      name: 'idx_articles_created_at',
    })

    await queryInterface.addIndex('projects', ['published', 'created_at'], {
      name: 'idx_projects_published_created_at',
    })
    await queryInterface.addIndex('projects', ['published', 'featured'], {
      name: 'idx_projects_published_featured',
    })

    await queryInterface.addIndex('newsletter_campaigns', ['status', 'created_at'], {
      name: 'idx_newsletter_campaigns_status_created_at',
    })
    await queryInterface.addIndex('newsletter_campaigns', ['status', 'sent_at'], {
      name: 'idx_newsletter_campaigns_status_sent_at',
    })

    await queryInterface.addIndex('newsletter_subscribers', ['confirmed', 'created_at'], {
      name: 'idx_newsletter_subscribers_confirmed_created_at',
    })
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('newsletter_subscribers', 'idx_newsletter_subscribers_confirmed_created_at')

    await queryInterface.removeIndex('newsletter_campaigns', 'idx_newsletter_campaigns_status_sent_at')
    await queryInterface.removeIndex('newsletter_campaigns', 'idx_newsletter_campaigns_status_created_at')

    await queryInterface.removeIndex('projects', 'idx_projects_published_featured')
    await queryInterface.removeIndex('projects', 'idx_projects_published_created_at')

    await queryInterface.removeIndex('articles', 'idx_articles_created_at')
    await queryInterface.removeIndex('articles', 'idx_articles_published_published_at')

    await queryInterface.removeIndex('comments', 'idx_comments_created_at')
    await queryInterface.removeIndex('comments', 'idx_comments_article_approved_created_at')

    await queryInterface.removeIndex('messages', 'idx_messages_read_at')
    await queryInterface.removeIndex('messages', 'idx_messages_created_at')
  },
}

