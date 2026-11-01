const notFound = (req, res, next) => {
    const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
    error.status = 404;
    error.code = "NOT_FOUND";
    next(error);
};

const errorHandler = (error, req, res, next) => {
    if (res.headersSent) {
        return next(error);
    }

    const status = Number.isInteger(error.status) && error.status >= 400 && error.status <= 599
        ? error.status
        : 500;

    if (status >= 500) {
        console.error("Request failed:", error);
    }

    res.status(status).json({
        error: {
            code: error.code || (
                status === 404
                    ? "NOT_FOUND"
                    : status < 500
                        ? "BAD_REQUEST"
                        : "INTERNAL_SERVER_ERROR"
            ),
            message: status < 500 ? error.message : "An unexpected error occurred"
        }
    });
};

module.exports = { errorHandler, notFound };
