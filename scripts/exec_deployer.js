
const {ethers} = require("hardhat");
const fs = require("fs");
const { CHAINS, CONTRACT_NAME, CONFIGURATION_FOLDER } = require("./helper.js");






const deployContract = async (chain) => {
  
  console.log(`Deploying ${CONTRACT_NAME} in ${chain}`);

  let deployable;
  try
  {
    deployable = await ethers.getContractFactory(CONTRACT_NAME);
    let deployed;
    try
    {
      deployed = await deployable.deploy(CHAINS[chain].endpoint);
      console.log(`${CONTRACT_NAME} successfully deployed in ${chain} at ${deployed.address}`);
      return deployed;
    }
    catch(error)
    {
      console.error(error);
    }
  }
  catch(error)
  {
    console.error(error);
  }

  return null;
}


const writeDeployment = (chain, deployment) => {
  if(fs.existsSync(CONFIGURATION_FOLDER))
  {
    let success = true;
    console.log(`Writing deployment to: ${CONFIGURATION_FOLDER}/${chain}.json`);
    fs.writeFileSync(`${CONFIGURATION_FOLDER}/${chain}.json`, JSON.stringify(deployment), err => {
        if (err) {
          console.error(err);
          success = false;
        }
    });

    return success;
  }
  else
  {
    console.log(`Configuration folder: ./${CONFIGURATION_FOLDER} missing!`);
    success = false;
  }

  return false;
}



async function deployProcess() {

  const envchain = hre.network.name;
  if(typeof envchain === 'undefined')
  {
    console.log("No chain has been provided in runtime!");
    return;
  }

  const deployed = await deployContract(envchain);
  if(deployed == null)
  {
    console.log("Deployment failed, see logs for reason!");
    return;
  }

  const written = writeDeployment(envchain, deployed);
  if(!written)
  {
    console.log("Could not write deployment receipt!");
    return;
  }
  

}


deployProcess().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
