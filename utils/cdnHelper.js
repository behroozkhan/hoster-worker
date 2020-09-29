const CDNInterface = require('./cdnInterface/cdnInterface');

let CDNHelper = {};

CDNHelper.cdnRecordExist = async (domain, exactSearch) => {
    try{
        let {success, result} = await CDNInterface.dnsRecordList(domain, {search: exactSearch});
        
        if (!success) {
            throw new Error("dnsRecordList error ...");
        }

        let foundRecord = result.data.find(rec => {
            return rec.name === exactSearch;
        });

        return foundRecord;
    } catch (error) {
        console.log("cdnRecordExist error", error);
        return false;
    }
};

CDNHelper.updateOrCreateHttps = async (domain) => {
    try{
        let result = await CDNInterface.getHttpsSetting(domain);

        if (!result)
            throw new Error('Failed on get https setting');
        
        if (result.data.f_ssl_status !== 'on') {
            let updateResult = await CDNInterface.updateHttpsSetting(domain, {
                f_ssl_type: 'arvan',
                f_ssl_status: 'on',
            });
            
            if (!updateResult.success)
                throw new Error('Failed on update https setting');
        }

        return {
            success: true
        };
    } catch (error) {
        return {
            success: false,
            error
        };
    }
};

module.exports = CDNHelper;