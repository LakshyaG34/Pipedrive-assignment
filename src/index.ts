import dotenv from "dotenv";
import fetch,{Response as NodeFetchResponse} from "node-fetch";
import type { PipedrivePerson } from "./types/pipedrive";
import inputData from "./mappings/inputData.json";
import mappings from "./mappings/mappings.json";

dotenv.config();

const apiKey = process.env.PIPEDRIVE_API_KEY;
const companyDomain = process.env.PIPEDRIVE_COMPANY_DOMAIN;

//Edge case 1
if (!apiKey || !companyDomain) {
  throw new Error(
    "Missing either Api key or company domain, please make sure missing files are in env"
  );
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
};

//Edge case 2(If mapped data is nested)
const nestedResolve = (obj: any, path: string): any => {
  return path.split(".").reduce((curr, key) => {
    return curr && curr[key] !== undefined ? curr[key] : undefined;
  }, obj);
};

//Improved Error Checking
const checkHttpError = async (res: NodeFetchResponse) => {
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("Unauthorized (401): Check your your api token.");
    } else if (res.status === 400) {
      throw new Error(
        "❌ Bad Request (400): Invalid payload."
      );
    } else if (res.status >= 500) {
      throw new Error(`Server Error (${res.status})`);
    } else {
      throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
    }
  }
};

const findPersonByName = async (
  name: string
): Promise<PipedrivePerson | null> => {
  const url = `https://${companyDomain}.pipedrive.com/api/v2/persons/search?term=${encodeURIComponent(
    name
  )}&fields=name&api_token=${apiKey}`;

  const res = await fetch(url);
  await checkHttpError(res);

  const data = (await res.json()) as PipedriveResponse<SearchPersonResponse>;
  if (!data.success)
    throw new Error(`Failed to search person: ${JSON.stringify(data)}`);

  return data.data?.items?.length > 0 ? data.data.items[0].item : null;
};

const createPerson = async (
  payload: Record<string, any>
): Promise<PipedrivePerson> => {
  const url = `https://${companyDomain}.pipedrive.com/api/v2/persons?api_token=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  await checkHttpError(res);

  const data = (await res.json()) as PipedriveResponse<PipedrivePerson>;
  if (!data.success)
    throw new Error(`Failed to create person: ${JSON.stringify(data)}`);

  return data.data;
};

const updatePerson = async (
  id: number,
  payload: Record<string, any>
): Promise<PipedrivePerson> => {
  const url = `https://${companyDomain}.pipedrive.com/api/v2/persons/${id}?api_token=${apiKey}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  await checkHttpError(res);

  const data = (await res.json()) as PipedriveResponse<PipedrivePerson>;
  if (!data.success)
    throw new Error(`Failed to update person: ${JSON.stringify(data)}`);

  return data.data;
};

export const syncPdPerson = async (): Promise<PipedrivePerson> => {
  try {
    const payload: Record<string, any> = {};
    let nameValue: string | undefined;

    (mappings as Mapping[]).forEach((mapping: Mapping) => {
      const value = nestedResolve(inputData, mapping.inputKey);
      if (value !== undefined) {
        if (mapping.pipedriveKey === "emails") {
          payload.emails = [{ label: "work", value: value.toString(), primary: true }];
          //  payload.email = value.toString(); 
        } else if (mapping.pipedriveKey === "phones") {
          payload.phones = [{ label: "work", value: value.toString(), primary: true }];
          //  payload.email = value.toString(); 
        } else {
          payload[mapping.pipedriveKey] = value;
        }

        // Store the name value for searching
        if (mapping.pipedriveKey === "name") {
          nameValue = value;
        }
      }
    });
    console.log("Final payload before sync:", JSON.stringify(payload, null, 2));

    //Edge case 3
    if (!nameValue) {
      throw new Error(
        "Cannot search for existing person."
      );
    }

    //Edge case 4(Check if person already exists)
    const existingPerson = await findPersonByName(nameValue);

    if (existingPerson) {
      console.log(`Found existing person with ID: ${existingPerson.id}`);
      const updatedPerson = await updatePerson(existingPerson.id, payload);
      console.log("Updated existing person:", updatedPerson);
      return updatedPerson;
    } else {
      const newPerson = await createPerson(payload);
      console.log("Created new person:", newPerson);
      return newPerson;
    }
  } catch (error) {
    console.error("Error syncing Pipedrive person:", error);
    throw error;
  }
};

//Edge case5(since we are calling asynchronous function, need to wrap the syncPdPerson() inside async-await)
(async () => {
  try {
    const person = await syncPdPerson();
    console.log("Final Pipedrive Person:", person);
  } catch (error) {
    console.error("Sync failed:", error);
    process.exit(1);
  }
})();