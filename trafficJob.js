var cron = require('node-cron');
const Promise = require('bluebird');
const readdir = Promise.promisify(require('fs').readdir)

let scheduleTraficJob = () => {
    console.log("scheduleTraficJob")
    // cron.schedule('*/30 * * * *', async () => {
    cron.schedule('* * * * * *', async () => {
        await trafficJob();
    });
}

let trafficJob = async () => {
    let publisherApiUrl = process.env.PUBLISHER_API_URL;

    let path = `${process.env.HOST_PATH}`;
    let folders = await getDirectories(path);

    console.log("trafficJob", folders);
}

let getWebsiteData = async (inputs) => {
    // TODO call publisher
}

let getDirectories = async (path) => {
    let files = await readdir(path, { withFileTypes: true });
    return files.filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
}

module.exports = scheduleTraficJob;