// Log with a timestamp
export const log = (message: string) => {
    console.log(`[${new Date().toISOString()}] ${message}`);
};
