const ayncHandler = (requestHandler) =>{
    (req, res, next) =>{
        Promise.resolve(req, res, next).catch((err) => next(err))
    }
}

export {asyncHandler}

// const ayncHandler = (fn) => async (req, res, next) => {
//    try {
//     await fn(req, res, next)
//    } catch (error) {
//         res.status(error.code || 500).json({
//             success: false,
//             message: error.message
//         });
//    }
// }