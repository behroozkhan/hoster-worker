var cron = require('node-cron');
const Promise = require('bluebird');
const readdir = Promise.promisify(require('fs').readdir)

let scheduleTraficJob = () => {
    console.log("scheduleTraficJob")
    // cron.schedule('*/30 * * * *', async () => {
    cron.schedule('*/10 * * * * *', async () => {
        await trafficJob();
    });
}

let trafficJob = async () => {
    let publisherApiUrl = process.env.PUBLISHER_API_URL;

    let path = `${process.env.HOST_PATH}`;
    let folders = await getDirectories(path);
    
    let input = {};

    for (const folder of folders) {
        let userId = parseInt(folder.split('_')[1]);
        input[userId] = [];

        let userPath = `${path}/${folder}`;
        let subFolders = await getDirectories(userPath);
        subFolders.forEach(subFolder => {
            input[userId].push(subFolder);
        })
    }

    console.log("trafficJob", input)
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