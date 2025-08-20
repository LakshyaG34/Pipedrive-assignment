import dotenv from "dotenv";
import type { PipedrivePerson } from "./types/pipedrive";
// import  
import inputData from "./mappings/inputData.json";
import mappings from "./mappings/mappings.json";
import { pipedriveclient } from "./pipeDriveClient";

dotenv.config();

const apiKey = process.env.PIPEDRIVE_API_KEY;
// const companyDomain = process.env.PIPEDRIVE_COMPANY_DOMAIN;

function nestingResolve(obj: any, path: string):any {
  return path.split(".").reduce((acc, key)=>acc?.[key], obj);
}

// Write your code here

const syncPdPerson = async (): Promise<PipedrivePerson> => {
  try {
    //edge case 1
    if(!apiKey)
    {
      throw new Error("Missing ApiKey")
    }

    const payload: Partial<PipedrivePerson> = {};
    
    for(const map of mappings as {pipedriveKey: string, inputKey: string}[])
    {
      // payload[map.pipedriveKey] = nestingResolve(inputData, map.inputKey);
      const value = nestingResolve(inputData, map.inputKey);
      if(value===null || value===undefined)
      {
        continue;
      }
      if(map.pipedriveKey === "email")
      {
        payload.email = [{ label: "work", value, primary: true }]
      }
      else if(map.pipedriveKey === "phone")
      {
        payload.phone = [{label: "work", value, primary: true}]
      }
      else{
        (payload as any)[map.pipedriveKey] = value;
      }
    }

    if(!payload.name)
    {
      throw new Error("Name field is missing in the payload");
    }

    const emailValue = payload.email?.[0]?.value;

    let existingPerson: PipedrivePerson | null = null;

    if(emailValue){
      existingPerson = await pipedriveclient.searchPerson(emailValue);
    }

    if(existingPerson)
    {
      return await pipedriveclient.updatePerson(existingPerson.id, payload);
    }
    else{
      return await pipedriveclient.createPerson(payload);
    }
  } catch (error: any) {
    // Handle error
    console.log("Error occured", error.message);
    throw error;
  }
};

(async () => {
  const pipedrivePerson = await syncPdPerson();
  console.log("Synced person:", pipedrivePerson);
})();


// const personName = payload["name"] as string | undefined;

    // //edge case 2
    // if(!personName)
    // {
    //   throw new Error("Name field Missing in payload");
    // }

    // if(payload.email)
    // {
    //   payload.email = [{value: payload.email, primary: true}];
    // }
    // if(payload.phone)
    // {
    //   payload.phone = [{value: payload.phone, primary: true}];
    // }
    // console.log("Payload:", JSON.stringify(payload, null, 2));

    // const searchURL = `https://api.pipedrive.com/v2/persons/search?term=${encodeURIComponent(
    //   personName
    // )}&api_token=${apiKey}`;
    
    // const searchRes = await fetch(searchURL);
    // if(!searchRes.ok)
    // {
    //   throw new Error(`Failed to search Person. Status: ${searchRes.status} ${searchRes.statusText}`)
    // }
    // const searchData: Pipe = await searchRes.json();

    // //edge case 3
    // if(searchData?.data?.items?.length>1)
    // {
    //   console.log("Multiple Persons found with same name", searchData.data.items[0].item.id)
    // }

    // let person: PipedrivePerson;

    // if(searchData?.data?.items?.length>0)
    // {
    //   const personId = searchData.data.items[0].item.id;
    //   // const updateURL = `https://${companyDomain}.pipedrive.com/v1/persons/${personId}?api_token=${apiKey}`

    //   //changing from v1 pipedrive API to v2 pipedrive API
    //   const updateURL = `https://api.pipedrive.com/v2/persons/${personId}?api_token=${apiKey}`;
    //   const updateRes = await fetch(updateURL,{
    //     method: "PUT",
    //     headers: {"Content-type": "application/json"},
    //     body: JSON.stringify(payload),
    //   });

    //   const updatePerson = await updateRes.json();
    //   person = updatePerson;
    // }
    // else{
    //   const createURL = `https://api.pipedrive.com/v2/persons?api_token=${apiKey}`
    //   const createRes = await fetch(createURL, {
    //     method: "POST",
    //     headers: {"Content-type": "application/json"},
    //     body: JSON.stringify(payload),
    //   });

    //   const createPerson = await createRes.json();
    //   person = createPerson.data;
    // }

    // return person;
