
export abstract class SdkgenError extends Error {
    constructor(message?: string) {
        super(message);
        this.name = this.constructor.name;
    }

    public toJSON() {
        return {
            type: this.constructor.name,
            message: this.message
        };
    }
}
