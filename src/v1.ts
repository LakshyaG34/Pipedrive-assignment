import dotenv from "dotenv";
import fetch, { Response } from "node-fetch";
import type { PipedrivePerson } from "./types/pipedrive";
import inputData from "./mappings/inputData.json";
import mappings from "./mappings/mappings.json";


dotenv.config();

const apiKey = process.env.PIPEDRIVE_API_KEY;
const companyDomain = process.env.PIPEDRIVE_COMPANY_DOMAIN;

if (!apiKey || !companyDomain) {
  throw new Error("❌ Missing env vars: Please set PIPEDRIVE_API_KEY and PIPEDRIVE_COMPANY_DOMAIN in .env");
}

type PipedriveResponse<T> = {
  success: boolean;
  data: T;
  additional_data?: any;
};

type SearchPersonResponse = {
  items: { item: PipedrivePerson }[];
};

type Mapping = {
  pipedriveKey: string;
  inputKey: string;
}



const nestedResolve = (obj: any, path: string): any => {
  return path.split(".").reduce((curr, key) => {
    return curr && curr[key] !== undefined ? curr[key] : undefined;
  }, obj);
};


const checkHttpError = async (res: Response) => {
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("❌ Unauthorized (401): Check your PIPEDRIVE_API_KEY.");
    } else if (res.status === 400) {
      throw new Error("❌ Bad Request (400): Invalid payload sent to Pipedrive.");
    } else if (res.status >= 500) {
      throw new Error(`❌ Server Error (${res.status}): Try again later.`);
    } else {
      throw new Error(`❌ HTTP Error ${res.status}: ${res.statusText}`);
    }
  }
};


const findPersonByName = async (name: string): Promise<PipedrivePerson | null> => {
  const url = `https://${companyDomain}.pipedrive.com/api/v1/persons/search?term=${encodeURIComponent(
    name
  )}&api_token=${apiKey}`;

  const res = await fetch(url);
  await checkHttpError(res);

  const data = (await res.json()) as PipedriveResponse<SearchPersonResponse>;
  if (!data.success) throw new Error(`❌ Failed to search person: ${JSON.stringify(data)}`);

  return data.data?.items?.length > 0 ? data.data.items[0].item : null;
};


const createPerson = async (payload: Record<string, any>): Promise<PipedrivePerson> => {
  const url = `https://${companyDomain}.pipedrive.com/api/v1/persons?api_token=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  await checkHttpError(res);

  const data = (await res.json()) as PipedriveResponse<PipedrivePerson>;
  if (!data.success) throw new Error(`❌ Failed to create person: ${JSON.stringify(data)}`);

  return data.data;
};


const updatePerson = async (id: number, payload: Record<string, any>): Promise<PipedrivePerson> => {
  const url = `https://${companyDomain}.pipedrive.com/api/v1/persons/${id}?api_token=${apiKey}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  await checkHttpError(res);

  const data = (await res.json()) as PipedriveResponse<PipedrivePerson>;
  if (!data.success) throw new Error(`❌ Failed to update person: ${JSON.stringify(data)}`);

  return data.data;
};


export const syncPdPerson = async (): Promise<PipedrivePerson> => {
  try {
    const payload: Partial<PipedrivePerson> = {};
    let nameValue: string | undefined;

    mappings.forEach((mappings: Mapping) => {
      const value = nestedResolve(inputData, mappings.inputKey);
      if (value !== undefined) {
        payload[mappings.pipedriveKey as keyof PipedrivePerson] = value;

        if (mappings.pipedriveKey === "name") {
          nameValue = value;
        }
      }
    });

    if (!nameValue) {
      throw new Error(
        "No name mapping found. Cannot search for existing person."
      );
    }

    // Check if person already exists
    const existingPerson = await findPersonByName(nameValue);

    if (existingPerson) {
      // Edge case 3: Update existing person if found
      const updatedPerson = await updatePerson(existingPerson.id, payload);
      console.log("✅ Updated existing person:", updatedPerson);
      return updatedPerson;
    } else {
      // Edge case 4: Create new person if not found
      const newPerson = await createPerson(payload);
      console.log("✅ Created new person:", newPerson);
      return newPerson;
    }
  } catch (error) {
    console.error("❌ Error syncing Pipedrive person:", error);
    throw error;
  }
};


(async () => {
  try {
    const person = await syncPdPerson();
    console.log("✅ Final Pipedrive Person:", person);
  } catch (error) {
    console.error("❌ Sync failed:", error);
  }
})();