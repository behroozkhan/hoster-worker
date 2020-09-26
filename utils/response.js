module.exports = class Response {
    constructor(success = true, data = {}, message = "") {
        this.success = success;
        this.message = message;
        this.data = data;

        this.json = () => {
            return {
                success: this.success,
                message: this.message,
                data: this.data
            };
        };
    }
}