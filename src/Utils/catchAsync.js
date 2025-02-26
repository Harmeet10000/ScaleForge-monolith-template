export const catchAsync = (fn) => {
    return (req, res, next) => {
        fn(req, res, next).catch((err) => {
            // logger.error(`🔥 Error caught in catchAsync: ${err.message}`, {
            //   error: err,
            // });
            next(err) // Pass error to global error handler
        })
    }
}


