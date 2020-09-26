let jwt = require('jsonwebtoken');

module.exports.authorizeToken = function authorizeToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        res.sendStatus(401);
        return;
    }

    jwt.verify(token, process.env.JWT_ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) {
            res.sendStatus(403);
            return;
        }
        req.user = user;
        next();
    });
}

module.exports.generateAccessToken = function generateAccessToken(user, expireTime = '30d') {
    return jwt.sign(user, process.env.JWT_ACCESS_TOKEN_SECRET, {expiresIn: expireTime});
}