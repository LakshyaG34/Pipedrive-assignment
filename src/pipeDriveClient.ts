import { PipedrivePerson } from "./types/pipedrive";
import dotenv from "dotenv"

dotenv.config();

const API = "https://api.pipedrive.com/v2";

async function pipedrivereq<T>(endpoint: string, method: string = "GET", body ?: any): Promise<T>{
    const url = `${API}${endpoint}&api_token=${process.env.PIPEDRIVE_API_KEY}`;

    const response = await fetch(url, {
        method,
        headers: {"Content-type": "application/json"},
        body: body ? JSON.stringify(body) : undefined
    });

    const data = await response.json();

    if(!response.ok || data.success === false)
    {
        throw new Error(data.error || `Pipedrive API error: ${response.statusText}`);
    }

    return data.data as T;
}

export const pipedriveclient = {
    async searchPerson(email: string): Promise<PipedrivePerson | null>{
        const result = await pipedrivereq<{items: {item: PipedrivePerson}[]}>(
            `/persons/search?term=${encodeURIComponent(email)}&fields=email`
        );

        return result.items?.[0]?.item || null;
    },

    async createPerson(person: Partial<PipedrivePerson>): Promise<PipedrivePerson>{
        return await pipedrivereq<PipedrivePerson>(`/persons?`, "POST", person);
    },

    async updatePerson(id:number, person: Partial<PipedrivePerson>): Promise<PipedrivePerson>{
        return await pipedrivereq<PipedrivePerson>(`/persons/${id}?`, "PATCH", person);
    }
};