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
    
    let input = {

    };
    folders.forEach(async folder => {
        let userId = parseInt(folder.split('_')[1]);
        input[userId] = [];

        let userPath = `${path}/${folder}`;
        console.log("userPath", userPath)
        let subFolders = await getDirectories(userPath);
        console.log("subFolders", subFolders)
        subFolders.forEach(subFolder => {
            let websiteName = subFolder;
            input[userId].push(websiteName);
        })
    });

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