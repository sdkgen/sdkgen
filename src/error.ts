export class SdkgenError extends Error {
    constructor(message?: string) {
        super(message);
        this.name = this.constructor.name;
    }

    get type() {
        return this.name;
    }

    public toJSON() {
        return {
            message: this.message,
            type: this.constructor.name,
        };
    }
}
