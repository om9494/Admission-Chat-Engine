import 'dotenv/config'
import app from './app.js'
import { connectDB } from './config/database.js'
import logger from './config/logger.js'

const PORT = process.env.PORT || 3001

async function startServer() {
  try {
    await connectDB()
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} [${process.env.NODE_ENV}]`)
    })
  } catch (err) {
    logger.error('Failed to start server:', err)
    process.exit(1)
  }
}

startServer()

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully.')
  process.exit(0)
})
