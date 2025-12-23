import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { encryptData, decryptData } from './crypto';

// Types for the secure response structure

class SecureApiClient {
    private client: AxiosInstance;

    constructor(baseURL: string = '/api') {
        this.client = axios.create({
            baseURL,
            headers: {
                'Content-Type': 'application/json',
            },
            // Do not throw on error, handle manually to decrypt error responses if needed
            validateStatus: () => true,
        });
    }

    /**
     * Secure POST request.
     * Encrypts the body payload before sending.
     * By default, expects a normal JSON response, but can be adapted to expect encrypted response.
     */
    async post<T = unknown>(url: string, body: unknown, config?: AxiosRequestConfig): Promise<T> {
        try {
            // 1. Encrypt body
            const encryptedPayload = await encryptData(body);

            // 2. Send request with encrypted payload wrapper
            // We wrap it in a simple object to valid JSON: { payload: "..." }
            const response = await this.client.post(url, { payload: encryptedPayload }, config);

            if (response.status >= 200 && response.status < 300) {
                // If server returns encrypted response, we could decrypt here
                // For now, assuming server returns standard JSON for success unless specified
                // But if user wants full tunnel, verify response type
                if (response.data && response.data.encryptedResponse) {
                    return await decryptData(response.data.encryptedResponse);
                }
                return response.data;
            } else {
                if (response.status === 403) {
                    throw new Error('Access Denied: You or this site has been banned.');
                }
                throw new Error(response.data?.error || `Request failed with status ${response.status}`);
            }
        } catch (error: unknown) {
            console.error('Secure Client Error:', error);
            throw error;
        }
    }

    /**
     * Secure GET.
     * NOTE: GET requests cannot have a body. 
     * Sensitive data should NOT be in query params.
     * We mainly use this for fetching, but if query params need hiding, 
     * we should use POST (Tunneling).
     */
    async get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
        // Check if we should warn about GET
        // For now, standard get
        const response = await this.client.get(url, config);
        if (response.status >= 200 && response.status < 300) {
            return response.data;
        }
        throw new Error(response.data?.error);
    }
}

export const secureClient = new SecureApiClient();
