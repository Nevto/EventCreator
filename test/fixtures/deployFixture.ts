import hre, { ethers } from "hardhat";
import { EventCreator } from "../../typechain-types/contracts/EventCreator.sol";

export const deployEventCreatorFixture = async () => {
    const [deployer] = await hre.ethers.getSigners();
    const EventCreator = await ethers.getContractFactory("EventCreator");
    const eventCreator = await EventCreator.deploy();

    return { eventCreator, deployer };
};
