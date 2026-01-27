interface CustomWindow extends Window {
    env: {
        API_URL: string;
        API_PATH: string;
    }
}

const appEnv = (window as unknown as CustomWindow).env;
// const cdnUrl = 'https://enacit4r-cdn.epfl.ch/';
export const baseUrl = `${appEnv.API_URL}${appEnv.API_PATH}`;