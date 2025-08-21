import dotenv from "dotenv";
import type { PipedrivePerson } from "./types/pipedrive";
import inputData from "./mappings/inputData.json";
import mappings from "./mappings/mappings.json";
import axios from "axios";

// Load environment variables from .env file
dotenv.config();

// Get API key and company domain from environment variables
const apiKey = process.env.PIPEDRIVE_API_KEY;
const companyDomain = process.env.PIPEDRIVE_COMPANY_DOMAIN;

if (!apiKey || !companyDomain) {
  throw new Error(
    "Missing required environment variables: PIPEDRIVE_API_KEY or PIPEDRIVE_COMPANY_DOMAIN"
  );
}
const PIPEDRIVE_API_BASE = `https://${companyDomain}.pipedrive.com/api/v1`;

interface Mapping {
  pipedrivekey: string;
  inputkey: string;
}

interface ApiRes<T> {
  data: T;
  inputKey: string;
  success: boolean;
  additional_data?: any;
}

const nestedResolve = (obj: any, path: string): any => {
  return path.split(".").reduce((curr, key) => {
    return curr && curr[key] !== undefined ? curr[key] : undefined;
  }, obj);
};

const findPersonbyName = async (
  name: string
): Promise<PipedrivePerson | null> => {
  try {
    const response = await axios.get<ApiRes<PipedrivePerson[]>>(
      `${PIPEDRIVE_API_BASE}/persons/search`,
      {
        params: {
          api_token: apiKey,
          term: name,
          fields: "name",
        },
      }
    );
    if (
      response.data.success &&
      response.data.data &&
      response.data.data.length > 0
    ) {
      return response.data.data[0];
    }
    return null;
  } catch (error) {
    console.error("Error searching for person:", error);
    throw new Error(
      `Failed to search for person: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
};
const createPerson = async (
  personData: Partial<PipedrivePerson>
): Promise<PipedrivePerson> => {
  try {
    const response = await axios.post<ApiRes<PipedrivePerson>>(
      `${PIPEDRIVE_API_BASE}/persons`,
      {
        ...personData,
        api_token: apiKey,
      }
    );

    if (!response.data.success) {
      throw new Error("Failed to create person");
    }

    return response.data.data;
  } catch (error) {
    console.error("Error creating person:", error);
    throw new Error(
      `Failed to create person: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
};

const updatePerson = async (
  personId: number,
  personData: Partial<PipedrivePerson>
): Promise<PipedrivePerson> => {
  try {
    const response = await axios.put<ApiRes<PipedrivePerson>>(
      `${PIPEDRIVE_API_BASE}/persons/${personId}`,
      {
        ...personData,
        api_token: apiKey,
      }
    );

    if (!response.data.success) {
      throw new Error("Failed to update person");
    }

    return response.data.data;
  } catch (error) {
    console.error("Error updating person:", error);
    throw new Error(
      `Failed to update person: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
};

// Write your code here
const syncPdPerson = async (): Promise<PipedrivePerson> => {
  try {
    // Write your code here
    const payload: Partial<PipedrivePerson> = {};
    let nameValue: string | undefined;

    mappings.forEach((mappings: Mapping) => {
      const value = nestedResolve(inputData, mappings.inputkey);
      if (value !== undefined) {
        payload[mappings.pipedrivekey as keyof PipedrivePerson] = value;

        if (mappings.pipedrivekey === "name") {
          nameValue = value;
        }
      }
    });

    if (!nameValue) {
      throw new Error(
        "No name mapping found. Cannot search for existing person."
      );
    }

    const existingPerson = await findPersonbyName(nameValue);

    let result: PipedrivePerson;

    if (existingPerson) {
      console.log(`Updating existing person with ID: ${existingPerson.id}`);
      result = await updatePerson(existingPerson.id, payload);
    } else {
      console.log("Create a new Person");
      result = await createPerson(payload);
    }

    console.log("Sync completed successfully");
    return result;
  } catch (error) {
    // Handle error
    console.error("Error in syncPdPerson:", error);

    if (error instanceof Error) {
      throw new Error(`Synchronization failed: ${error.message}`);
    }

    throw new Error("Synchronization failed due to an unknown error");
  }
};

const pipedrivePerson = syncPdPerson();
console.log(pipedrivePerson);
