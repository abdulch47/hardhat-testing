const { expect } = require('chai');
const { ethers } = require('hardhat');


describe('AAT Contract', () => {
  let AAT;
  let aat;
  let owner;
  let factory;
  let whitelistedAddress1;
  let spender;
  let nonWhitelistedAddress;
  let initialBalance;
  let burnAddress;
  let signers;

  // ******************Ensure the AATx Token Contract is successfully deployed and operational.***************


  beforeEach(async () => {
    const allSigners = await ethers.getSigners();
    [owner, factory, whitelistedAddress1, spender, nonWhitelistedAddress, burnAddress, ...signers] = allSigners;

    AAT = await ethers.getContractFactory('AAT');
    aat = await AAT.connect(owner).deploy(factory.address);
    initialBalance = ethers.utils.parseUnits('10000000');

    // Mint initial tokens to the owner
    await aat.connect(factory).mint(owner.address, initialBalance);
    
  });

  //***********Generate 100 new user wallets for testing.***********/
  //**********Add these wallets to the AATx whitelist and verify.**********/
  //********Distribute a random amount of AATx tokens from the Pool Wallet to the 100 user wallets.**********/
  //************Execute token transfers between 10 user wallets and another set of user wallets.**************/

  describe('1. Standard AAT Functions', () => {

    it('should whitelist and transfer tokens to 100 addresses and should transfer tokens between 10 users', async () => {
      const amountToTransfer = ethers.utils.parseUnits('10', 18);
         // Convert signers to an array
      const signersArray = Array.from(signers);
      // Whitelist and transfer tokens to each signer
      for (const signer of signersArray) {
        await aat.connect(owner).whitelisting(signer.address, true);
        await aat.connect(owner).transfer(signer.address, amountToTransfer);

        // Assert
        const balance = await aat.balanceOf(signer.address);
        expect(balance).to.equal(amountToTransfer);
      }
      // Each user transfers tokens to the next user in the list
      for (let i = 0; i < 9; i++) {
        const sender = signersArray[i];
        const receiver = signersArray[i + 1];

        const initialBalance = await aat.balanceOf(sender.address)
        const receiverBalanceInitially = await aat.balanceOf(receiver.address);
    
        // Transfer tokens from sender to receiver
        await aat.connect(sender).transfer(receiver.address, amountToTransfer);
    
        // Assert sender's balance
        const senderBalance = await aat.balanceOf(sender.address);
        expect(senderBalance).to.equal(initialBalance.sub(amountToTransfer));
    
        // Assert receiver's balance
        const receiverBalance = await aat.balanceOf(receiver.address);
        expect(receiverBalance).to.equal(receiverBalanceInitially.add(amountToTransfer));
      }
    });
    
    it('1.1 should successfully transfer tokens between two whitelisted addresses', async () => {
    console.log('Signers:', await Promise.all((await ethers.getSigners()).map(async (signer) => await signer.getAddress())));

      // Arrange
      const amountToTransfer = ethers.utils.parseUnits('10', 18);

      // Whitelist the addresses
      await aat.connect(owner).whitelisting(whitelistedAddress1.address, true);

      // Transfer the tokens to the whitelisted addresses
      await aat.connect(owner).transfer(whitelistedAddress1.address, amountToTransfer);

      // Assert
      expect(await aat.balanceOf(whitelistedAddress1.address)).to.equal(amountToTransfer);
    });

    //***************Try to transfer AATx tokens to a wallet that is not whitelisted.***************/
    //****************Ensure that the transaction to the non-whitelisted wallet is rolled back.***********/

    it('1.2 should fail to transfer tokens if either sender or recipient is not whitelisted', async () => {
      // Arrange
      const amountToTransfer = ethers.utils.parseUnits('10', 18);

      // Act & Assert
      await expect(aat.connect(owner).transfer(nonWhitelistedAddress.address, amountToTransfer)).to.be.revertedWith('Not Whitelisted');
    });

    it('1.3 should successfully increase allowance', async () => {
      // Arrange
      const addedValue = ethers.utils.parseUnits('10', 18);

      // Whitelist the addresses
      await aat.connect(owner).whitelisting(spender.address, true);

      // Act
      await aat.connect(owner).increaseAllowance(spender.address, addedValue);

      // Assert
      expect(await aat.allowance(owner.address, spender.address)).to.equal(addedValue);
    });

    it('1.4 should successfully decrease allowance', async () => {
      // Arrange
      const initialAllowance = ethers.utils.parseUnits('10', 18);
      const subtractedValue = ethers.utils.parseUnits('5', 18);

      // Whitelist the addresses and set an initial allowance
      await aat.connect(owner).whitelisting(spender.address, true);
      await aat.connect(owner).increaseAllowance(spender.address, initialAllowance);

      // Act
      await aat.connect(owner).decreaseAllowance(spender.address, subtractedValue);

      // Assert
      expect(await aat.allowance(owner.address, spender.address)).to.equal(initialAllowance.sub(subtractedValue));
    });

    it('1.5 should fail to decrease allowance below zero', async () => {
      // Arrange
      const initialAllowance = ethers.utils.parseUnits('5', 18);
      const subtractedValue = ethers.utils.parseUnits('10', 18);

      // Whitelist the addresses and set an initial allowance
      await aat.connect(owner).whitelisting(spender.address, true);
      await aat.connect(owner).increaseAllowance(spender.address, initialAllowance);

      // Act & Assert
      await expect(aat.connect(owner).decreaseAllowance(spender.address, subtractedValue)).to.be.revertedWith('ERC20: decreased allowance below zero');
    });

  });

  describe('2. AAT Specific Functions', () => {

    //****************** Link the AST1 Token Factory with the AATx Token.*****************

    it('2.1 should successfully set the factory address', async () => {
      // Arrange
      const newFactoryAddress = await ethers.getSigner();

      // Act
      await aat.connect(owner).setFactory(newFactoryAddress.address);

      // Assert
      expect(await aat.factory()).to.equal(newFactoryAddress.address);
      console.log("Updated Factory address:", newFactoryAddress.address);
    });
    it('2.2 should burn tokens from a specified address if called by the factory', async () => {
      // Arrange
      const accountToBurn = burnAddress.address;
      const amountToMint = ethers.utils.parseUnits('10', 18);
      const amountToBurn = ethers.utils.parseUnits('10', 18);
      // Mint initial tokens to the account to be burned
      await aat.connect(factory).mint(accountToBurn, amountToMint);

      await aat.connect(factory).burn(accountToBurn, amountToBurn);

      // Assert
      expect(await aat.balanceOf(accountToBurn)).to.equal(0); // Check if the balance is zero after burning
    });

    it('2.3 should fail to burn tokens if called by an address that is not the factory', async () => {
      // Arrange
      const accountToBurn = burnAddress.address;
      const amountToMint = '10';
      const amountToBurn = ethers.utils.parseUnits('10', 18);

      // Mint initial tokens to the account to be burned
      await aat.connect(factory).mint(accountToBurn, amountToMint);

      // Act & Assert
      await expect(aat.connect(owner).burn(accountToBurn, amountToBurn)).to.be.revertedWith('Ownable: caller is not the Factory');
    });

  });

});
describe('AST Contract', () => {
  let AST;
  let ast;
  let owner;
  let assetLockedWallet;
  let factory;
  let AATToken;

  before(async () => {
    // Deploy the contracts and set up test variables
    [owner, assetLockedWallet, factory, AATToken] = await ethers.getSigners();

    AST = await ethers.getContractFactory('AST');
    const totalSupply = '10000';
    const lockedPercentage = 50; // Example locked percentage, adjust according to your needs
    const aatPercentage = 50; // Example AAT percentage, adjust according to your needs
    ast = await AST.connect(owner).deploy(
      'ASTToken',
      'AST',
      totalSupply,
      assetLockedWallet.address,
      factory.address,
      AATToken.address,
      lockedPercentage, // Example locked percentage, adjust according to your needs
      aatPercentage  // Example AAT percentage, adjust according to your needs
    );
  });

  // ******************Set and verify the immutable metadata for AST1.************************

  it('should set and verify immutable metadata for AST', async () => {
    // Arrange & Act
    const name = await ast.name();
    const symbol = await ast.symbol();
    const totalSupply = await ast.totalSupply();

    // Assert
    expect(name).to.equal('ASTToken');
    expect(symbol).to.equal('AST');
    console.log("Token Name:", name);
    console.log("Token symbol:", symbol);
    console.log("Total supply:", totalSupply.toString());
  });

  it('should deploy AST with correct initial values', async () => {
    // Assert
    expect(await ast.assetWallet()).to.equal(assetLockedWallet.address);
    expect(await ast.totalSupply()).to.equal(ethers.utils.parseUnits('10000', 18));
    // Assuming 18 decimals

    //**********************Ensure 50% of AST1 tokens are transferred to the asset owner's locked wallet.******** */

    expect(await ast.balanceOf(assetLockedWallet.address)).to.equal(ethers.utils.parseUnits('5000', 18)); // Assuming 18 decimals and 50% locked

    //************Confirm 50% of AST1 tokens are transferred to the AATx contract.***************** */

    expect(await ast.balanceOf(AATToken.address)).to.equal(ethers.utils.parseUnits('5000', 18)); // Assuming 18 decimals and 50% for AAT

    expect(await ast.factory()).to.equal(factory.address);

  });

  it('should burn tokens when called by the factory', async () => {
    // Arrange
    const accountToBurn = assetLockedWallet.address;
    const amountToBurn = ethers.utils.parseUnits('5000', 18);

    // Act
    await ast.connect(factory).burn(accountToBurn, amountToBurn);

    // Assert
    expect(await ast.balanceOf(accountToBurn)).to.equal(0); // Check if the balance is zero after burning
  });

  it('should not allow burning when called by a non-factory address', async () => {
    // Arrange
    const nonFactory = await ethers.getSigner();

    // Act & Assert
    await expect(ast.connect(nonFactory).burn(assetLockedWallet.address, ethers.utils.parseUnits('10', 18))).to.be.revertedWith('You Cannot Burn');
  });
});

describe('ASTTokenFactory Contract', () => {
  let ASTTokenFactory;
  let astTokenFactory;
  let owner;
  let poolWallet;
  let assetLockedWallet;
  let AATToken;
  let aatToken;
  let ASTToken;
  let ratio;

  before(async () => {
    // Deploy the contracts and set up test variables
    [owner, poolWallet, assetLockedWallet] = await ethers.getSigners();

    ASTTokenFactory = await ethers.getContractFactory('ASTTokenFactory');
    astTokenFactory = await ASTTokenFactory.connect(owner).deploy(poolWallet.address, assetLockedWallet.address);

    AATToken = await ethers.getContractFactory('AAT'); // Assuming you have an AAT contract
    // Deploy AAT token for testing
    aatToken = await AATToken.connect(owner).deploy(astTokenFactory.address);
    //set the AAT token in ast token factory
    await astTokenFactory.connect(owner).setAATToken(aatToken.address);
    console.log("AST Token Factory:", astTokenFactory.address);
  });

  //***********Deploy the AST1 Token Factory and ensure it's functional.****************

  it('should deploy ASTTokenFactory with correct initial values', async () => {
    // Assert
    expect(await astTokenFactory.owner()).to.equal(owner.address);
    expect(await astTokenFactory.poolWallet()).to.equal(poolWallet.address);
    expect(await astTokenFactory.assetLockedWallet()).to.equal(assetLockedWallet.address);
    expect(await astTokenFactory.tokenCount()).to.equal(0);
    console.log("Factory Owner:", await astTokenFactory.owner());
    console.log("Factory Pool Wallet:", await astTokenFactory.poolWallet());
    console.log("Factory assetLockedWallet:", await astTokenFactory.assetLockedWallet());
  });

  //******************Configure the AATx Token as part of the AST1 Token Factory settings.******************

  it('should set AAT token contract in AST factory', async () => {
    // Assert
    expect(await astTokenFactory.aatToken()).to.equal(aatToken.address);
    console.log("AAT Token address:", aatToken.address);

  });

  it('should create ASTToken with the correct parameters', async () => {
    // Arrange
    const name = 'TestAST';
    const symbol = 'TAST';
    const totalSupply = '100000';
    ratio = 7533; // Example ratio, adjust according to your needs
    const lockedPercentage = 50; // Example locked percentage, adjust according to your needs
    const aatPercentage = 50; // Example AAT percentage, adjust according to your needs


    // Act
    await astTokenFactory.connect(owner).createASTToken(
      name,
      symbol,
      totalSupply,
      ratio,
      lockedPercentage,
      aatPercentage
    );

    // Assert
    expect(await astTokenFactory.tokenCount()).to.equal(1);
  });
  it('should retrieve the ratio of aat token conversion', async () => {
    
    const astTokens = await astTokenFactory.getASTs();
    ASTToken = await ethers.getContractAt('AST', astTokens[0]);
    // Act
    const conversionRatio = await astTokenFactory.aatConversion(ASTToken.address);
    // Assert
    expect(conversionRatio).to.equal(ratio);
  });

  it('should return correct AAT burn amount for a given AST token', async () => {

    // Retrieve the deployed ASTToken contract address
    const astTokens = await astTokenFactory.getASTs();
    ASTToken = await ethers.getContractAt('AST', astTokens[0]);

    // Act
    const aatBurnAmount = await astTokenFactory.aatBurnAmount(ASTToken.address);

    // Assert
    expect(aatBurnAmount).to.equal('6637461834594451081906'); // Adjust based on your expectations for the AAT burn amount
  });


//********************Confirm that the correct number of AST1 tokens are minted.***************/
//********************Check that AATx tokens are minted in correspondence with the minting of AST1 tokens.************/
//*****************Check the conversion ratio between AST1 and AATx during minting is correct.***************** */
//*****************Ensure the minted AATx tokens are transferred to the Private Placement Pool Wallet.*********** */

it('should mint AATx tokens in correspondence with the minting of AST1 tokens', async () => {
  // Get the current AAT balance of the pool wallet
  const poolWalletAATBalanceBefore = await aatToken.balanceOf(poolWallet.address);

  // Check that AATx tokens are minted in correspondence with the minting of AST1 tokens
  expect(poolWalletAATBalanceBefore).to.equal('13274000000000000000000');
});

it('should return correct AST amount and needToBurn for a given AAT amount', async () => {
  // Arrange
  const aatAmount = ethers.utils.parseUnits('1000', 18);

  // Act
  const [astAmount, needToBurn] = await astTokenFactory.astConversionAmount(ASTToken.address, aatAmount);

  // Assert
  expect(astAmount).to.equal(ethers.utils.parseUnits('7533', 18)); // Adjust based on the ratio used during deployment
  expect(needToBurn).to.equal(ethers.utils.parseUnits('50000', 18)); // Adjust based on the total supply and locked amount in the ASTToken contract
});

//************Asset owner proceeds to burn the AAT tokens.*************/
//*********** Check that the equivalent AST1 amount is transferred back to the asset owner's locked wallet.***********/

  it('should allow users to burn AAT tokens and return AST tokens to asset locked wallet', async () => {
    // Arrange
    const aatAmountToBurn = ethers.utils.parseUnits('1000', 18);

    // Act
    const initialAATBalance = await aatToken.balanceOf(poolWallet.address);

    const [, initialLockedAstBalance] = await astTokenFactory.astTokenBalance(ASTToken.address, assetLockedWallet.address);

    // Burn AAT tokens and convert to AST tokens
    await astTokenFactory.connect(poolWallet).burnAAT(aatAmountToBurn, ASTToken.address);

    // Assert
    const finalAATBalance = await aatToken.balanceOf(poolWallet.address);
    const [, finalLockedAstBalance] = await astTokenFactory.astTokenBalance(ASTToken.address, assetLockedWallet.address);

    expect(finalAATBalance).to.equal(initialAATBalance.sub(aatAmountToBurn));
    expect(finalLockedAstBalance).to.be.above(initialLockedAstBalance);

  });

   //**********Confirm that the contract owner successfully burns the AST1 tokens.************/

   it('should allow the owner to burn AST tokens when AssetOwner wallet has above 99% of AST tokens', async () => {
    // Arrange
    const aatAmountToBurn = '5637461834594451000000';

    // Act
    const initialAATBalance = await aatToken.balanceOf(poolWallet.address);

    const [, initialLockedAstBalance] = await astTokenFactory.astTokenBalance(ASTToken.address, assetLockedWallet.address);

    // Burn AAT tokens and convert to AST tokens
    await astTokenFactory.connect(poolWallet).burnAAT(aatAmountToBurn, ASTToken.address);

    // Assert
    const finalAATBalance = await aatToken.balanceOf(poolWallet.address);
    const [, finalLockedAstBalance] = await astTokenFactory.astTokenBalance(ASTToken.address, assetLockedWallet.address);

    expect(finalAATBalance).to.equal(initialAATBalance.sub(aatAmountToBurn));
    expect(finalLockedAstBalance).to.be.above(initialLockedAstBalance);


    // Act
    // Attempt to burn AST tokens when AssetOwner wallet has above 99% of AST tokens
    await astTokenFactory.connect(owner).burnAstToken(ASTToken.address);

    // Assert
    const [, lockedAstBalance] = await astTokenFactory.astTokenBalance(ASTToken.address, assetLockedWallet.address);

    expect(lockedAstBalance).to.equal(0);
  });

  it('should revert when attempting to burn AST tokens if AssetOwner wallet has below 99% of AST tokens', async () => {

    // Act and Assert
    // Attempt to burn AST tokens when AssetOwner wallet has below 99% of AST tokens
    await expect(astTokenFactory.connect(owner).burnAstToken(ASTToken.address)).to.be.revertedWith("Burning amount less than 99% of the supply");
  });

//for AST2 token
  it('should create ASTToken with the correct parameters', async () => {
    // Arrange
    const name = 'TestAST';
    const symbol = 'TAST';
    const totalSupply = '100000';
    ratio = 7533; // Example ratio, adjust according to your needs
    const lockedPercentage = 50; // Example locked percentage, adjust according to your needs
    const aatPercentage = 50; // Example AAT percentage, adjust according to your needs


    // Act
    await astTokenFactory.connect(owner).createASTToken(
      name,
      symbol,
      totalSupply,
      ratio,
      lockedPercentage,
      aatPercentage
    );

    // Assert
    expect(await astTokenFactory.tokenCount()).to.equal(2);
  });
  it('should retrieve the ratio of aat token conversion', async () => {
    
    const astTokens = await astTokenFactory.getASTs();
    ASTToken = await ethers.getContractAt('AST', astTokens[1]);
    // Act
    const conversionRatio = await astTokenFactory.aatConversion(ASTToken.address);
    // Assert
    expect(conversionRatio).to.equal(ratio);
  });

  it('should return correct AAT burn amount for a given AST token', async () => {

    // Retrieve the deployed ASTToken contract address
    const astTokens = await astTokenFactory.getASTs();
    ASTToken = await ethers.getContractAt('AST', astTokens[1]);

    // Act
    const aatBurnAmount = await astTokenFactory.aatBurnAmount(ASTToken.address);

    // Assert
    expect(aatBurnAmount).to.equal('6637461834594451081906'); // Adjust based on your expectations for the AAT burn amount
  });


//********************Confirm that the correct number of AST1 tokens are minted.***************/
//********************Check that AATx tokens are minted in correspondence with the minting of AST1 tokens.************/
//*****************Check the conversion ratio between AST1 and AATx during minting is correct.***************** */
//*****************Ensure the minted AATx tokens are transferred to the Private Placement Pool Wallet.*********** */

it('should mint AATx tokens in correspondence with the minting of AST2 tokens', async () => {
  // Get the current AAT balance of the pool wallet
  const poolWalletAATBalanceBefore = await aatToken.balanceOf(poolWallet.address);

  // Check that AATx tokens are minted in correspondence with the minting of AST1 tokens
  expect(poolWalletAATBalanceBefore).to.equal('19910538165405549000000');
});

it('should return correct AST amount and needToBurn for a given AAT amount', async () => {
  // Arrange
  const aatAmount = ethers.utils.parseUnits('1000', 18);

  // Act
  const [astAmount, needToBurn] = await astTokenFactory.astConversionAmount(ASTToken.address, aatAmount);

  // Assert
  expect(astAmount).to.equal(ethers.utils.parseUnits('7533', 18)); // Adjust based on the ratio used during deployment
  expect(needToBurn).to.equal(ethers.utils.parseUnits('50000', 18)); // Adjust based on the total supply and locked amount in the ASTToken contract
});

//************Asset owner proceeds to burn the AAT tokens.*************/
//*********** Check that the equivalent AST1 amount is transferred back to the asset owner's locked wallet.***********/

  it('should allow users to burn AAT tokens and return AST tokens to asset locked wallet', async () => {
    // Arrange
    const aatAmountToBurn = ethers.utils.parseUnits('1000', 18);

    // Act
    const initialAATBalance = await aatToken.balanceOf(poolWallet.address);

    const [, initialLockedAstBalance] = await astTokenFactory.astTokenBalance(ASTToken.address, assetLockedWallet.address);

    // Burn AAT tokens and convert to AST tokens
    await astTokenFactory.connect(poolWallet).burnAAT(aatAmountToBurn, ASTToken.address);

    // Assert
    const finalAATBalance = await aatToken.balanceOf(poolWallet.address);
    const [, finalLockedAstBalance] = await astTokenFactory.astTokenBalance(ASTToken.address, assetLockedWallet.address);

    expect(finalAATBalance).to.equal(initialAATBalance.sub(aatAmountToBurn));
    expect(finalLockedAstBalance).to.be.above(initialLockedAstBalance);

  });

   //**********Confirm that the contract owner successfully burns the AST1 tokens.************/

   it('should allow the owner to burn AST tokens when AssetOwner wallet has above 99% of AST tokens', async () => {
    // Arrange
    const aatAmountToBurn = '5637461834594451000000';

    // Act
    const initialAATBalance = await aatToken.balanceOf(poolWallet.address);

    const [, initialLockedAstBalance] = await astTokenFactory.astTokenBalance(ASTToken.address, assetLockedWallet.address);

    // Burn AAT tokens and convert to AST tokens
    await astTokenFactory.connect(poolWallet).burnAAT(aatAmountToBurn, ASTToken.address);

    // Assert
    const finalAATBalance = await aatToken.balanceOf(poolWallet.address);
    const [, finalLockedAstBalance] = await astTokenFactory.astTokenBalance(ASTToken.address, assetLockedWallet.address);

    expect(finalAATBalance).to.equal(initialAATBalance.sub(aatAmountToBurn));
    expect(finalLockedAstBalance).to.be.above(initialLockedAstBalance);


    // Act
    // Attempt to burn AST tokens when AssetOwner wallet has above 99% of AST tokens
    await astTokenFactory.connect(owner).burnAstToken(ASTToken.address);

    // Assert
    const [, lockedAstBalance] = await astTokenFactory.astTokenBalance(ASTToken.address, assetLockedWallet.address);

    expect(lockedAstBalance).to.equal(0);
  });

  it('should revert when attempting to burn AST tokens if AssetOwner wallet has below 99% of AST tokens', async () => {

    // Act and Assert
    // Attempt to burn AST tokens when AssetOwner wallet has below 99% of AST tokens
    await expect(astTokenFactory.connect(owner).burnAstToken(ASTToken.address)).to.be.revertedWith("Burning amount less than 99% of the supply");
  });

//***************Define and confirm the pool wallet in the AST1 Token Factory.***********************

it('should set the pool wallet address by the owner', async () => {
  // Arrange
  const newPoolWallet = await ethers.getSigner();

  // Act
  await astTokenFactory.connect(owner).setPoolWallet(newPoolWallet.address);

  // Assert
  const updatedPoolWallet = await astTokenFactory.poolWallet();
  expect(updatedPoolWallet).to.equal(newPoolWallet.address);
  console.log("Updated pool wallet:", updatedPoolWallet);
});

//***************Specify and verify the asset owner's locked wallet in the AST1 Token Factory. ************/

it('should set the asset locked wallet address by the owner', async () => {
  // Arrange
  const newAssetLockedWallet = await ethers.getSigner();

  // Act
  await astTokenFactory.connect(owner).setAssetLockedWallet(newAssetLockedWallet.address);

  // Assert
  const updatedAssetLockedWallet = await astTokenFactory.assetLockedWallet();
  expect(updatedAssetLockedWallet).to.equal(newAssetLockedWallet.address);
  console.log("Updated asset locked wallet:", updatedAssetLockedWallet);
});

});

