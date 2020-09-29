let { getConfig } = require("../model-manager/models.js");

module.exports.unlessRoute = function unlessRoute (path, middleware) {
    return function(req, res, next) {
        if (path.includes(req.url)) {
            return next();
        } else {
            return middleware(req, res, next);
        }
    };
};

module.exports.getRandomInt = function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports.makeResNum = function makeResNum(length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
       result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

module.exports.updateLongProcess = function updateLongProcess({longProcessUrl, longProcessToken, longProcessId}, status, state, metaData) {
    axios({
        method: 'post',
        url: longProcessUrl,
        data: {
            longProcessId,
            status,
            state,
            metaData
        },
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${longProcessToken}`
        }
    }).then(res => {}).catch(error => {
        console.log("update long process error: ", error);
    });
};