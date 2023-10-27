const hre = require("hardhat");
const fs = require("fs");
const {ethers} = require("hardhat");
const { Wallet } = require("ethers");
require("dotenv").config({ path: __dirname + '/.env' });


const SUPPORTED_CHAINS_FILE = "supported_chains.json";

const CONFIGURATION_FOLDER = "./configuration";
const CHAINS = JSON.parse(fs.readFileSync(CONFIGURATION_FOLDER + "/" + SUPPORTED_CHAINS_FILE));
const CONTRACT_NAME = "GasTravel";



const filterChains = (allowed) => {
  return Object.keys(CHAINS)
  .filter(key => allowed.includes(key + ".json"))
  .reduce((obj, key) => {
    obj[key] = CHAINS[key];
    return obj;
  }, {});
}

const filterChain = (chain, chains=CHAINS) => {
    return Object.keys(chains)
            .filter(key => key != chain)
            .reduce((obj, key) => {
              obj[key] = chains[key];
              return obj;
            }, {});
}

const isCorrectlyConfiguredChain = (chain) => {
    console.log(`Validating ${chain} with configured chains`);
  
    if (typeof CHAINS === 'object')
    {
      if(CHAINS.hasOwnProperty(chain))
      {
        if(CHAINS[chain].hasOwnProperty("endpoint"))
        {
          if(ethers.utils.isAddress(CHAINS[chain]["endpoint"]))
          {
            if(CHAINS[chain].hasOwnProperty("id"))
            {
              if(Number.isInteger(CHAINS[chain]["id"]))
              {
                console.log(`Found valid record of ${chain} in configuration!`);
                return true;
              }
              else
              {
                console.log(`Configured ${chain} has an id with invalid integer value!`);
              }
            }
          }
          else
          {
            console.log(`Configured ${chain} has an endpoint with invalid address value!`);
          }
        }
        else
        {
          console.log(`Configured ${chain} has no endpoint key!`);
        }
      }
      else
      {
        console.log(`${chain} not available in configuration!`);
      }
    }
    else
    {
      console.log("Chains configuration missing !");
    }
  
    return false;
}

const getContractObj = (chain) => {
  const chainFilePath = CONFIGURATION_FOLDER + "/" + chain + ".json";
  if(!fs.existsSync(CONFIGURATION_FOLDER + "/" + chain + ".json"))
  {
      console.error(`${CONFIGURATION_FOLDER + "/" + chain + ".json"} could not be found!`);
      return null;
  }
  let ctrtObj;
  try 
  {
      ctrtObj = JSON.parse(fs.readFileSync(chainFilePath));
  }
  catch(error)
  {
      console.error(error);
      return null
  }
  return ctrtObj;
}

const getContract = async (chain, custom=false) => {
  
  const ctrtObj = getContractObj(chain);
  if(ctrtObj == null) return null;

  let ctrt;
  try
  {
      if(custom)
      {
        const signer = new Wallet(process.env.ACCOUNT_PK).connect(new ethers.providers.JsonRpcProvider(hre.config.networks[chain].url));
        ctrt = await ethers.getContractAt(CONTRACT_NAME, ctrtObj.address, signer);
      }
      else
      {
        ctrt = await ethers.getContractAt(CONTRACT_NAME, ctrtObj.address);
      }
      
  }
  catch(error)
  {
      console.error(error);
      return null;
  }
  return ctrt;
}

const getDeployedOnChains = () => {
  let configDirContent = fs.readdirSync(CONFIGURATION_FOLDER);
    if(configDirContent.includes(SUPPORTED_CHAINS_FILE))
    {
      configDirContent.splice(configDirContent.indexOf(SUPPORTED_CHAINS_FILE), 1);
    }
    return filterChains(configDirContent);
}

const getChainsWithoutChain = async (envchain, deployedOnChains) => {
    let chainsWithoutChain = filterChain(envchain, deployedOnChains);
    for(let chain in chainsWithoutChain)
    {
        chainsWithoutChain[chain]["ctrt"] = (await getContractObj(chain)).address;
    }
    return chainsWithoutChain;
}

/*
const resolveStucked = async() => {
  let srcChainId = LZ_ENDPOINT_OP_GOERLI_ID;
  // trustedRemote is the remote + local format
  let trustedRemote = ethers.utils.solidityPack(
      ['address','address'],
      [ALREADY_DEPLOYED_TRAVELER_OPGOERLI, ALREADY_DEPLOYED_TRAVELER_GOERLI]
  )
  let payload = ""; // copy and paste entire payload here
  const signer = (await ethers.getSigners())[0];

  const sigHash = ethers.utils.id("retryPayload(uint16,bytes,bytes)").substring(0, 10);
  const abi = new ethers.utils.AbiCoder();
  const params = abi.encode(
      ["uint16", "bytes", "bytes"], 
      [ srcChainId, trustedRemote, payload]
      ).slice(2); 
  let tx = await signer.sendTransaction({data: sigHash + params, to: LZ_ENDPOINT_GOERLI_ADDR});
  console.log(tx);
}
*/

module.exports = {CONFIGURATION_FOLDER, CHAINS, CONTRACT_NAME, SUPPORTED_CHAINS_FILE, isCorrectlyConfiguredChain, getChainsWithoutChain, getDeployedOnChains, getContract};