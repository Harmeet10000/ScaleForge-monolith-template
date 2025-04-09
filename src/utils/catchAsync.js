import { logger } from './logger.js'

export const catchAsync = (fn) => {
    return (req, res, next) => {
        fn(req, res, next).catch((err) => {
            logger.error(`🔥 Error caught in catchAsync: ${err.message} - Request: ${req.method} ${req.originalUrl}`, {
                error: err,
                method: req.method,
                url: req.originalUrl,
                body: req.body,  
                query: req.query,
                params: req.params
            })
            next(err)
        })
    }
}
