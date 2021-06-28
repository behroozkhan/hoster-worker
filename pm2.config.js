module.exports = {
    apps : [{
        name      : 'Hoster Worker',
        script    : 'index.js',
        node_args : '-r dotenv/config',
    }],
}