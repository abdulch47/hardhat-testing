
async function main() {
const [deployer] = await ethers.getSigners();
  // Get the contract factory
  const Token = await ethers.getContractFactory("USDT");

  // Deploy the contract
  const myToken = await Token.deploy();

  console.log("token deployed to:", myToken.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
