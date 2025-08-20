import dotenv from "dotenv";
import type { PipedrivePerson } from "./types/pipedrive";
import inputData from "./mappings/inputData.json";
import mappings from "./mappings/mappings.json";

// Load environment variables from .env file
dotenv.config();

// Get API key and company domain from environment variables
const apiKey = process.env.PIPEDRIVE_API_KEY;
const companyDomain = process.env.PIPEDRIVE_COMPANY_DOMAIN;

// Write your code here
const syncPdPerson = async (): Promise<PipedrivePerson> => {
  try {
    if(!apiKey || !companyDomain)
    {
      throw new Error("Missing fields")
    }

    const payload: Record<string, any> = {};
    for(const map of mappings as {pipedriveKey: string, inputKey: string}[])
    {
      payload[map.pipedriveKey] = (inputData as any)[map.inputKey]
    }

    const personName = payload["name"];
    if(!personName)
    {
      throw new Error("Name field Missing in payload");
    }

    const searchURL = `https://${companyDomain}.pipedrive.com/v1/persons/search?term=${encodeURIComponent(
      personName
    )}&api_token=${apiKey}`;
    
    const searchRes = await fetch(searchURL);
    const searchData = await searchRes.json();

    let person: PipedrivePerson;

    if(searchData?.data?.items?.length>0)
    {
      const personId = searchData.data.item[0].item.id;
      const updateURL = `https://${companyDomain}.pipedrive.com/v1/persons/${personId}?api_token=${apiKey}`
      const updateRes = await fetch(updateURL,{
        method: "PUT",
        headers: {"Content-type": "application/json"},
        body: JSON.stringify(payload),
      });

      const updatePerson = await updateRes.json();
      person = updatePerson;
    }
    else{
      const createURL = `https://${companyDomain}.pipedrive.com/v1/persons?api_token=${apiKey}`
      const createRes = await fetch(createURL, {
        method: "POST",
        headers: {"Content-type": "application/json"},
        body: JSON.stringify(payload),
      });

      const createPerson = await createRes.json();
      person = createPerson.data;
    }

    return person;
  } catch (error) {
    // Handle error
    console.log("Error occured", error);
    throw error;
  }
};

(async () => {
  const pipedrivePerson = await syncPdPerson();
  console.log("Synced person:", pipedrivePerson);
})();
