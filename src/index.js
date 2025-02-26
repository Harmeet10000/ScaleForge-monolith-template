import "./Config/dotenvConfig.js"
import app from './app.js'
import connectDB from './db/connect.js'
import { logger } from './Utils/logger.js'

connectDB()
    .then(() => {
        const server = app.listen(process.env.PORT || 8000, () => {
            logger.info(`Server is running at port: ${process.env.PORT}, in ${process.env.NODE_ENV}`)
        })

        process.on('unhandledRejection', (err) => {
            logger.error('UNHANDLED REJECTION! 💥 Shutting down...', { error: err })
            server.close(() => {
                process.exit(1)
            })
        })

        process.on('SIGTERM', () => {
            logger.info('SIGTERM received. Shutting down gracefully...')
            server.close(() => {
                logger.info('Process terminated!')
            })
        })
    })
    .catch((err) => {
        logger.error('Database Connection Failed!', { error: err })
    })
